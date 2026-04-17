"use client"

import Image from "next/image"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Clock3, RefreshCw } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { request, type PostSummary } from "@/lib/api"
import { cn, resolveAssetUrl } from "@/lib/utils"

function ArticleCard({ post }: { post: PostSummary }) {
  const useCover = Boolean(post.coverImage) && post.displayMode !== "icon"

  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex gap-4 rounded-[28px] border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_24px_60px_-44px_rgba(16,185,129,0.35)]"
    >
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-3xl border border-border bg-secondary">
        {useCover ? (
          <Image
            src={resolveAssetUrl(post.coverImage)}
            alt={post.title}
            width={96}
            height={96}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <AppIcon
            value={post.icon}
            name={post.title}
            className="flex h-full w-full items-center justify-center text-sm font-black text-foreground"
            imageClassName="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{post.category}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {post.readingTime}
          </span>
          <span>{post.dateLabel}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-foreground transition group-hover:text-emerald-600">{post.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>{post.author}</span>
          {post.relatedApp ? <span>关联软件：{post.relatedApp.name}</span> : null}
        </div>
      </div>
    </Link>
  )
}

function ArticlesPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const urlCategory = searchParams.get("category") ?? "全部"
  const allCategoryNames = useMemo(() => ["全部", ...categories.map((item) => item.name)], [categories])
  const [activeCategory, setActiveCategory] = useState("全部")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const [postData, categoryData] = await Promise.all([
        request<{ list: PostSummary[] }>("/api/posts?page=1&pageSize=100&sort=publishedAt&order=desc"),
        request<Array<{ name: string; count: number }>>("/api/posts/categories"),
      ])
      setPosts(postData.list)
      setCategories(categoryData)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "文章列表加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadArticles()
  }, [loadArticles])

  useEffect(() => {
    if (allCategoryNames.includes(urlCategory)) {
      setActiveCategory(urlCategory)
      return
    }
    setActiveCategory("全部")
  }, [allCategoryNames, urlCategory])

  const filteredPosts = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return posts.filter((post) => {
      const matchCategory = activeCategory === "全部" || post.category === activeCategory
      const haystack = [post.title, post.excerpt, post.author, post.category].join(" ").toLowerCase()
      return matchCategory && (!text || haystack.includes(text))
    })
  }, [activeCategory, keyword, posts])

  const categoryTabs = [{ name: "全部", count: posts.length }, ...categories]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">文章页</p>
                <h1 className="mt-2 text-3xl font-black text-foreground">全部文章</h1>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">浏览站内文章内容，按分类或关键词快速筛选。</p>
              </div>
              <p className="text-sm text-muted-foreground">当前共 {filteredPosts.length} 篇文章</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryTabs.map((category) => (
                <button
                  key={category.name}
                  onClick={() => {
                    setActiveCategory(category.name)
                    const params = new URLSearchParams(searchParams.toString())
                    if (category.name === "全部") {
                      params.delete("category")
                    } else {
                      params.set("category", category.name)
                    }
                    const nextQuery = params.toString()
                    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    activeCategory === category.name
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {category.name} ({category.count})
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">文章列表加载中...</div>
        ) : error ? (
          <div className="mt-8 rounded-[28px] border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={loadArticles} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-border bg-card p-10 text-center">
            <p className="text-base font-semibold text-foreground">没有找到符合条件的文章</p>
            <p className="mt-2 text-sm text-muted-foreground">可以换个关键词，或者切回全部分类再试一次。</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4">
            {filteredPosts.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function ArticlesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">文章列表加载中...</div>
          </main>
          <Footer />
        </div>
      }
    >
      <ArticlesPageContent />
    </Suspense>
  )
}
