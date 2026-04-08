"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Download, Filter, RefreshCw, Search, ShieldCheck, Star } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { request, type AppSummary } from "@/lib/api"
import { cn, resolveAssetUrl } from "@/lib/utils"

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
  if (level === "supreme") return "至尊会员"
  if (level === "lifetime") return "终身会员"
  if (level === "sponsor") return "赞助会员"
  return "免费会员"
}

function SoftwareCard({ app }: { app: AppSummary }) {
  const useCover = Boolean(app.heroImage) && app.displayMode !== "icon"

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_24px_60px_-44px_rgba(14,165,233,0.45)]">
      <div className="flex gap-4 p-4">
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-3xl border border-border bg-secondary">
          {useCover ? (
            <img src={resolveAssetUrl(app.heroImage)} alt={app.name} className="h-full w-full object-cover" />
          ) : (
            <AppIcon
              value={app.icon}
              name={app.name}
              className="flex h-full w-full items-center justify-center text-sm font-black text-foreground"
              imageClassName="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground">{app.name}</h3>
            <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">{app.category}</span>
            <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">{accessLabel(app.accessLevel)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{app.subtitle || app.summaryText}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{app.version}</span>
            <span>{app.pricing}</span>
            <span>{app.downloads} 次下载</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{app.summaryText}</p>

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
                已认证
              </span>
            ) : null}
          </div>
          <Link href={`/software/${app.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Download className="h-3.5 w-3.5" />
            查看详情
          </Link>
        </div>
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
    void loadSoftware()
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

  const categoryTabs = [{ name: "全部", count: apps.length }, ...categories]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">软件库</p>
                <h1 className="mt-2 text-3xl font-black text-foreground">全部软件</h1>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">按分类、下载量、更新时间和评分快速筛选你需要的软件。</p>
              </div>
              <p className="text-sm text-muted-foreground">当前共 {filteredApps.length} 个结果</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索软件名称、简介、分类或标签"
                  className="w-full rounded-2xl border border-border bg-background px-10 py-3 text-sm outline-none transition focus:border-primary/40"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["featured", "推荐优先"],
                  ["downloads", "下载量"],
                  ["updated", "更新时间"],
                  ["rating", "评分"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSortKey(value as SortKey)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition",
                      sortKey === value
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Filter className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryTabs.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    activeCategory === category.name
                      ? "border-sky-600 bg-sky-600 text-white"
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
          <div className="mt-8 rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">软件列表加载中...</div>
        ) : error ? (
          <div className="mt-8 rounded-[28px] border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={loadSoftware} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-border bg-card p-10 text-center">
            <p className="text-base font-semibold text-foreground">当前没有符合条件的软件</p>
            <p className="mt-2 text-sm text-muted-foreground">可以换个关键词，或重新选择分类与排序方式。</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredApps.map((app) => (
              <SoftwareCard key={app.slug} app={app} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
