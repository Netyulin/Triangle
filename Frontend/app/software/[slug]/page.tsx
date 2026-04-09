"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, Bookmark, CheckCircle2, Download, RefreshCw, ShieldCheck, Star } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
    if (!downloadLinks.length) return
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
        }),
      })
      setReportMessage("已经收到，我们会尽快核查。")
      setReportReason(reportReasonOptions[0])
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
        <Link href="/software" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回软件库
        </Link>

        {loading ? (
          <section className="mt-6 rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">软件详情加载中...</section>
        ) : error || !app || !access ? (
          <section className="mt-6 rounded-[28px] border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error || "没有找到这条软件记录。"}</p>
            <button onClick={loadDetail} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {app.heroImage ? (
              <div className="overflow-hidden rounded-[30px] border border-border bg-card">
                <img src={resolveAssetUrl(app.heroImage)} alt={app.name} className="h-[260px] w-full object-cover md:h-[340px]" />
              </div>
            ) : null}

            <section className="rounded-[30px] border border-border bg-card p-6 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.24)] md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 gap-5 lg:max-w-[760px]">
                  <div className="flex h-20 w-20 flex-shrink-0 overflow-hidden rounded-[28px] border border-border bg-secondary">
                    <AppIcon
                      value={app.icon}
                      name={app.name}
                      className="flex h-full w-full items-center justify-center text-xl font-black text-foreground"
                      imageClassName="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">{app.category}</span>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{accessLabel(app.accessLevel)}</span>
                      {app.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          已认证
                        </span>
                      ) : null}
                    </div>
                    <h1 className="mt-3 text-4xl font-black leading-tight text-foreground">{app.name}</h1>
                    <p className="mt-2 text-base leading-7 text-muted-foreground">{app.subtitle}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground">版本</span> <span className="text-foreground">{app.version}</span>
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">大小</span> <span className="text-foreground">{app.size}</span>
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">下载</span> <span className="text-foreground">{app.downloads}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        {app.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 rounded-[28px] border border-border bg-secondary/30 p-2.5">
                  <button
                    onClick={handleFavorite}
                    disabled={favoriteLoading}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                      favorited ? "border-slate-900/10 bg-slate-900 text-slate-50 dark:border-sky-400/20 dark:bg-slate-100 dark:text-slate-950" : "border-border bg-background text-foreground"
                    }`}
                  >
                    <Bookmark className="h-4 w-4" />
                    {favorited ? "已收藏" : "收藏"}
                  </button>

                  <button
                    onClick={openDownloadFlow}
                    className="inline-flex min-w-[148px] items-center gap-2 rounded-2xl border border-slate-900/90 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-50 transition hover:-translate-y-0.5 hover:border-sky-400/40"
                  >
                    <Download className="h-4 w-4" />
                    立即下载
                  </button>
                </div>
              </div>

              {/* AdSense Slot #1 — 版本信息 block 之后（移动端正确位置） */}
              {ADSENSE_SLOT_IDS.triangle_detail_top && adSwitches.triangle_detail_top ? (
                <div className="mt-4">
                  <AdSenseSlot
                    slotId={ADSENSE_SLOT_IDS.triangle_detail_top}
                    width="auto"
                    height={90}
                    format="horizontal"
                  />
                </div>
              ) : null}
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="space-y-6">
                <div className="rounded-[28px] border border-border bg-card p-6">
                  <h2 className="text-xl font-black text-foreground">软件简介</h2>
                  <div
                    className="prose prose-neutral dark:prose-invert mt-4 max-w-none text-muted-foreground prose-headings:text-foreground prose-p:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: app.summary || "" }}
                  />
                </div>

                {app.highlights.length > 0 ? (
                  <div className="rounded-[28px] border border-border bg-card p-6">
                    <h2 className="text-xl font-black text-foreground">亮点</h2>
                    <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                      {app.highlights.map((item) => (
                        <li key={item} className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {app.review ? (
                  <div className="rounded-[28px] border border-border bg-card p-6">
                    <h2 className="text-xl font-black text-foreground">编辑点评</h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{app.review}</p>
                  </div>
                ) : null}

                {relatedPosts.length > 0 ? (
                  <div className="rounded-[28px] border border-border bg-card p-6">
                    <h2 className="text-xl font-black text-foreground">相关文章</h2>
                    <div className="mt-4 space-y-3">
                      {relatedPosts.map((post) => (
                        <Link
                          key={post.slug}
                          href={`/news/${post.slug}`}
                          className="block rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:border-accent/25"
                        >
                          <p className="font-semibold text-foreground">{post.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{post.excerpt}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* AdSense Slot #2 — 评论区/相关文章下方（设计文档 Section 4.1） */}
                {ADSENSE_SLOT_IDS.triangle_detail_bottom && adSwitches.triangle_detail_bottom ? (
                  <div className="mt-4">
                    <AdSenseSlot
                      slotId={ADSENSE_SLOT_IDS.triangle_detail_bottom}
                      width="auto"
                      height={90}
                      format="horizontal"
                    />
                  </div>
                ) : null}
              </section>

              <aside className="space-y-5">
                <div className="rounded-[28px] border border-border bg-card p-5">
                  <h3 className="text-base font-bold text-foreground">基础信息</h3>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground">收费方式：</span>{app.pricing}</p>
                    <p><span className="font-medium text-foreground">更新时间：</span>{app.updatedAt}</p>
                    <p><span className="font-medium text-foreground">适用平台：</span>{app.platforms.join(" / ") || "待补充"}</p>
                    <p><span className="font-medium text-foreground">兼容环境：</span>{app.compatibility.join(" / ") || "待补充"}</p>
                  </div>
                </div>

                {app.requirements.length > 0 ? (
                  <div className="rounded-[28px] border border-border bg-card p-5">
                    <h3 className="text-base font-bold text-foreground">使用要求</h3>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {app.requirements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {app.tags.length > 0 ? (
                  <div className="rounded-[28px] border border-border bg-card p-5">
                    <h3 className="text-base font-bold text-foreground">标签</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {app.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        )}
      </main>

      <Dialog
        open={downloadOpen}
        onOpenChange={(open) => {
          setDownloadOpen(open)
          if (!open) setReportExpanded(false)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>下载链接</DialogTitle>
            <DialogDescription>如果你是基础会员，会先进入中间页；更高等级账号则会直接下载。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {access ? (
              downloadPermission.allowed && downloadLinks.length > 0 ? (
                <div className="flex flex-col items-start gap-3">
                  {downloadLinks.map((link) => (
                    <button key={`${link.name}-${link.url}`} onClick={() => handleDownloadLink(link.url)} className="inline-flex items-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:text-accent">
                      {link.name}下载
                    </button>
                  ))}
                  {primaryDownload ? (
                    <button onClick={() => handleDownloadLink(primaryDownload)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                      <Download className="h-4 w-4" />
                      前往下载页
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">{accessMessage(downloadPermission.reason)}</div>
              )
            ) : (
              <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">正在加载下载信息...</div>
            )}

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">链接失效反馈</p>
                  <p className="mt-1 text-xs text-muted-foreground">如果某个网盘失效，告诉我们一声就行。</p>
                </div>
                <button
                  type="button"
                  className="feedback-btn"
                  onClick={() => {
                    setReportExpanded((current) => {
                      const next = !current
                      if (next) setReportNetdisk(downloadLinks[0]?.name ?? "")
                      return next
                    })
                    setReportMessage("")
                    setReportError("")
                  }}
                >
                  {reportExpanded ? "收起反馈" : "反馈失效"}
                </button>
              </div>

              {reportExpanded ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">网盘名称</span>
                    <select
                      value={reportNetdisk}
                      onChange={(event) => setReportNetdisk(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-ring/40"
                    >
                      {(downloadLinks.length ? downloadLinks : [{ name: "百度网盘", url: "" }]).map((link) => (
                        <option key={link.name} value={link.name}>
                          {link.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">失效原因</span>
                    <select
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-ring/40"
                    >
                      {reportReasonOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  {reportError ? <p className="text-sm text-destructive">{reportError}</p> : null}
                  {reportMessage ? <p className="text-sm text-emerald-600">{reportMessage}</p> : null}
                  <button
                    type="button"
                    onClick={() => void handleReportSubmit()}
                    disabled={reporting}
                    className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                  >
                    {reporting ? "提交中..." : "提交反馈"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
