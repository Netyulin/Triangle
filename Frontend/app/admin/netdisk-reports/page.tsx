"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { fetchAdminNetdiskReports, formatDateTime } from "@/lib/admin-api"
import type { NetdiskReportItem } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/admin/page-header"

const filters = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "handled", label: "已处理" },
]

const statusLabelMap: Record<string, string> = {
  pending: "待处理",
  handled: "已处理",
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  handled: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
}

export default function AdminNetdiskReportsPage() {
  const [reports, setReports] = useState<NetdiskReportItem[]>([])
  const [activeFilter, setActiveFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    fetchAdminNetdiskReports(100)
      .then((payload) => {
        if (!active) return
        setReports(payload.list || [])
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "网盘失效举报加载失败。")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const visibleReports = useMemo(() => {
    if (activeFilter === "all") return reports
    return reports.filter((item) => item.status === activeFilter)
  }, [activeFilter, reports])

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((item) => item.status === "pending").length,
      handled: reports.filter((item) => item.status === "handled").length,
    }),
    [reports],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="失效报告"
        description="这里会显示用户反馈的失效下载链接，方便逐条查看和处理。"
        icon={<AlertTriangle className="h-5 w-5" />}
        iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="总数" value={stats.total} />
        <StatCard label="待处理" value={stats.pending} />
        <StatCard label="已处理" value={stats.handled} />
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = item.key === activeFilter
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveFilter(item.key)}
              className={cn("rounded-full px-4 py-2 text-sm font-medium transition", active ? "admin-pill-active" : "admin-pill-idle")}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <section className="admin-panel overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">正在加载...</div>
        ) : visibleReports.length ? (
          <div className="divide-y divide-border">
            {visibleReports.map((item) => {
              const appHref = item.app ? `/admin/apps/new?slug=${encodeURIComponent(item.app.slug)}` : null
              const publicHref = item.app ? `/software/${item.app.slug}` : null
              const iconValue = item.app?.icon || ""

              return (
                <article key={item.id} className="p-4 transition-colors hover:bg-secondary/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-border bg-secondary/40">
                        <AppIcon value={iconValue} name={item.app?.name || item.appSlug} className="flex h-full w-full items-center justify-center" imageClassName="h-full w-full object-cover" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-foreground">{item.app?.name || item.appSlug}</h2>
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusColor[item.status])}>{statusLabelMap[item.status] || item.status}</span>
                          {item.netdiskName ? <span className="text-xs text-muted-foreground">{item.netdiskName}</span> : null}
                        </div>
                        {item.reason ? <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p> : null}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDateTime(item.createdAt)}</span>
                          {item.contact ? <span>联系：{item.contact}</span> : null}
                        </div>

                        {item.downloadUrl ? (
                          <p className="mt-3 break-all rounded-2xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">{item.downloadUrl}</p>
                        ) : null}

                        {item.adminNote ? (
                          <div className="mt-3 rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground/80">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">处理备注</p>
                            {item.adminNote}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {appHref ? (
                        <Link href={appHref} className="admin-secondary-btn inline-flex items-center gap-1 px-4 py-2">
                          去编辑
                        </Link>
                      ) : null}
                      {publicHref ? (
                        <Link href={publicHref} className="admin-primary-btn inline-flex items-center gap-1 px-4 py-2">
                          前台查看
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            当前没有符合条件的举报。
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-panel px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </div>
  )
}
