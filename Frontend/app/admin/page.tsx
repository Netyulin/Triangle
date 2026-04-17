"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  Globe,
  MessageSquare,
  Package,
  Plus,
  TrendingUp,
} from "lucide-react"
import { AdminTable } from "@/components/admin/admin-table"
import { AdminTrendChart } from "@/components/admin/admin-trend-chart"
import { PageHeader } from "@/components/admin/page-header"
import {
  fetchAdminApps,
  fetchAdminPosts,
  fetchAdminStats,
  fetchAdminTrends,
} from "@/lib/admin-api"


type StatsData = {
  todayPageViews: number
  pendingRequests: number
  newAppsThisWeek: number
  publishedPosts: number
  totalRequests: number
  todayDownloads: number
  uniqueIPsToday: number
}

type TrendItem = { date: string; apps: number; posts: number; requests: number; downloads?: number; uniqueIPs?: number }


export default function AdminDashboardPage() {

  const [stats, setStats] = useState<StatsData>({
    todayPageViews: 0,
    pendingRequests: 0,
    newAppsThisWeek: 0,
    publishedPosts: 0,
    totalRequests: 0,
    todayDownloads: 0,
    uniqueIPsToday: 0,
  })
  const [trendData, setTrendData] = useState<TrendItem[]>([])
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
          todayPageViews: adminStats.todayPageViews ?? 0,
          pendingRequests: adminStats.pendingRequests ?? 0,
          newAppsThisWeek: adminStats.newAppsThisWeek ?? 0,
          publishedPosts: adminStats.publishedPosts ?? 0,
          totalRequests: adminStats.totalRequests ?? 0,
          todayDownloads: adminStats.todayDownloads ?? 0,
          uniqueIPsToday: adminStats.uniqueIPsToday ?? 0,
        })
        // Merge download/IP data into trend data
        setTrendData(trends.trendData.map((item) => ({
          ...item,
          date: item.date.slice(5),
          downloads: item.downloads ?? 0,
          uniqueIPs: item.uniqueIPs ?? 0,
        })))
        setRecentApps(apps.slice(0, 4).map((item) => ({ slug: item.slug, name: item.name, status: item.status })))
        setRecentPosts(posts.slice(0, 2).map((item) => ({ slug: item.slug, title: item.title, author: item.author, status: item.status })))
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "后台数据加载失败")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
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

  // Real stats from API
  const todayDownloads = stats.todayDownloads ?? 0
  const uniqueIPsToday = stats.uniqueIPsToday ?? 0

  // Cards definition 鈥?6 cards
  const cards = [
    {
      label: "今日浏览",
      value: loading ? "-" : String(stats.todayPageViews ?? 0),
      sub: "PV",
      icon: <Eye className="h-5 w-5" />,
      color: "from-sky-500 to-blue-600 shadow-sky-500/15",
      href: null,
    },
    {
      label: "今日下载",
      value: loading ? "-" : String(todayDownloads),
      sub: "DV",
      icon: <Download className="h-5 w-5" />,
      color: "from-emerald-500 to-green-600 shadow-emerald-500/15",
      href: "/admin/apps",
    },
    {
      label: "活跃 IP",
      value: loading ? "-" : String(uniqueIPsToday),
      sub: "今日",
      icon: <Globe className="h-5 w-5" />,
      color: "from-violet-500 to-purple-600 shadow-violet-500/15",
      href: "/admin/active-ips",
    },
    {
      label: "待处理需求",
      value: loading ? "-" : String(stats.pendingRequests),
      sub: "需求墙",
      icon: <MessageSquare className="h-5 w-5" />,
      color: "from-amber-500 to-orange-600 shadow-amber-500/15",
      href: "/admin/submissions?status=pending",
    },
    {
      label: "本周新增软件",
      value: loading ? "-" : String(stats.newAppsThisWeek),
      sub: "上周",
      icon: <Package className="h-5 w-5" />,
      color: "from-blue-500 to-indigo-600 shadow-blue-500/15",
      href: "/admin/apps",
    },
    {
      label: "已发布文章",
      value: loading ? "-" : String(stats.publishedPosts),
      sub: "总计",
      icon: <FileText className="h-5 w-5" />,
      color: "from-rose-500 to-pink-600 shadow-rose-500/15",
      href: "/admin/posts",
    },
  ]


  return (
    <div className="space-y-5">
      {/* ====== Page Header (替代原 Hero) ====== */}
      <PageHeader
        title="后台总览"
        description="站点运营核心数据：浏览量、下载量、活跃 IP、内容增长"
        icon={<TrendingUp className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"
      />

      {/* Error */}
      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
      ) : null}

      {/* ====== 6 KPI Cards (保持不变) ====== */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const CardInner = () => (
            <div className={`group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-24px_rgba(15,23,42,0.12)] ${card.href ? 'cursor-pointer' : ''}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${card.color}`}>
                {card.icon}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className={`mt-1 text-2xl font-black tabular-nums text-foreground ${loading ? 'opacity-30' : ''}`}>{card.value}</p>
              </div>
              {card.href && (
                <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <span className="text-xs text-primary">查看</span>
                  <ArrowRight className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>
          )
          const cardContent = <CardInner />
          return card.href ? (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
              {cardContent}
            </Link>
          ) : (
            <div key={card.label} className="rounded-2xl border border-border bg-card">{cardContent}</div>
          )
        })}
      </section>


      {/* ====== Trend Chart + Quick Actions (左右并排) ====== */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Trend Chart — 占 2 列 */}
        <div className="admin-panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">近 7 天趋势</h2>
            <span className="ml-auto text-xs text-muted-foreground">下载 / IP</span>
          </div>
          {trendData.length ? (
            <AdminTrendChart data={trendData} />
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-2xl bg-secondary/40 text-sm text-muted-foreground">
              {loading ? "加载中..." : "暂无数据"}
            </div>
          )}
        </div>

        {/* Quick Actions — 占 1 列 */}
        <div className="admin-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">快捷操作</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {[
              { href: "/admin/apps/new", label: "新建软件", icon: Package, color: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400" },
              { href: "/admin/posts/new", label: "新建文章", icon: FileText, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" },
              { href: "/admin/submissions?status=pending", label: "审核需求", icon: MessageSquare, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
              { href: "/admin/ads-stats", label: "广告数据", icon: Eye, color: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400" },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary/80"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {action.label}
                </Link>
              )
            })}
          </div>
        </div>
      </section>


      {/* ====== Recent Content Table ====== */}
      <AdminTable
        title="最近内容"
        description="显示最近同步到后台的软件和文章"
        rows={recentRows}
        emptyText="最近还没有新增内容。"
      />
    </div>
  )
}



