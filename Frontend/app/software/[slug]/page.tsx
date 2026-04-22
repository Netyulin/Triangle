"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AlertTriangle, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, ShieldCheck, Star } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import DownloadCountdown from "@/components/download/DownloadCountdown"
import { useAppContext } from "@/components/app-provider"
import { ADSENSE_SLOT_IDS, DEFAULT_ADSENSE_SLOT_TOGGLES, fetchAdSenseSlotToggles, request, type AppAccessPayload, type AppSummary, type FavoritesPayload } from "@/lib/api"
import { buildAuthUrl, resolveAssetUrl } from "@/lib/utils"
import { AdSenseSlot } from "@/components/ads/AdSenseSlot"

function accessMessage(reason: string) {
  if (reason === "login required") return "登录后才能查看下载链接。"
  if (reason === "membership not enough") return "当前账号权限不足，暂时还不能下载。"
  if (reason === "daily quota exhausted") return "今天的下载次数已经用完。"
  if (reason === "download disabled") return "这个软件暂时关闭了下载。"
  return "可以正常下载。"
}

const reportReasonOptions = ["链接已失效", "提取信息有误", "压缩密码不对"] as const
const resourceNoticeItems = [
  "本站所有资源仅供学习与交流使用，严禁用于商业运营及任何盈利用途。",
  "严禁利用本站资源从事违法、侵权及其他违反法律法规的活动，否则一切后果由使用者自行承担。",
  "本站所有文字内容与资源均仅限教育、研究及非商业用途使用。",
  "本站资源均来源于网络搜集，如有侵犯您的合法权益，请通过邮件联系，我们将及时处理。",
  "因用户下载、使用资源对资源方造成的任何损失或损害，本站不承担任何责任。",
  "用户下载、使用所引发的一切风险及法律责任，均由用户自行承担。",
  "请在下载后 24 小时内删除相关资源，浏览及下载即视为您已阅读并同意本声明。",
] as const

function getMembershipRank(level?: string) {
  const normalized = String(level || "").trim().toLowerCase()
  if (normalized === "supreme" || normalized === "vip") return 3
  if (normalized === "lifetime" || normalized === "premium") return 2
  if (normalized === "sponsor" || normalized === "member") return 1
  return 0
}

type AppDetailCompat = AppSummary & {
  shortDescription?: string
  averageRating?: number
  reviewCount?: number
  category?: string | { name?: string | null } | null
  screenshots?: string[]
  description?: string
  features?: string[]
  systemRequirements?: Record<string, string | number | boolean>
  changelog?: string
  vendor?: string
}

export default function SoftwareDetailPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { token } = useAppContext()

  const [app, setApp] = useState<AppSummary | null>(null)
  const [access, setAccess] = useState<AppAccessPayload | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [countdownReady, setCountdownReady] = useState(false)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [reportNetdisk, setReportNetdisk] = useState("")
  const [reportReason, setReportReason] = useState<string>(reportReasonOptions[0])
  const [reporting, setReporting] = useState(false)
  const [reportMessage, setReportMessage] = useState("")
  const [reportError, setReportError] = useState("")
  const [adSwitches, setAdSwitches] = useState(DEFAULT_ADSENSE_SLOT_TOGGLES)

  const slug = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "")
  const downloadPermission = access?.downloadPermission ?? { allowed: false, reason: "", requiresLogin: true }
  const downloadLinks = useMemo(() => access?.downloadLinks ?? [], [access?.downloadLinks])
  const skipDownloadCountdown = getMembershipRank(access?.userPermissions?.membershipLevel) >= 1
  const primaryDownload = downloadLinks[0]?.url || access?.downloadUrl || app?.downloadUrl || ""
  const resolvedDownloadLinks = downloadPermission.allowed
    ? downloadLinks.length > 0
      ? downloadLinks
      : primaryDownload
        ? [{ name: "默认下载地址", url: primaryDownload }]
        : []
    : []

  const loadDetail = useCallback(async () => {
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
  }, [slug, token])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

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

  const detailApp = app as AppDetailCompat | null
  const subtitleText = detailApp?.shortDescription || detailApp?.subtitle || detailApp?.summaryText || ""
  const ratingValue = Number(detailApp?.averageRating ?? detailApp?.rating ?? 0)
  const reviewCount = Number(detailApp?.reviewCount ?? 0)
  const rawCategory = detailApp?.category
  const categoryName = typeof rawCategory === "string"
    ? rawCategory
    : rawCategory && typeof rawCategory === "object" && "name" in rawCategory
      ? (rawCategory.name || "")
      : ""
  const screenshotList = Array.isArray(detailApp?.screenshots)
    ? detailApp.screenshots
    : Array.isArray(detailApp?.gallery)
      ? detailApp.gallery
      : []
  const descriptionText = detailApp?.description || ""
  const summaryHtml = detailApp?.summary || ""
  const featureList = Array.isArray(detailApp?.features)
    ? detailApp.features
    : Array.isArray(detailApp?.highlights)
      ? detailApp.highlights
      : []
  const systemRequirementEntries = detailApp?.systemRequirements && typeof detailApp.systemRequirements === "object"
    ? Object.entries(detailApp.systemRequirements).map(([key, value]) => [key, String(value)] as const)
    : Array.isArray(detailApp?.requirements)
      ? detailApp.requirements.map((item, index) => [`要求 ${index + 1}`, String(item)] as const)
      : []

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
    setCountdownReady(skipDownloadCountdown)
    setReportExpanded(false)
    setReportNetdisk(downloadLinks[0]?.name ?? "")
    setReportReason(reportReasonOptions[0])
    setReportMessage("")
    setReportError("")
  }

  const handleDownloadLink = (url: string) => {
    if (!url || (!countdownReady && !skipDownloadCountdown)) return

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
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-900/30 dark:text-amber-200"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
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
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{subtitleText}</p>

                    {ratingValue > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(ratingValue) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {ratingValue.toFixed(1)} · {reviewCount} 条评价
                        </span>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {app.version && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> v{app.version}</span>}
                      {app.size && <span>{app.size}</span>}
                      {categoryName && <span>{categoryName}</span>}
                    </div>
                  </div>
                </div>
              </section>

              {/* 截图 */}
              {screenshotList.length > 0 && (
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
                      <Image src={screenshotList[currentScreenshotIndex]} alt={`截图 ${currentScreenshotIndex + 1}`} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 680px" />
                    </div>
                    {currentScreenshotIndex < screenshotList.length - 1 && (
                      <button
                        onClick={() => setCurrentScreenshotIndex((i) => i + 1)}
                        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm transition hover:bg-background"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {screenshotList.length > 1 && (
                    <div className="flex justify-center gap-1.5">
                      {screenshotList.map((_, i) => (
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
              {(summaryHtml || descriptionText) && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">详细介绍</h2>
                  {summaryHtml ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: summaryHtml }}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {descriptionText}
                    </div>
                  )}
                </section>
              )}

              {/* 特性 */}
              {featureList.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">主要特性</h2>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {featureList.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 系统要求 */}
              {systemRequirementEntries.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">系统要求</h2>
                  <div className="space-y-2">
                    {systemRequirementEntries.map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <span className="w-24 shrink-0 font-medium text-muted-foreground">{key}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 更新日志 */}
              {detailApp?.changelog && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-semibold">更新日志</h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {detailApp.changelog}
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-amber-300/40 bg-amber-50/50 p-6 shadow-sm dark:border-amber-700/40 dark:bg-amber-900/10">
                <h2 className="mb-4 text-base font-semibold text-amber-900 dark:text-amber-200">资源使用声明</h2>
                <ul className="space-y-2 text-sm leading-7 text-amber-900/90 dark:text-amber-100/90">
                  {resourceNoticeItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600/80 dark:bg-amber-300/80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

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

              {detailApp?.vendor && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-bold">开发商</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold">
                      {detailApp.vendor[0]}
                    </div>
                    <span className="text-sm font-medium">{detailApp.vendor}</span>
                  </div>
                </div>
              )}

              {categoryName && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-bold">分类</h3>
                  <div className="mt-3">
                    <Link href={`/software?category=${encodeURIComponent(categoryName)}`}>
                      <span className="inline-block cursor-pointer rounded-xl bg-secondary px-3 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                        {categoryName}
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
            <DialogDescription className="text-sm text-muted-foreground">{subtitleText}</DialogDescription>
          </DialogHeader>
          {downloadPermission.reason === "daily quota exhausted" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center justify-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                今日下载数已达限制
              </div>
              <p className="mt-2">
                今日已下载 {access?.userPermissions.downloadCountDaily ?? 0} 次，剩余 {access?.userPermissions.remainingDownloads ?? 0} 次。
              </p>
            </div>
          ) : downloadPermission.allowed && resolvedDownloadLinks.length > 0 ? (
            <div className="space-y-4">
              {!skipDownloadCountdown ? (
                <div className="space-y-3">
                  <DownloadCountdown
                    seconds={5}
                    softwareName={app?.name ?? slug}
                    onComplete={() => setCountdownReady(true)}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                  赞助会员及以上无需等待，可直接点击下载。
                </div>
              )}
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  {skipDownloadCountdown ? "你当前账号可直接下载。" : "倒计时结束后，下面的下载地址才可以点击。"}
                </p>
                <div className="grid gap-3">
                  {resolvedDownloadLinks.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => handleDownloadLink(item.url)}
                      disabled={!skipDownloadCountdown && !countdownReady}
                      className="inline-flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{item.name}</span>
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Download className="h-3.5 w-3.5" />
                        {skipDownloadCountdown || countdownReady ? "点击下载" : "倒计时中"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {detailApp?.changelog && (
                <details className="rounded-xl border border-border p-3 text-xs">
              <summary className="cursor-pointer font-medium">查看更新日志</summary>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{detailApp.changelog}</p>
                </details>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background px-4 py-5 text-center text-sm text-muted-foreground">
              {accessMessage(downloadPermission.reason)}
            </div>
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
