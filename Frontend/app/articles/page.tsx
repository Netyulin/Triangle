"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BookOpen, Clock3, RefreshCw, Search, Sparkles } from "lucide-react"

import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { request, type PostSummary } from "@/lib/api"
import { cn, resolveAssetUrl } from "@/lib/utils"

export default function ArticlesPage() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [activeCategory, setActiveCategory] = useState("全部")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadArticles = async () => {
    setLoading(true)
    setError("")

    try {
      const [postData, categoryData] = await Promise.all([
        request<{ list: PostSummary[] }>("/api/posts?page=1&pageSize=100"),
        request<Array<{ name: string; count: number }>>("/api/posts/categories"),
      ])
      setPosts(postData.list)
      setCategories(categoryData)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "文章列表加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadArticles()
  }, [])

  const filteredPosts = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return posts.filter((post) => {
      const matchCategory = activeCategory === "全部" || post.category === activeCategory
      const haystack = [post.title, post.excerpt, post.author, post.category].join(" ").toLowerCase()
      return matchCategory && (!text || haystack.includes(text))
    })
  }, [activeCategory, keyword, posts])

  const featuredPost = filteredPosts.find((post) => post.featured) ?? filteredPosts[0]
  const listPosts = filteredPosts.filter((post) => post.slug !== featuredPost?.slug)
  const categoryTabs = [{ name: "全部", count: posts.length }, ...categories]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-border bg-card p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">内容阅读</p>
              <h1 className="mt-2 text-4xl font-black text-foreground">文章列表</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                这里汇集了站内发布的文章内容，方便你按分类筛选、按关键词查找，快速找到值得看的信息。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <StatCard label="文章总数" value={posts.length} />
              <StatCard label="当前结果" value={filteredPosts.length} />
              <StatCard label="推荐文章" value={posts.filter((post) => post.featured).length} />
              <StatCard label="分类数量" value={categories.length} />
            </div>
          </div>

          <div className="relative mt-8 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题、摘要或作者"
              className="w-full rounded-2xl border border-border bg-background px-10 py-3 text-sm outline-none transition focus:border-primary/40"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoryTabs.map((category) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  activeCategory === category.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">文章内容加载中...</div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => void loadArticles()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold text-foreground">没有找到符合条件的文章</p>
            <p className="mt-2 text-sm text-muted-foreground">换个关键词，或回到全部分类再试一次。</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {featuredPost ? (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h2 className="text-lg font-bold text-foreground">优先推荐</h2>
                </div>
                <Link
                  href={`/articles/${featuredPost.slug}`}
                  className="block rounded-3xl border border-border bg-card p-6 transition hover:border-primary/25 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-6 md:flex-row">
                    <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-3xl bg-secondary text-4xl font-black text-foreground md:w-40">
                      {featuredPost.displayMode !== "icon" && featuredPost.coverImage ? (
                        <img src={resolveAssetUrl(featuredPost.coverImage)} alt={featuredPost.title} className="h-full w-full object-cover" />
                      ) : (
                        <AppIcon
                          value={featuredPost.icon}
                          name={featuredPost.title}
                          className="flex h-full w-full items-center justify-center"
                          imageClassName="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{featuredPost.category}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {featuredPost.readingTime}
                        </span>
                        <span>{featuredPost.dateLabel}</span>
                      </div>
                      <h2 className="mt-4 text-3xl font-black text-foreground">{featuredPost.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{featuredPost.excerpt}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>{featuredPost.author}</span>
                        {featuredPost.relatedApp ? <span>关联软件：{featuredPost.relatedApp.name}</span> : null}
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            ) : null}

            <section>
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-bold text-foreground">全部文章</h2>
              </div>

              <div className="space-y-3">
                {listPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/articles/${post.slug}`}
                    className="group flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/25 hover:shadow-sm"
                  >
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-2xl font-black text-foreground">
                      {post.displayMode !== "icon" && post.coverImage ? (
                        <img src={resolveAssetUrl(post.coverImage)} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <AppIcon
                          value={post.icon}
                          name={post.title}
                          className="flex h-full w-full items-center justify-center"
                          imageClassName="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{post.category}</span>
                        <span>{post.readingTime}</span>
                        <span>{post.dateLabel}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-1 text-lg font-bold text-foreground transition group-hover:text-primary">{post.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>{post.author}</span>
                        {post.relatedApp ? <span>关联软件：{post.relatedApp.name}</span> : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
    </div>
  )
}
