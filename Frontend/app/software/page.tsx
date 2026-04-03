"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { AppIcon } from "@/components/app-icon"
import { request, type AppSummary } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Download, Filter, RefreshCw, Search, ShieldCheck, Star } from "lucide-react"

type SortKey = "featured" | "downloads" | "updated" | "rating"

function parseDownloadValue(value: string) {
  const text = value.trim().toUpperCase()
  const numeric = Number.parseFloat(text)
  if (Number.isNaN(numeric)) return 0
  if (text.endsWith("M")) return numeric * 1_000_000
  if (text.endsWith("K")) return numeric * 1_000
  return numeric
}

function sortApps(list: AppSummary[], sortKey: SortKey) {
  return [...list].sort((a, b) => {
    if (sortKey === "downloads") return parseDownloadValue(b.downloads) - parseDownloadValue(a.downloads)
    if (sortKey === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    if (sortKey === "rating") return b.rating - a.rating
    if (Number(b.featured) !== Number(a.featured)) return Number(b.featured) - Number(a.featured)
    return b.editorialScore - a.editorialScore
  })
}

function accessLabel(level: string) {
  if (level === "premium") return "高级"
  if (level === "member") return "会员"
  return "免费"
}

function SoftwareCard({ app }: { app: AppSummary }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-primary/25 hover:shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary text-sm font-black text-foreground">
          <AppIcon value={app.icon} name={app.name} className="flex h-full w-full items-center justify-center" imageClassName="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground">{app.name}</h3>
            <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">{app.category}</span>
            <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">{accessLabel(app.accessLevel)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{app.subtitle || app.summaryText}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{app.version}</span>
            <span>{app.pricing}</span>
            <span>{app.downloads} 下载</span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{app.summaryText}</p>

      {app.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {app.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {app.platforms.slice(0, 4).map((platform) => (
          <span key={platform} className="rounded-lg border border-border px-2 py-1">
            {platform}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" />
            {app.rating.toFixed(1)}
          </span>
          <span>{app.updatedAt}</span>
          {app.verified ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              已校验
            </span>
          ) : null}
        </div>
        <Link href={`/software/${app.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Download className="h-3.5 w-3.5" />
          查看详情
        </Link>
      </div>
    </article>
  )
}

export default function SoftwarePage() {
  const [apps, setApps] = useState<AppSummary[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [activeCategory, setActiveCategory] = useState("全部")
  const [sortKey, setSortKey] = useState<SortKey>("featured")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadSoftware = async () => {
    setLoading(true)
    setError("")

    try {
      const [appData, categoryData] = await Promise.all([
        request<{ list: AppSummary[] }>("/api/apps?page=1&pageSize=100&sort=createdAt&order=desc"),
        request<Array<{ name: string; count: number }>>("/api/apps/categories"),
      ])
      setApps(appData.list)
      setCategories(categoryData)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "软件数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSoftware()
  }, [])

  const filteredApps = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    const visible = apps.filter((app) => {
      const matchCategory = activeCategory === "全部" || app.category === activeCategory
      const haystack = [app.name, app.subtitle, app.summaryText, app.category, ...app.tags].join(" ").toLowerCase()
      return matchCategory && (!text || haystack.includes(text))
    })
    return sortApps(visible, sortKey)
  }, [activeCategory, apps, keyword, sortKey])

  const featuredApps = filteredApps.filter((app) => app.featured).slice(0, 3)
  const regularApps = filteredApps.filter((app) => !featuredApps.some((item) => item.slug === app.slug))
  const categoryTabs = [{ name: "全部", count: apps.length }, ...categories]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-border bg-card p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Software Library</p>
              <h1 className="mt-2 text-4xl font-black text-foreground">软件库</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                这里展示后端已发布的软件条目，支持按分类筛选，也支持按下载量、更新时间和评分排序。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div className="rounded-2xl bg-secondary/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">软件总数</p>
                <p className="mt-1 text-2xl font-black text-foreground">{apps.length}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">当前结果</p>
                <p className="mt-1 text-2xl font-black text-foreground">{filteredApps.length}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">推荐条目</p>
                <p className="mt-1 text-2xl font-black text-foreground">{apps.filter((app) => app.featured).length}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">分类数量</p>
                <p className="mt-1 text-2xl font-black text-foreground">{categories.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索软件名、简介或标签"
                className="w-full rounded-2xl border border-border bg-background px-10 py-3 text-sm outline-none transition focus:border-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["featured", "推荐优先"],
                ["downloads", "按下载量"],
                ["updated", "最近更新"],
                ["rating", "按评分"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSortKey(value as SortKey)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition",
                    sortKey === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Filter className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
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
          <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">软件列表加载中...</div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadSoftware}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-base font-semibold text-foreground">当前没有符合条件的软件</p>
            <p className="mt-2 text-sm text-muted-foreground">可以试试换个关键词或分类。</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {featuredApps.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground">优先推荐</h2>
                  <p className="text-sm text-muted-foreground">当前按照 {sortKey === "featured" ? "推荐优先" : "你选择的排序"} 展示</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {featuredApps.map((app) => (
                    <SoftwareCard key={app.slug} app={app} />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="mb-4 text-xl font-black text-foreground">全部结果</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {regularApps.map((app) => (
                  <SoftwareCard key={app.slug} app={app} />
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
