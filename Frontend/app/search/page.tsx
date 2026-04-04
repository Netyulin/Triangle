"use client"

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { AppIcon } from "@/components/app-icon"
import { request, type RequestItem, type SearchPayload } from "@/lib/api"
import { cn } from "@/lib/utils"
import { BookOpen, MessageSquare, RefreshCw, Search, Tag, TrendingUp } from "lucide-react"

type TabKey = "all" | "app" | "post" | "request"

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "app", label: "软件" },
  { key: "post", label: "文章" },
  { key: "request", label: "需求" },
]

function statusLabel(status: RequestItem["status"]) {
  if (status === "done") return "已完成"
  if (status === "processing") return "处理中"
  if (status === "rejected") return "已关闭"
  return "待回复"
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""

  const [keyword, setKeyword] = useState(initialQuery)
  const [submittedKeyword, setSubmittedKeyword] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [hotKeywords, setHotKeywords] = useState<string[]>([])
  const [results, setResults] = useState<SearchPayload | null>(null)
  const [loading, setLoading] = useState(Boolean(initialQuery))
  const [error, setError] = useState("")

  const loadHotSearches = async () => {
    try {
      const items = await request<Array<{ keyword: string }>>("/api/search/hot?limit=8")
      setHotKeywords(items.map((item) => item.keyword))
    } catch {
      setHotKeywords([])
    }
  }

  const runSearch = async (q: string, type: TabKey) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults(null)
      setSubmittedKeyword("")
      setError("")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    setSubmittedKeyword(trimmed)

    try {
      const apiType = type === "all" ? "all" : type
      const data = await request<SearchPayload>(`/api/search?q=${encodeURIComponent(trimmed)}&type=${apiType}&page=1&pageSize=12`)
      setResults(data)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "搜索失败，请稍后再试。")
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHotSearches()
  }, [])

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? ""
    setKeyword(nextQuery)
    setSubmittedKeyword(nextQuery)
    if (nextQuery.trim()) {
      runSearch(nextQuery, activeTab)
    } else {
      setResults(null)
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (submittedKeyword.trim()) {
      runSearch(submittedKeyword, activeTab)
    }
  }, [activeTab])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = keyword.trim()
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search")
    runSearch(trimmed, activeTab)
  }

  const sections = useMemo(
    () => ({
      apps: results?.apps ?? [],
      posts: results?.posts ?? [],
      requests: results?.requests ?? [],
    }),
    [results],
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">站内搜索</p>
          <h1 className="mt-2 text-4xl font-black text-foreground">搜索内容</h1>
          <p className="mt-3 text-sm text-muted-foreground">支持统一搜索软件、文章和需求，找内容更直接。</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入关键词，搜索软件、文章和需求"
              className="w-full rounded-2xl border border-border bg-background px-12 py-4 text-base outline-none transition focus:border-primary/40"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              搜索
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  activeTab === tab.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </form>

        {!submittedKeyword ? (
          <section className="mt-8 rounded-3xl border border-border bg-card p-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              热门搜索
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {hotKeywords.length > 0 ? (
                hotKeywords.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setKeyword(item)
                      router.push(`/search?q=${encodeURIComponent(item)}`)
                      runSearch(item, activeTab)
                    }}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition hover:border-primary/30"
                  >
                    {item}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂时还没有热门搜索，先搜一次就会慢慢积累。</p>
              )}
            </div>
          </section>
        ) : loading ? (
          <section className="mt-8 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">
            正在搜索“{submittedKeyword}”...
          </section>
        ) : error ? (
          <section className="mt-8 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => runSearch(submittedKeyword, activeTab)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              重新搜索
            </button>
          </section>
        ) : (results?.total ?? 0) === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold text-foreground">没有找到相关结果</p>
            <p className="mt-2 text-sm text-muted-foreground">可以换个关键词，或切换搜索范围再试一次。</p>
          </section>
        ) : (
          <section className="mt-8 space-y-8">
            <p className="text-sm text-muted-foreground">
              “<span className="font-semibold text-foreground">{submittedKeyword}</span>” 共找到 {results?.total ?? 0} 条结果
            </p>

            {(activeTab === "all" || activeTab === "app") && sections.apps.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-sky-500" />
                  <h2 className="text-lg font-bold text-foreground">软件</h2>
                </div>
                <div className="space-y-3">
                  {sections.apps.map((app) => (
                    <Link
                      key={app.slug}
                      href={`/software/${app.slug}`}
                      className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/25 hover:shadow-sm"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary text-lg font-black text-foreground">
                        <AppIcon value={app.icon} name={app.name} className="flex h-full w-full items-center justify-center" imageClassName="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-foreground">{app.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{app.subtitle}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{app.category}</span>
                          <span>{app.pricing}</span>
                          <span>{app.rating.toFixed(1)} 分</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {(activeTab === "all" || activeTab === "post") && sections.posts.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-lg font-bold text-foreground">文章</h2>
                </div>
                <div className="space-y-3">
                  {sections.posts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/articles/${post.slug}`}
                      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/25 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{post.category}</span>
                        <span>{post.author}</span>
                        <span>{post.readingTime}</span>
                        <span>{post.dateLabel}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-foreground">{post.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {(activeTab === "all" || activeTab === "request") && sections.requests.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-rose-500" />
                  <h2 className="text-lg font-bold text-foreground">需求</h2>
                </div>
                <div className="space-y-3">
                  {sections.requests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{statusLabel(item.status)}</span>
                        <span>{item.authorName}</span>
                        <span>{item.createdAt}</span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      {item.adminReply ? (
                        <div className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm text-muted-foreground">站内回复：{item.adminReply}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SearchContent />
    </Suspense>
  )
}
