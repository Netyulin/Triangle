"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Bookmark, Clock3, RefreshCw } from "lucide-react"

import { AppIcon } from "@/components/app-icon"
import { useAppContext } from "@/components/app-provider"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { request, type FavoritesPayload, type PostSummary } from "@/lib/api"
import { resolveAssetUrl } from "@/lib/utils"

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { token } = useAppContext()

  const [post, setPost] = useState<PostSummary | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug

  const loadDetail = async () => {
    if (!slug) return

    setLoading(true)
    setError("")

    try {
      const postData = await request<PostSummary>(`/api/posts/${slug}`, token ? { token } : {})
      setPost(postData)

      if (token) {
        const favorites = await request<FavoritesPayload>("/api/auth/favorites", { token })
        setFavorited(favorites.posts.some((item) => item.slug === slug))
      } else {
        setFavorited(false)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "文章详情加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [slug, token])

  const handleFavorite = async () => {
    if (!slug) return
    if (!token) {
      router.push("/login")
      return
    }

    setFavoriteLoading(true)
    try {
      const result = await request<{ favorited: boolean }>("/api/auth/favorites", {
        method: "POST",
        token,
        body: JSON.stringify({
          contentType: "post",
          contentId: slug,
        }),
      })
      setFavorited(result.favorited)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "收藏失败")
    } finally {
      setFavoriteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>

        {loading ? (
          <section className="mt-6 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">文章详情加载中...</section>
        ) : error || !post ? (
          <section className="mt-6 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error || "没有找到这篇文章。"}</p>
            <button
              onClick={() => void loadDetail()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </section>
        ) : (
          <article className="mt-6 space-y-6">
            {post.displayMode !== "icon" && post.coverImage ? (
              <div className="overflow-hidden rounded-3xl border border-border">
                <img src={resolveAssetUrl(post.coverImage)} alt={post.title} className="h-[320px] w-full object-cover" />
              </div>
            ) : null}

            <section className="rounded-3xl border border-border bg-card p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-secondary text-xl font-black text-foreground">
                  <AppIcon
                    value={post.icon}
                    name={post.title}
                    className="flex h-full w-full items-center justify-center"
                    imageClassName="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{post.category}</span>
                    <span>{post.author}</span>
                    <span>{post.dateLabel}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {post.readingTime}
                    </span>
                  </div>

                  <h1 className="mt-4 text-4xl font-black leading-tight text-foreground">{post.title}</h1>
                  <p className="mt-4 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={handleFavorite}
                      disabled={favoriteLoading}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
                        favorited ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
                      }`}
                    >
                      <Bookmark className="h-4 w-4" />
                      {favorited ? "已收藏" : "收藏文章"}
                    </button>

                    {post.relatedApp ? (
                      <Link
                        href={`/software/${post.relatedApp.slug}`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground"
                      >
                        查看关联软件
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-8">
              <div
                className="prose prose-neutral max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: post.content || `<p>${post.excerpt}</p>` }}
              />
            </section>
          </article>
        )}
      </main>

      <Footer />
    </div>
  )
}
