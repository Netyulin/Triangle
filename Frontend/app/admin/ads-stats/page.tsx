"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3 } from "lucide-react"
import { fetchAdminAdsStats, type AdminAdsStatsPayload } from "@/lib/admin-api"

type StatsState = AdminAdsStatsPayload | null

export default function AdminAdsStatsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<StatsState>(null)

  const maxTrendCount = useMemo(() => {
    if (!stats?.trend?.length) return 1
    return Math.max(...stats.trend.map((item) => item.count), 1)
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
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "广告统计加载失败")
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
    <div className="space-y-6">
      <div className="admin-hero p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">广告数据</h1>
            <p className="mt-1 text-sm text-muted-foreground">查看广告位、广告内容和下载点击相关统计</p>
          </div>
        </div>
      </div>

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      {loading ? (
        <div className="admin-panel px-4 py-8 text-center text-sm text-muted-foreground">正在加载广告统计...</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="广告位总数" value={stats?.summary.totalSlots ?? 0} />
            <MetricCard title="启用广告位" value={stats?.summary.activeSlots ?? 0} />
            <MetricCard title="广告内容总数" value={stats?.summary.totalContents ?? 0} />
            <MetricCard title="启用广告内容" value={stats?.summary.activeContents ?? 0} />
            <MetricCard title="下载日志总数" value={stats?.summary.totalDownloadLogs ?? 0} />
            <MetricCard title="联盟点击总数" value={stats?.summary.totalCpsClicks ?? 0} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="admin-panel p-4">
              <h2 className="mb-4 text-sm font-semibold text-foreground">广告位内容分布</h2>
              {stats?.slots?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">广告位</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">类型</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">位置</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">状态</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">内容数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.slots.map((slot) => (
                        <tr key={slot.id} className="border-b border-border/60">
                          <td className="px-3 py-2 text-foreground">{slot.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{slot.type}</td>
                          <td className="px-3 py-2 text-muted-foreground">{slot.position}</td>
                          <td className="px-3 py-2 text-muted-foreground">{slot.isActive ? "启用" : "禁用"}</td>
                          <td className="px-3 py-2 text-right text-foreground">{slot._count.adContents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无广告位数据</div>
              )}
            </div>

            <div className="admin-panel p-4">
              <h2 className="mb-4 text-sm font-semibold text-foreground">近 7 天联盟点击趋势</h2>
              {stats?.trend?.length ? (
                <div className="space-y-3">
                  {stats.trend.map((item) => (
                    <div key={item.date} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.date}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary/80">
                        <div
                          className="h-full rounded-full bg-sky-600"
                          style={{ width: `${Math.max(4, Math.round((item.count / maxTrendCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">近 7 天暂无点击记录</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="admin-panel p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
    </div>
  )
}
