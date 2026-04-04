"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Package, FileText, MessageSquare, BarChart3 } from "lucide-react"
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
      helper: "快速查看还没回复的用户需求",
      icon: MessageSquare,
      gradient: "from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20",
      border: "border-amber-100 dark:border-amber-900",
      iconBg: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "本周新增软件",
      value: stats.newAppsThisWeek,
      href: "/admin/apps",
      helper: "查看最近新增的软件条目",
      icon: Package,
      gradient: "from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20",
      border: "border-blue-100 dark:border-blue-900",
      iconBg: "bg-blue-600",
      text: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "已发布文章",
      value: stats.publishedPosts,
      href: "/admin/posts",
      helper: "继续维护站内文章内容",
      icon: FileText,
      gradient: "from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20",
      border: "border-emerald-100 dark:border-emerald-900",
      iconBg: "bg-emerald-600",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "总需求数",
      value: stats.totalRequests,
      href: "/admin/submissions",
      helper: "查看全部需求与处理记录",
      icon: BarChart3,
      gradient: "from-violet-50/80 to-purple-50/50 dark:from-violet-950/40 dark:to-purple-950/20",
      border: "border-violet-100 dark:border-violet-900",
      iconBg: "bg-violet-600",
      text: "text-violet-600 dark:text-violet-400",
    },
  ]

  return (
    <>
      <div className="admin-hero p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">后台概览</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">把软件、文章、专题、需求和站点设置放到同一个入口里统一管理。</p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <svg className="mt-[-1px] h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md ${card.gradient} ${card.border}`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.text}`}>{loading ? "-" : card.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg} text-white shadow-lg shadow-current/20`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{card.helper}</span>
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-slate-400 transition-transform duration-200 group-hover:translate-x-0" />
                </div>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="admin-panel p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">最近 7 天趋势</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">用一张图快速看后台最近新增的软件、文章和需求。</p>
        </div>
        <div>{trendData.length ? <AdminTrendChart data={trendData} /> : <div className="h-[280px] rounded-xl bg-slate-100/50 dark:bg-slate-900/50" />}</div>
      </section>

      <AdminTable title="最近内容" description="这里展示最近同步到后台的软件和文章。" rows={recentRows} emptyText="最近还没有新增内容。" />
    </>
  )
}
