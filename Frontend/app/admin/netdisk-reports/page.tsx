"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { fetchAdminNetdiskReports, formatDateTime } from "@/lib/admin-api"
import type { NetdiskReportItem } from "@/lib/api"
import { cn } from "@/lib/utils"

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
  pending: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  handled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
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
        setError(nextError instanceof Error ? nextError.message : "网盘失效报告加载失败")
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50/80 to-pink-50/50 dark:from-rose-950/40 dark:to-pink-950/20 border border-rose-100 dark:border-rose-900">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">网盘失效报告</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">这里会显示用户反馈的失效下载链接，方便你按软件逐条查看和处理</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 01-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : null}

      {/* Stats Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="总数" value={stats.total} color="rose" />
        <StatCard label="待处理" value={stats.pending} color="orange" />
        <StatCard label="已处理" value={stats.handled} color="slate" />
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = item.key === activeFilter
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveFilter(item.key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-rose-200 dark:hover:border-rose-800",
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Report List */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">正在加载...</div>
        ) : visibleReports.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleReports.map((item) => {
              const appHref = item.app ? `/admin/apps/new?slug=${encodeURIComponent(item.app.slug)}` : null
              const publicHref = item.app ? `/software/${item.app.slug}` : null
              const iconValue = item.app?.icon || ""

              return (
                <article key={item.id} className="p-4 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <AppIcon value={iconValue} name={item.app?.name || item.appSlug} className="flex h-full w-full items-center justify-center" imageClassName="h-full w-full object-cover" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{item.app?.name || item.appSlug}</h2>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor[item.status]}`}>{statusLabelMap[item.status] || item.status}</span>
                          {item.netdiskName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">{item.netdiskName}</span>
                          )}
                        </div>
                        {item.reason && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.reason}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                          <span>{formatDateTime(item.createdAt)}</span>
                          {item.contact ? <span>联系：{item.contact}</span> : null}
                        </div>

                        {item.downloadUrl ? (
                          <p className="mt-3 break-all rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{item.downloadUrl}</p>
                        ) : null}

                        {item.adminNote ? (
                          <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-500">处理备注</p>
                            {item.adminNote}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {appHref ? (
                        <Link href={appHref} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                          去编辑
                        </Link>
                      ) : null}
                      {publicHref ? (
                        <Link href={publicHref} className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700 hover:shadow-md hover:shadow-rose-600/20">
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
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            当前没有符合条件的报告
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bgClass = {
    rose: "bg-gradient-to-br from-rose-50/80 to-pink-50/50 dark:from-rose-950/40 dark:to-pink-950/20 border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400",
    orange: "bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/40 dark:to-amber-950/20 border-orange-100 dark:border-orange-900 text-orange-600 dark:text-orange-400",
    slate: "bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/40 dark:to-gray-950/20 border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-400",
  }[color]

  return (
    <div className={`overflow-hidden rounded-2xl border ${bgClass}`}>
      <div className="p-4">
        <p className="text-sm opacity-80">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </div>
    </div>
  )
}
