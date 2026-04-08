"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BarChart3, FileText, MessageSquare, Package } from "lucide-react"
import { AdminTable } from "@/components/admin/admin-table"
import { AdminTrendChart } from "@/components/admin/admin-trend-chart"
import { fetchAdminApps, fetchAdminPosts, fetchAdminStats, fetchAdminTrends } from "@/lib/admin-api"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    newAppsThisWeek: 0,
    publishedPosts: 0,
    totalRequests: 0,
  })
  const [trendData, setTrendData] = useState<Array<{ date: string; apps: number; posts: number; requests: number }>>([])
  const [recentApps, setRecentApps] = useState<Array<{ slug: string; name: string; status: string }>>([])
  const [recentPosts, setRecentPosts] = useState<Array<{ slug: string; title: string; author: string; status: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    Promise.all([fetchAdminStats(), fetchAdminTrends(7), fetchAdminApps(), fetchAdminPosts()])
      .then(([adminStats, trends, apps, posts]) => {
        if (!active) return

        setStats({
          pendingRequests: adminStats.pendingRequests,
          newAppsThisWeek: adminStats.newAppsThisWeek,
          publishedPosts: adminStats.publishedPosts,
          totalRequests: adminStats.totalRequests,
        })
        setTrendData(trends.trendData.map((item) => ({ ...item, date: item.date.slice(5) })))
        setRecentApps(apps.slice(0, 3).map((item) => ({ slug: item.slug, name: item.name, status: item.status })))
        setRecentPosts(posts.slice(0, 3).map((item) => ({ slug: item.slug, title: item.title, author: item.author, status: item.status })))
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "后台数据加载失败。")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const recentRows = useMemo(
    () => [
      ...recentPosts.map((item) => ({
        id: item.slug,
        title: item.title,
        type: "文章",
        author: item.author || "管理员",
        status: item.status || "published",
      })),
      ...recentApps.map((item) => ({
        id: item.slug,
        title: item.name,
        type: "软件",
        author: "管理员",
        status: item.status || "published",
      })),
    ],
    [recentApps, recentPosts],
  )

  const cards = [
    {
      label: "待处理需求",
      value: stats.pendingRequests,
      href: "/admin/submissions?status=pending",
      helper: "快速查看还没有回复的用户需求",
      icon: MessageSquare,
      accent: "text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/30",
    },
    {
      label: "本周新增软件",
      value: stats.newAppsThisWeek,
      href: "/admin/apps",
      helper: "查看最近新增的软件条目",
      icon: Package,
      accent: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/30",
    },
    {
      label: "已发布文章",
      value: stats.publishedPosts,
      href: "/admin/posts",
      helper: "继续维护站内内容质量",
      icon: FileText,
      accent: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30",
    },
    {
      label: "总需求数",
      value: stats.totalRequests,
      href: "/admin/submissions",
      helper: "查看全部需求与处理记录",
      icon: BarChart3,
      accent: "text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/30",
    },
  ]

  return (
    <div className="space-y-6">
      <section className="admin-hero p-6 md:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">后台概览</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">把软件、文章、专题和站点设置放在同一个入口里统一管理</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              这页保留前台那种清爽的浅蓝灰调子，但把信息密度拉高，方便你快速扫描待办、趋势和最近更新。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:w-[360px]">
            {cards.slice(0, 2).map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.label} href={card.href} className="admin-card p-4 transition hover:-translate-y-0.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{loading ? "-" : card.value}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.href} className="admin-panel group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-34px_rgba(14,165,233,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{loading ? "-" : card.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.accent} shadow-[0_14px_32px_-24px_rgba(15,23,42,0.25)]`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-xs leading-5 text-muted-foreground">{card.helper}</span>
                <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0" />
              </div>
            </Link>
          )
        })}
      </section>

      <section className="admin-panel p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">最近 7 天趋势</h2>
          <p className="mt-1 text-sm text-muted-foreground">用一张图快速看最近新增的软件、文章和需求。</p>
        </div>
        <div>{trendData.length ? <AdminTrendChart data={trendData} /> : <div className="h-[280px] rounded-2xl bg-secondary/40" />}</div>
      </section>

      <AdminTable title="最近内容" description="这里显示最近同步到后台的软件和文章。" rows={recentRows} emptyText="最近还没有新增内容。" />
    </div>
  )
}
