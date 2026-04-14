"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Download, Filter, RefreshCw, ShieldCheck, Star } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
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
  if (level === "supreme") return "致尊会员"
  if (level === "lifetime") return "终身会员"
  if (level === "sponsor") return "赞助会员"
  return "免费会员"
}

function SoftwareCard({ app }: { app: AppSummary }) {
  const useCover = Boolean(app.heroImage) && app.displayMode !== "icon"

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10">
      {/* 整卡链接覆盖层（透明） */}
      <Link
        href={`/software/${app.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`查看 ${app.name} 详情`}
      />

      {/* 卡片顶部：图标 + 基础信息 */}
      <div className="flex gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary">
          {useCover ? (
            <img src={resolveAssetUrl(app.heroImage)} alt={app.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
            <h3 className="truncate text-base font-bold text-foreground transition-colors group-hover:text-accent">{app.name}</h3>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{app.category}</span>
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{accessLabel(app.accessLevel)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{app.subtitle || app.summaryText}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{app.version}</span>
            <span>{app.pricing}</span>
            <span>{app.downloads} 次下载</span>
          </div>
        </div>
      </div>

      {/* 卡片底部 */}
      <div className="mt-5 flex flex-1 flex-col justify-end">
        {/* 标签 */}
        {app.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {app.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {/* 平台 + 评分 */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {app.platforms.slice(0, 4).map((platform) => (
            <span key={platform} className="rounded-lg border border-border px-2 py-1">
              {platform}
            </span>
          ))}
        </div>

        {/* 底部信息栏 */}
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
          {/* 用 span + router 跳转，避免嵌套 <a> */}
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.location.href = `/software/${app.slug}` }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            查看详情
          </span>
        </div>
      </div>
    </article>
  )
}

function SoftwarePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [apps, setApps] = useState<AppSummary[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])

  // 从 URL 读取初始分类，找不到则降级为"全部"
  const urlCategory = searchParams.get("category") ?? "全部"
  const allCategoryNames = ["\u5168\u90e8", ...categories.map((c) => c.name)]
  const defaultCategory = allCategoryNames.includes(urlCategory) ? urlCategory : "全部"

  const [activeCategory, setActiveCategory] = useState(defaultCategory)
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

      // 首次加载后，用 URL 参数确认分类
      if (!allCategoryNames.includes(urlCategory) && urlCategory !== "全部") {
        setActiveCategory("全部")
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "软件数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSoftware()
  }, [])

  // URL 参数变化时同步 activeCategory
  useEffect(() => {
    const param = searchParams.get("category") ?? "全部"
    if (allCategoryNames.includes(param)) {
      setActiveCategory(param)
    } else if (param === "全部") {
      setActiveCategory("全部")
    }
  }, [searchParams])

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

  const pageTitle = activeCategory === "全部" ? "全部软件" : activeCategory

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">软件库</p>
                <h1 className="mt-2 text-3xl font-black text-foreground">{pageTitle}</h1>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">按分类、下载量、更新时间和评分快速筛选你需要的软件。</p>
              </div>
              <p className="text-sm text-muted-foreground">当前共 {filteredApps.length} 个结果</p>
            </div>

            <div className="flex items-center gap-4">
              {/* 排序按钮组 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">排序：</span>
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
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-all",
                      sortKey === value
                        ? "border-accent bg-accent text-accent-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-foreground",
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* 分隔线 */}
              <div className="hidden h-8 w-px bg-border lg:block" />

              {/* 分类标签 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">分类：</span>
                {categoryTabs.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => {
                      setActiveCategory(category.name)
                      // 同步更新 URL 参数（可选，方便分享）
                      const params = new URLSearchParams(searchParams.toString())
                      if (category.name === "全部") {
                        params.delete("category")
                      } else {
                        params.set("category", category.name)
                      }
                      router.push(`/software?${params.toString()}`, { scroll: false })
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-all",
                      activeCategory === category.name
                        ? "border-accent bg-accent text-accent-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-foreground",
                    )}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
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

export default function SoftwarePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">
              软件列表加载中...
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <SoftwarePageContent />
    </Suspense>
  )
}
