"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, ShieldCheck, Star } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppContext } from "@/components/app-provider"
import { ADSENSE_SLOT_IDS, DEFAULT_ADSENSE_SLOT_TOGGLES, fetchAdSenseSlotToggles, request, type AppAccessPayload, type AppSummary, type FavoritesPayload } from "@/lib/api"
import { resolveAssetUrl } from "@/lib/utils"
import { AdSenseSlot } from "@/components/ads/AdSenseSlot"

function accessMessage(reason: string) {
  if (reason === "login required") return "登录后才能查看下载链接。"
  if (reason === "membership not enough") return "当前账号权限不足，暂时还不能下载。"
  if (reason === "daily quota exhausted") return "今天的下载次数已经用完。"
  if (reason === "download disabled") return "这个软件暂时关闭了下载。"
  return "可以正常下载。"
}

function accessLabel(level: string) {
  if (level === "premium") return "高级"
  if (level === "member") return "会员"
  return "免费"
}

const reportReasonOptions = ["链接已失效", "提取信息有误", "压缩密码不对"] as const

import DownloadCountdown from "@/components/download/DownloadCountdown"

export default function SoftwareDetailPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { token, permissions } = useAppContext()

  const [app, setApp] = useState<AppSummary | null>(null)
  const [access, setAccess] = useState<AppAccessPayload | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [reportNetdisk, setReportNetdisk] = useState("")
  const [reportReason, setReportReason] = useState<string>(reportReasonOptions[0])
  const [reporting, setReporting] = useState(false)
  const [reportMessage, setReportMessage] = useState("")
  const [reportError, setReportError] = useState("")
  const [adSwitches, setAdSwitches] = useState(DEFAULT_ADSENSE_SLOT_TOGGLES)

  const slug = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "")
  const downloadPermission = access?.downloadPermission ?? { allowed: false, reason: "", requiresLogin: true }
  const downloadLinks = access?.downloadLinks ?? []
  const shouldShowIntermediary = (permissions?.membershipLevel ?? "free") === "free"
  const primaryDownload = downloadLinks[0]?.url || access?.downloadUrl || app?.downloadUrl || ""
  const countdownRedirectUrl = shouldShowIntermediary
    ? `/download/${encodeURIComponent(slug)}?target=${encodeURIComponent(primaryDownload)}&name=${encodeURIComponent(app?.name || slug)}`
    : primaryDownload

  const loadDetail = async () => {
    if (!slug) return

    setLoading(true)
    setError("")

    try {
      const [appData, accessData] = await Promise.all([
        request<AppSummary>(`/api/apps/${slug}`, token ? { token } : {}),
        request<AppAccessPayload>(`/api/apps/${slug}/access`, token ? { token } : {}),
      ])

      setApp(appData)
      setAccess(accessData)

      if (token) {
        const favorites = await request<FavoritesPayload>("/api/auth/favorites", { token })
        setFavorited(favorites.apps.some((item) => item.slug === slug))
      } else {
        setFavorited(false)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "软件详情加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [slug, token])

  useEffect(() => {
    if (!downloadOpen) return
    const firstLink = downloadLinks[0]
    setReportNetdisk((current) => current || firstLink?.name || "百度网盘")
  }, [downloadLinks, downloadOpen])

  useEffect(() => {
    let active = true
    const loadAdSwitches = async () => {
      const toggles = await fetchAdSenseSlotToggles()
      if (!active) return
      setAdSwitches(toggles)
    }
    void loadAdSwitches()
    return () => {
      active = false
    }
  }, [])

  const relatedPosts = useMemo(() => {
    if (!app) return []
    return Array.isArray((app as AppSummary & { posts?: Array<{ slug: string; title: string; excerpt: string }> }).posts)
      ? ((app as AppSummary & { posts?: Array<{ slug: string; title: string; excerpt: string }> }).posts ?? [])
      : []
  }, [app])

  const [reportDetail, setReportDetail] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [favoriteOpen, setFavoriteOpen] = useState(false)
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0)

  useEffect(() => {
    setCurrentScreenshotIndex(0)
  }, [app])

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
          contentType: "app",
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

  const openDownloadFlow = () => {
    if (!primaryDownload) return
    setDownloadOpen(true)
    setReportExpanded(false)
    setReportNetdisk(downloadLinks[0]?.name ?? "")
    setReportReason(reportReasonOptions[0])
    setReportMessage("")
    setReportError("")
  }

  const handleDownloadLink = (url: string) => {
    if (!url) return

    if (shouldShowIntermediary) {
      router.push(`/download/${encodeURIComponent(slug)}?target=${encodeURIComponent(url)}&name=${encodeURIComponent(app?.name || slug)}`)
      return
    }

    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleReportSubmit = async () => {
    if (!slug || !access) return
    const reason = reportReason.trim()
    if (!reason) {
      setReportError("请先选择失效原因。")
      return
    }

    setReporting(true)
    setReportError("")

    try {
      const matchedLink = downloadLinks.find((item) => item.name === reportNetdisk)
      await request(`/api/apps/${slug}/netdisk-reports`, {
        method: "POST",
        body: JSON.stringify({
          netdiskName: reportNetdisk,
          downloadUrl: matchedLink?.url || "",
          reason,
          detail: reportDetail.trim(),
        }),
      })
      setReportMessage("已经收到，我们会尽快核查。")
      setReportReason(reportReasonOptions[0])
      setReportDetail("")
    } catch (nextError) {
      setReportError(nextError instanceof Error ? nextError.message : "反馈提交失败")
    } finally {
      setReporting(false)
    }
  }

return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* 顶部操作栏 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFavorite}
              disabled={favoriteLoading}
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                favorited
                  ? "border-slate-900/10 bg-slate-900 text-slate-50 dark:border-sky-400/20 dark:bg-slate-100 dark:text-slate-950"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              {favorited ? "已收藏" : "收藏"}
            </button>

            <button
              onClick={openDownloadFlow}
              className="inline-flex min-w-[148px] items-center gap-2 rounded-xl border border-slate-900/90 bg-slate-950 px-6 py-3.5 text-sm font-bold text-slate-50 shadow-lg transition-all hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-xl hover:shadow-slate-900/20 active:translate-y-0 dark:border-slate-100/90 dark:bg-slate-100 dark:text-slate-950"
            >
              <Download className="h-5 w-5" />
              立即下载
            </button>
          </div>

          <button
            onClick={() => setReportOpen(true)}
            className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            报告问题
          </button>
        </div>

        {/* 主内容 */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-muted animate-pulse" />
            <div className="h-96 rounded-2xl bg-muted animate-pulse" />
          </div>
        ) : error || !app ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg text-muted-foreground">{error || "软件未找到"}</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* 左侧 */}
            <article className="lg:col-span-2 space-y-6">
              {/* Hero */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-5">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-sm">
                    {app.icon ? (
                      <Image src={app.icon} alt={app.name} fill className="object-contain" sizes="80px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">{app.name[0]}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold">{app.name}</h1>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        app.accessLevel === "supreme"
                          ? "bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300"
                          : app.accessLevel === "lifetime"
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                          : app.accessLevel === "sponsor"
                          ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {app.accessLevel === "supreme" ? "至尊会员" : app.accessLevel === "lifetime" ? "终身会员" : app.accessLevel === "sponsor" ? "赞助会员" : "免费"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{app.shortDescription}</p>

                    {app.averageRating > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(app.averageRating) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {app.averageRating.toFixed(1)} · {app.reviewCount ?? 0} 条评价
                        </span>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {app.version && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> v{app.version}</span>}
                      {app.size && <span>{app.size}</span>}
                      {app.category?.name && <span>{app.category.name}</span>}
                    </div>
                  </div>
                </div>
              </section>

              {/* 截图 */}
              {app.screenshots && app.screenshots.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold">截图预览</h2>
                  <div className="relative overflow-hidden rounded-2xl border border-border">
                    {currentScreenshotIndex > 0 && (
                      <button
                        onClick={() => setCurrentScreenshotIndex((i) => i - 1)}
                        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm transition hover:bg-background"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                      <Image src={app.screenshots[currentScreenshotIndex]} alt={`截图 ${currentScreenshotIndex + 1}`} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 680px" />
                    </div>
                    {currentScreenshotIndex < app.screenshots.length - 1 && (
                      <button
                        onClick={() => setCurrentScreenshotIndex((i) => i + 1)}
                        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm transition hover:bg-background"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {app.screenshots.length > 1 && (
                    <div className="flex justify-center gap-1.5">
                      {app.screenshots.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentScreenshotIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === currentScreenshotIndex ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 详细介绍 */}
              {app.description && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">详细介绍</h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {app.description}
                  </div>
                </section>
              )}

              {/* 特性 */}
              {app.features && app.features.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">主要特性</h2>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {app.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 系统要求 */}
              {app.systemRequirements && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">系统要求</h2>
                  <div className="space-y-2">
                    {Object.entries(app.systemRequirements).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <span className="w-24 shrink-0 font-medium text-muted-foreground">{key}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 更新日志 */}
              {app.changelog && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">更新日志</h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {app.changelog}
                  </div>
                </section>
              )}

              {/* AdSense #2 */}
              {ADSENSE_SLOT_IDS.triangle_detail_bottom && adSwitches.triangle_detail_bottom ? (
                <AdSenseSlot slotId={ADSENSE_SLOT_IDS.triangle_detail_bottom} width="auto" height={90} format="horizontal" />
              ) : null}
            </article>

            {/* 右侧 */}
            <aside className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-base font-bold">立即获取</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {app.accessLevel === "free" ? "免费使用，无需注册"
                    : app.accessLevel === "sponsor" ? "赞助会员专属"
                    : app.accessLevel === "lifetime" ? "终身会员专属"
                    : "至尊会员专属"}
                </p>
                <button
                  onClick={openDownloadFlow}
                  className="mt-4 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  立即下载
                </button>
                {app.version && <p className="mt-2.5 text-center text-xs text-muted-foreground">版本 {app.version}</p>}
              </div>

              {app.vendor && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-bold">开发商</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold">
                      {app.vendor[0]}
                    </div>
                    <span className="text-sm font-medium">{app.vendor}</span>
                  </div>
                </div>
              )}

              {app.category?.name && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-bold">分类</h3>
                  <div className="mt-3">
                    <Link href={`/software?category=${encodeURIComponent(app.category.name)}`}>
                      <span className="inline-block cursor-pointer rounded-xl bg-secondary px-3 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                        {app.category.name}
                      </span>
                    </Link>
                  </div>
                </div>
              )}

              {app.tags && app.tags.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-bold">标签</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {app.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>

      {/* 下载弹窗 */}
      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">下载 {app?.name}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{app?.shortDescription}</DialogDescription>
          </DialogHeader>
          {primaryDownload ? (
            <div className="space-y-4">
              <DownloadCountdown
                seconds={5}
                redirectUrl={countdownRedirectUrl}
                softwareName={app?.name ?? slug}
              />
              {app.changelog && (
                <details className="rounded-xl border border-border p-3 text-xs">
                  <summary className="cursor-pointer font-medium">查看更新日志</summary>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{app.changelog}</p>
                </details>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">暂无下载链接</div>
          )}
        </DialogContent>
      </Dialog>

      {/* 收藏反馈弹窗 */}
      <Dialog open={favoriteOpen} onOpenChange={setFavoriteOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{favorited ? "已加入收藏" : "已取消收藏"}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            {favorited ? "你可以在个人中心查看所有收藏的软件。" : "已从收藏列表中移除。"}
          </div>
          <DialogFooter>
            <Button onClick={() => setFavoriteOpen(false)} className="rounded-xl">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报告问题弹窗 */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">报告问题</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">帮助我们改进软件信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">问题类型</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {reportReasonOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">详细描述</label>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="请描述你遇到的问题..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            {reportMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {reportMessage}
              </div>
            )}
            {reportError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {reportError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleReportSubmit} disabled={reporting} className="rounded-xl gap-2">
              {reporting && <Loader2 className="h-4 w-4 animate-spin" />}
              {reporting ? "提交中..." : "提交报告"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
