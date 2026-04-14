"use client"

import { useEffect, useState, type CSSProperties } from "react"
import Link from "next/link"
import { AppIcon } from "@/components/app-icon"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { ADSENSE_SLOT_IDS, DEFAULT_ADSENSE_SLOT_TOGGLES, fetchAdSenseSlotToggles, request, type HomePayload } from "@/lib/api"
import { looksLikeImageUrl, resolveAssetUrl } from "@/lib/utils"
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Download, Eye, MessageSquare, RefreshCw, Star, TrendingUp } from "lucide-react"
import { AdSenseSlot } from "@/components/ads/AdSenseSlot"
import { AnnouncementToast } from "@/components/announcement-toast"

function getInitial(text: string) {
  return text.trim().slice(0, 2).toUpperCase() || "??"
}

function resolveHeroGradientStyle(token: string): CSSProperties | undefined {
  const from = token.match(/from-\[(#[0-9a-fA-F]{3,8})\]/)?.[1]
  const to = token.match(/to-\[(#[0-9a-fA-F]{3,8})\]/)?.[1]
  if (!from || !to) return undefined
  return { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }
}

function resolveSolidColorStyle(token: string): CSSProperties | undefined {
  const trimmed = token.trim()
  const hex = trimmed.match(/bg-\[(#[0-9a-fA-F]{3,8})\]/)?.[1]
  if (hex) return { backgroundColor: hex }
  const palette: Record<string, string> = {
    "bg-slate-800": "#1e293b",
    "bg-slate-900": "#0f172a",
    "bg-orange-500": "#f97316",
    "bg-amber-500": "#f59e0b",
    "bg-rose-500": "#f43f5e",
    "bg-sky-500": "#0ea5e9",
  }
  const value = palette[trimmed]
  return value ? { backgroundColor: value } : undefined
}

function getLuminance(hex: string): number {
  const hexClean = hex.replace("#", "")
  let r: number, g: number, b: number
  if (hexClean.length === 3) {
    r = parseInt(hexClean[0] + hexClean[0], 16) / 255
    g = parseInt(hexClean[1] + hexClean[1], 16) / 255
    b = parseInt(hexClean[2] + hexClean[2], 16) / 255
  } else {
    r = parseInt(hexClean.slice(0, 2), 16) / 255
    g = parseInt(hexClean.slice(2, 4), 16) / 255
    b = parseInt(hexClean.slice(4, 6), 16) / 255
  }
  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getHeroTextClasses(colorToken: string) {
  const from = colorToken.match(/from-\[(#[0-9a-fA-F]{3,8})\]/)?.[1]
  if (!from) {
    return { title: "text-white", body: "text-white/70", tagBg: "bg-white/15", controlBg: "bg-white/15", dotActive: "bg-white", dotInactive: "bg-white/45" }
  }
  const luminance = getLuminance(from)
  if (luminance > 0.5) {
    return { title: "text-slate-900", body: "text-slate-700", tagBg: "bg-slate-900/15", controlBg: "bg-slate-900/15", dotActive: "bg-slate-900", dotInactive: "bg-slate-900/45" }
  }
  return { title: "text-white", body: "text-white/70", tagBg: "bg-white/15", controlBg: "bg-white/15", dotActive: "bg-white", dotInactive: "bg-white/45" }
}

export default function HomePage() {
  const [home, setHome] = useState<HomePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [adSwitches, setAdSwitches] = useState(DEFAULT_ADSENSE_SLOT_TOGGLES)

  const loadHome = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await request<HomePayload>("/api/home")
      setHome(data)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "首页内容加载失败。")
      setHome(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHome()
  }, [])

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

  useEffect(() => {
    if (!home?.heroSlides.length) return
    const timer = window.setInterval(() => setCurrentSlide((value) => (value + 1) % home.heroSlides.length), 5000)
    return () => window.clearInterval(timer)
  }, [home?.heroSlides.length])

  useEffect(() => {
    if (currentSlide >= (home?.heroSlides.length ?? 0)) setCurrentSlide(0)
  }, [currentSlide, home?.heroSlides.length])

  const activeSlide = home?.heroSlides[currentSlide] ?? null
  const announcements = home?.announcements ?? []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container-custom space-y-8 py-8">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">首页内容加载中...</div>
          ) : error ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-sm text-muted-foreground">{error}</p>
              <button onClick={loadHome} className="btn-primary">
                <RefreshCw className="h-4 w-4" />
                重新加载
              </button>
            </div>
          ) : activeSlide ? (
            (() => {
              const textClasses = getHeroTextClasses(activeSlide.color)
              const getCoverTextClass = (coverBg: string) => {
                const hex = coverBg.match(/bg-\[(#[0-9a-fA-F]{3,8})\]/)?.[1]
                if (!hex) return "text-white"
                return getLuminance(hex) > 0.5 ? "text-slate-900" : "text-white"
              }
              const coverTextClass = getCoverTextClass(activeSlide.coverBg)

              return (
                <div className={`relative overflow-hidden ${textClasses.title}`} style={resolveHeroGradientStyle(activeSlide.color)}>
                  <div className="flex flex-col gap-8 p-6 md:h-[320px] md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full ${textClasses.tagBg} px-2.5 py-1 font-semibold`}>{activeSlide.tag}</span>
                        <span className={textClasses.body}>{activeSlide.subtitle}</span>
                      </div>
                      <h1 className="text-3xl font-black leading-tight text-balance md:text-5xl">{activeSlide.title}</h1>
                      <p className={`mt-4 max-w-xl text-balance text-sm leading-7 md:text-base ${textClasses.body}`}>{activeSlide.desc}</p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link href={activeSlide.href} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-transform hover:scale-[1.02]">
                          <BookOpen className="h-4 w-4" />
                          查看内容
                        </Link>
                        {activeSlide.downloadHref ? (
                          <Link href={activeSlide.downloadHref} className={`inline-flex items-center gap-2 rounded-xl border ${textClasses.tagBg} px-4 py-2.5 text-sm font-medium transition-transform hover:scale-[1.02]`}>
                            <Download className="h-4 w-4" />
                            前往软件页
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      {activeSlide.icon ? (
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl md:h-36 md:w-36">
                          {looksLikeImageUrl(activeSlide.icon) ? (
                            <img src={resolveAssetUrl(activeSlide.icon)} alt={activeSlide.title} className="h-full w-full object-cover" />
                          ) : (
                            <AppIcon
                              value={activeSlide.icon}
                              name={activeSlide.title}
                              className="flex h-full w-full items-center justify-center text-4xl font-black text-white"
                              imageClassName="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      ) : (
                        <div
                          className={`flex h-28 w-28 items-center justify-center rounded-[2rem] bg-slate-800 text-4xl font-black shadow-2xl md:h-36 md:w-36 ${activeSlide.coverColor} ${coverTextClass}`}
                          style={resolveSolidColorStyle(activeSlide.coverBg)}
                        >
                          {activeSlide.coverText}
                        </div>
                      )}
                    </div>
                  </div>

                  {home && home.heroSlides.length > 1 ? (
                    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
                      {/* 进度条 */}
                      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/20">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${textClasses.dotActive}`}
                          style={{ width: `${((currentSlide + 1) / home.heroSlides.length) * 100}%` }}
                        />
                      </div>
                      {/* 控制按钮 */}
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentSlide((value) => (value - 1 + home.heroSlides.length) % home.heroSlides.length)} className={`rounded-full ${textClasses.controlBg} p-2 transition hover:scale-110`}>
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex gap-1.5">
                          {home.heroSlides.map((slide, index) => (
                            <button key={slide.id} onClick={() => setCurrentSlide(index)} className={`h-2 rounded-full transition-all ${index === currentSlide ? `w-6 ${textClasses.dotActive}` : `w-2 ${textClasses.dotInactive}`}`} />
                          ))}
                        </div>
                        <button onClick={() => setCurrentSlide((value) => (value + 1) % home.heroSlides.length)} className={`rounded-full ${textClasses.controlBg} p-2 transition hover:scale-110`}>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })()
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-base font-semibold text-foreground">暂无推荐内容</p>
              <p className="text-sm text-muted-foreground">发布软件或文章后，这里会自动展示最新推荐。</p>
            </div>
          )}
        </section>

        {/* 首页轮播下方 AdSense 广告位 */}
        {ADSENSE_SLOT_IDS.triangle_home_top && adSwitches.triangle_home_top ? (
          <section className="overflow-hidden rounded-2xl">
            <AdSenseSlot
              slotId={ADSENSE_SLOT_IDS.triangle_home_top}
              width="auto"
              height={90}
              format="horizontal"
            />
          </section>
        ) : null}

        <AnnouncementToast announcements={announcements} />

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card-custom p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">软件总数</p><p className="mt-2 font-mono text-3xl font-black text-foreground">{home?.stats.publishedApps ?? 0}</p></div>
          <div className="card-custom p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">文章总数</p><p className="mt-2 font-mono text-3xl font-black text-foreground">{home?.stats.publishedPosts ?? 0}</p></div>
          <div className="card-custom p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">公开需求</p><p className="mt-2 font-mono text-3xl font-black text-foreground">{home?.stats.publicRequests ?? 0}</p></div>
          <div className="card-custom p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">已处理需求</p><p className="mt-2 font-mono text-3xl font-black text-foreground">{home?.stats.solvedRequests ?? 0}</p></div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">编辑推荐</p>
                <h2 className="mt-1 heading-2 text-foreground">值得先看</h2>
              </div>
              <Link href="/news" className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover">
                查看全部文章
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {home?.featuredPosts.length ? (
              <div className="space-y-3">
                {home.featuredPosts.map((post) => (
                  <Link key={post.slug} href={`/news/${post.slug}`} className="group card-custom flex gap-4 p-4 transition-all hover:border-accent/25">
                    <div className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl font-black text-foreground ${post.displayMode !== "icon" && post.coverImage ? "h-20 w-32 overflow-hidden p-0" : "h-20 w-20"}`}>
                      {post.displayMode !== "icon" && post.coverImage ? (
                        <img src={resolveAssetUrl(post.coverImage)} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <AppIcon value={post.icon} name={post.title || getInitial(post.title)} className="flex h-full w-full items-center justify-center" imageClassName="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="badge badge-secondary">{post.category}</span>
                        <span>{post.readingTime}</span>
                        <span>{post.dateLabel}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-1 text-base font-bold text-foreground transition-colors group-hover:text-accent">{post.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{post.author}</span>
                        {post.relatedApp ? <span>关联软件：{post.relatedApp.name}</span> : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="text-base font-semibold text-foreground">暂无文章</p>
                <p className="mt-2 text-sm text-muted-foreground">发布教程、评测或整理内容后，这里会自动更新。</p>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="card-custom">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Star className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">编辑推荐</h3>
              </div>
              {home?.editorPicks.length ? (
                <ol className="divide-y divide-border">
                  {home.editorPicks.map((item, index) => (
                    <li key={item.slug}>
                      <Link href={`/news/${item.slug}`} className="flex gap-3 px-5 py-4 transition-colors hover:bg-muted">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground">{index + 1}</span>
                        <div className="min-w-0"><p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.category}</p></div>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="px-5 py-6 text-sm text-muted-foreground">添加推荐内容后，这里会自动显示。</div>
              )}
            </div>

            <div className="card-custom">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Eye className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-bold text-foreground">阅读推荐</h3>
              </div>
              {home?.readingRanks.length ? (
                <ol className="divide-y divide-border">
                  {home.readingRanks.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/news/${item.slug}`} className="flex gap-3 px-5 py-4 transition-colors hover:bg-muted">
                        <span className="w-4 flex-shrink-0 text-center text-xs font-bold text-muted-foreground">{item.rank}</span>
                        <div className="min-w-0"><p className="line-clamp-2 text-sm text-foreground">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.readingTime}</p></div>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="px-5 py-6 text-sm text-muted-foreground">设置阅读排行后，这里会自动显示。</div>
              )}
            </div>

            <div className="card-custom">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-bold text-foreground">软件下载排行</h3>
              </div>
              {home?.softwareRankings.length ? (
                <>
                  <ol className="divide-y divide-border">
                    {home.softwareRankings.map((item) => (
                      <li key={item.slug}>
                        <Link href={`/software/${item.slug}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground">{item.rank}</span>
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-black text-foreground">{getInitial(item.name)}</div>
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{item.name}</p><p className="truncate text-xs text-muted-foreground">{item.subtitle}</p></div>
                          <span className="text-xs text-muted-foreground">{item.downloads}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                  <div className="border-t border-border px-5 py-4">
                    <Link href="/software" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
                      查看软件库
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="px-5 py-6 text-sm text-muted-foreground">有下载数据后，这里会自动生成排行。</div>
              )}
            </div>

            <div className="card-custom">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <MessageSquare className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground">常用入口</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 px-5 py-5">
                <Link href="/requests" className="card-custom bg-secondary/40 p-4 transition-all hover:border-accent/25">
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <p className="mt-3 text-sm font-semibold text-foreground">需求墙</p>
                  <p className="mt-1 text-xs text-muted-foreground">{home?.stats.publicRequests ?? 0} 条公开需求</p>
                </Link>
                <Link href="/software" className="card-custom bg-secondary/40 p-4 transition-all hover:border-accent/25">
                  <Download className="h-4 w-4 text-amber-500" />
                  <p className="mt-3 text-sm font-semibold text-foreground">软件库</p>
                  <p className="mt-1 text-xs text-muted-foreground">{home?.stats.publishedApps ?? 0} 个已发布软件</p>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
