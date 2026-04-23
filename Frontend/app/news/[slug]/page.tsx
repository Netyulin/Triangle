"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Bookmark, Clock3, RefreshCw } from "lucide-react"

import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { useAppContext } from "@/components/app-provider"
import { request, type FavoritesPayload, type PostSummary } from "@/lib/api"
import { buildAuthUrl, resolveAssetUrl } from "@/lib/utils"

function normalizeArticleHtml(value: string) {
  const source = String(value || "").trim()
  if (!source) return ""

  const looksLikeDocument = /<!doctype|<\s*html[\s>]|<\s*head[\s>]|<\s*body[\s>]/i.test(source)
  if (!looksLikeDocument) return source

  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : source

  return bodyHtml
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim()
}

export default function NewsDetailPage() {
  const params = useParams<{ slug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const { token, user } = useAppContext()

  const [post, setPost] = useState<PostSummary | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug

  const loadDetail = useCallback(async () => {
    if (!slug) return

    setLoading(true)
    setError("")

    try {
      let postData: PostSummary
      try {
        postData = await request<PostSummary>(`/api/posts/${slug}`, token ? { token } : {})
      } catch (detailError) {
        const shouldRetryAsGuest =
          Boolean(token) &&
          detailError instanceof Error &&
          ["invalid token", "token expired", "login required"].includes(detailError.message.toLowerCase())

        if (!shouldRetryAsGuest) {
          throw detailError
        }

        postData = await request<PostSummary>(`/api/posts/${slug}`)
      }

      setPost(postData)

      if (token && user) {
        try {
          const favorites = await request<FavoritesPayload>("/api/auth/favorites", { token })
          setFavorited(favorites.posts.some((item) => item.slug === slug))
        } catch {
          setFavorited(false)
        }
      } else {
        setFavorited(false)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "文章详情加载失败")
    } finally {
      setLoading(false)
    }
  }, [slug, token, user])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleFavorite = async () => {
    if (!slug) return
    if (!token) {
      router.push(buildAuthUrl("/login", pathname || "/"))
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
      setError(nextError instanceof Error ? nextError.message : "操作失败，请稍后重试")
    } finally {
      setFavoriteLoading(false)
    }
  }

  const normalizedContent = normalizeArticleHtml(post?.content || "")
  const fallbackContent = (post?.excerpt || post?.seoDescription || "").trim() || "这篇文章正文暂未同步，请稍后刷新或联系站点管理员处理。"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {loading ? (
          <section className="mt-6 rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">文章详情加载中...</section>
        ) : error || !post ? (
          <section className="mt-6 rounded-[28px] border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error || "未找到该文章，可能已被删除或链接有误。"}</p>
            <button onClick={() => void loadDetail()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </section>
        ) : (
          <article className="mt-6 space-y-6">
            {post.coverImage ? (
              <div className="overflow-hidden rounded-[30px] border border-border bg-card">
                <Image
                  src={resolveAssetUrl(post.coverImage)}
                  alt={post.title}
                  width={1440}
                  height={720}
                  unoptimized
                  className="h-[280px] w-full object-cover md:h-[360px]"
                />
              </div>
            ) : null}

            <section className="rounded-[30px] border border-border bg-card p-6 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.24)] md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-border bg-secondary">
                  <AppIcon
                    value={post.icon}
                    name={post.title}
                    className="flex h-full w-full items-center justify-center text-xl font-black text-foreground"
                    imageClassName="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-foreground">{post.category}</span>
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

            <section className="rounded-[30px] border border-border bg-card p-6 md:p-8">
              <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground">
                {normalizedContent ? (
                  <div dangerouslySetInnerHTML={{ __html: normalizedContent }} />
                ) : (
                  <div className="space-y-4 text-muted-foreground">
                    <p>{fallbackContent}</p>
                    <p className="text-xs opacity-80">提示：若你刚通过脚本发布文章，请检查是否把完整正文写入了文章 content 字段。</p>
                  </div>
                )}
              </div>
            </section>
          </article>
        )}
      </main>

      <Footer />
    </div>
  )
}
