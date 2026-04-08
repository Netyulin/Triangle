"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ExternalLink, ShieldCheck, Sparkles } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAppContext } from "@/components/app-provider"

export default function DownloadInterstitialPage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { permissions, token } = useAppContext()

  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug
  const target = searchParams.get("target") || ""
  const name = searchParams.get("name") || "该软件"
  const [countdown, setCountdown] = useState(5)

  const isSessionPending = Boolean(token) && !permissions
  const isInitialLevel = permissions ? permissions.membershipLevel === "free" : !token

  useEffect(() => {
    if (!target || isSessionPending) return

    if (!isInitialLevel) {
      window.location.replace(target)
      return
    }

    if (countdown <= 0) {
      window.location.replace(target)
      return
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, isInitialLevel, isSessionPending, target])

  useEffect(() => {
    if (!target) {
      router.replace(`/software/${slug}`)
    }
  }, [router, slug, target])

  const downloadLabel = useMemo(() => {
    if (isSessionPending) return "正在确认当前账号权限..."
    return isInitialLevel ? `倒计时 ${countdown} 秒后自动跳转` : "高级会员正在直达下载地址"
  }, [countdown, isInitialLevel, isSessionPending])

  if (!target) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href={`/software/${slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回软件详情
        </Link>

        <section className="mt-6 overflow-hidden rounded-[30px] border border-border bg-card p-6 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.24)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                下载中间页
              </div>
              <h1 className="mt-4 text-4xl font-black text-foreground">{name}</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                这里预留给广告展示、购买提示或下载前确认。免费会员会短暂停留，高等级会员会自动跳过。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => window.location.replace(target)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  继续下载
                </button>
                <Link href={`/software/${slug}`} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground">
                  返回详情
                </Link>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{downloadLabel}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
              <div className="rounded-[24px] border border-border bg-secondary/30 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">会员状态</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  {isSessionPending ? "正在识别" : isInitialLevel ? "免费会员" : "高级会员"}
                </div>
              </div>
              <div className="rounded-[24px] border border-dashed border-border bg-background p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">广告位预留</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">这里可以接入广告展示内容、购买按钮或下载说明。</p>
              </div>
              <div className="rounded-[24px] border border-border bg-secondary/30 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">当前倒计时</p>
                <p className="mt-3 text-3xl font-black text-foreground">{isSessionPending ? "--" : isInitialLevel ? countdown : 0}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
