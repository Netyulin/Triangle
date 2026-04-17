"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  Eye,
  FileImage,
  LayoutGrid,
  MousePointerClick,
  TrendingUp,
} from "lucide-react"
import {
  fetchAdminAdsStats,
  type AdminAdsStatsPayload,
} from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

type StatsState = AdminAdsStatsPayload | null

export default function AdminAdsStatsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<StatsState>(null)

  const maxTrendCount = useMemo(() => {
    if (!stats?.trend?.length) return 1
    return Math.max(...stats.trend.map((item) => item.count), 1)
  }, [stats])

  const slotMaxContent = useMemo(() => {
    if (!stats?.slots?.length) return 1
    return Math.max(...stats.slots.map((slot) => slot._count.adContents), 1)
  }, [stats])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const data = await fetchAdminAdsStats()
        if (!active) return
        setStats(data)
      } catch (nextError) {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "广告统计加载失败")
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader
        title="广告数据"
        description="查看广告位表现、点击趋势与内容数量。"
        icon={<BarChart3 className="h-5 w-5" />}
        iconClassName="bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
      />

      {error ? (
        <div role="alert" className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="admin-panel px-4 py-12 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : stats ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="广告位" value={String(stats.summary.totalSlots ?? 0)} sub={`${stats.summary.activeSlots} 个启用`} icon={<LayoutGrid className="h-5 w-5" />} color="teal" />
            <KpiCard label="广告内容" value={String(stats.summary.totalContents ?? 0)} sub={`${stats.summary.activeContents} 个启用`} icon={<FileImage className="h-5 w-5" />} color="sky" />
            <KpiCard label="下载日志" value={formatCompact(stats.summary.totalDownloadLogs ?? 0)} sub="总计数量" icon={<Eye className="h-5 w-5" />} color="violet" />
            <KpiCard label="CPS 点击" value={formatCompact(stats.summary.totalCpsClicks ?? 0)} sub="联盟点击总计" icon={<MousePointerClick className="h-5 w-5" />} color="amber" />
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="admin-panel p-5 lg:col-span-3">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                {`近 ${stats.trend?.length ?? 0} 天 CPS 点击趋势`}
              </h2>
              {stats.trend?.length ? (
                <div className="space-y-2.5">
                  {stats.trend.map((item) => (
                    <div key={item.date} className="group flex items-center gap-3">
                      <span className="w-[72px] shrink-0 text-xs text-muted-foreground tabular-nums">
                        {item.date.slice(5)}
                      </span>
                      <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-secondary/50 transition-colors group-hover:bg-secondary/80">
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-teal-500/90 to-teal-400/70 transition-all duration-500"
                          style={{ width: Math.max(3, Math.round((item.count / maxTrendCount) * 100)) + "%" }}
                        >
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {item.count}
                          </span>
                        </div>
                      </div>
                      <span className="hidden w-[36px] shrink-0 text-right text-xs font-semibold text-foreground sm:block">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint text="暂无点击数据" />
              )}
            </div>

            <div className="admin-panel p-5 lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <LayoutGrid className="h-4 w-4 text-sky-500" />
                广告位分布
              </h2>
              {stats.slots?.length ? (
                <div className="space-y-3">
                  {stats.slots.map((slot) => {
                    const pct = Math.round((slot._count.adContents / slotMaxContent) * 100)
                    return (
                      <div key={slot.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${slot.isActive ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                            <span className="truncate text-xs font-medium text-foreground">{slot.name}</span>
                          </div>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-muted-foreground">{slot._count.adContents}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${slot.isActive ? "bg-gradient-to-r from-sky-500 to-cyan-400" : "bg-slate-300 dark:bg-slate-600"}`}
                            style={{ width: Math.max(4, pct) + "%" }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{slot.type} · {slot.position}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyHint text="暂无广告位" />
              )}
            </div>
          </section>

          <section className="admin-panel p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">广告位详情</h2>
            {stats.slots?.length ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">广告位</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">类型</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">位置</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">状态</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">内容数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.slots.map((slot) => (
                      <tr key={slot.id} className="border-b border-border/60 transition-colors hover:bg-secondary/20 last:border-b-0">
                        <td className="px-4 py-3 font-medium text-foreground">{slot.name}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                            {slot.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{slot.position}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${slot.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${slot.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
                            {slot.isActive ? "启用" : "停用"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{slot._count.adContents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyHint text="暂无广告位数据" />
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: "teal" | "sky" | "violet" | "amber"
}) {
  const colors: Record<string, string> = {
    teal: "from-teal-500 to-teal-600 shadow-teal-500/15",
    sky: "from-sky-500 to-sky-600 shadow-sky-500/15",
    violet: "from-violet-500 to-violet-600 shadow-violet-500/15",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/15",
  }

  return (
    <div className="group admin-panel overflow-hidden p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform group-hover:scale-110 ${colors[color] || colors.teal}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}
