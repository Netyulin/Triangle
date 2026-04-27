"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Globe, Search } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import {
  fetchAdminActiveIps,
  formatDateTime,
  type AdminActiveIpDateItem,
  type AdminActiveIpItem,
  type AdminActiveIpRegionItem,
  type AdminActiveIpView,
} from "@/lib/admin-api"

const PAGE_SIZE = 20
const VIEW_OPTIONS: Array<{ value: AdminActiveIpView; label: string }> = [
  { value: "recent", label: "最近访问" },
  { value: "date", label: "按日期" },
  { value: "region", label: "来源区域" },
  { value: "cumulative", label: "按累计访问" },
]

function getTodayText() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function AdminActiveIpsPage() {
  const [keywordInput, setKeywordInput] = useState("")
  const [keyword, setKeyword] = useState("")
  const [selectedDateInput, setSelectedDateInput] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [view, setView] = useState<AdminActiveIpView>("recent")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [list, setList] = useState<Array<AdminActiveIpItem | AdminActiveIpRegionItem | AdminActiveIpDateItem>>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({ totalViews: 0, uniqueIpCount: 0, selectedDate: null as string | null })

  useEffect(() => {
    let active = true
    const loadData = async () => {
      setLoading(true)
      setError("")
      try {
        const data = await fetchAdminActiveIps({ page, pageSize: PAGE_SIZE, keyword, view, date: selectedDate })
        if (!active) return
        setList(data.list ?? [])
        setTotal(data.total ?? 0)
        setTotalPages(Math.max(data.totalPages ?? 1, 1))
        setSummary(data.summary ?? { totalViews: 0, uniqueIpCount: 0, selectedDate: null })
      } catch (nextError) {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "活跃 IP 数据加载失败")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [keyword, page, view, selectedDate])

  const pageText = useMemo(() => `第 ${page} / ${Math.max(totalPages, 1)} 页`, [page, totalPages])
  const selectedDateText = summary.selectedDate || selectedDate || ""

  return (
    <div className="space-y-5">
      <PageHeader
        title="活跃 IP 分析"
        description="支持按日期筛选，并从最近访问、日期、来源区域、累计访问几个维度查看。"
        icon={<Globe className="h-5 w-5" />}
        iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="admin-panel p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">累计访问量</div>
          <div className="mt-2 text-3xl font-black text-foreground">{summary.totalViews}</div>
        </div>
        <div className="admin-panel p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">独立 IP</div>
          <div className="mt-2 text-3xl font-black text-foreground">{summary.uniqueIpCount}</div>
        </div>
        <div className="admin-panel p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">当前日期范围</div>
          <div className="mt-2 text-lg font-bold text-foreground">{selectedDateText || "全部日期"}</div>
        </div>
      </section>

      <section className="admin-panel space-y-4 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPage(1)
                  setView(option.value)
                }}
                className={view === option.value ? "admin-primary-btn px-4 py-2 text-sm" : "admin-secondary-btn px-4 py-2 text-sm"}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form
            className="flex flex-col gap-2 lg:flex-row lg:items-center"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setKeyword(keywordInput.trim())
              setSelectedDate(selectedDateInput.trim())
            }}
          >
            <label className="relative min-w-[180px]">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={selectedDateInput}
                onChange={(event) => setSelectedDateInput(event.target.value)}
                className="admin-input pl-10"
              />
            </label>
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder={view === "date" ? "输入日期或小时关键词" : "输入 IP 或地区关键词"}
                className="admin-input pl-9"
              />
            </div>
            <button type="submit" className="admin-primary-btn px-4 py-2.5 text-sm">
              应用筛选
            </button>
            <button
              type="button"
              className="admin-secondary-btn px-4 py-2.5 text-sm"
              onClick={() => {
                setPage(1)
                setKeyword("")
                setKeywordInput("")
                setSelectedDate("")
                setSelectedDateInput("")
              }}
            >
              清空
            </button>
            <button
              type="button"
              className="admin-secondary-btn px-4 py-2.5 text-sm"
              onClick={() => {
                const today = getTodayText()
                setPage(1)
                setSelectedDateInput(today)
                setSelectedDate(today)
              }}
            >
              今天
            </button>
          </form>
        </div>

        <div className="text-sm text-muted-foreground">
          当前共 {total} 条记录
          {selectedDateText ? `，已筛选日期 ${selectedDateText}` : "，正在查看全部日期"}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              {view === "region" ? (
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">来源区域</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">累计访问</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">独立 IP</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">最近访问</th>
                </tr>
              ) : view === "date" ? (
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{selectedDateText ? "小时" : "日期"}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">访问次数</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">独立 IP</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">首条记录</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">最后记录</th>
                </tr>
              ) : (
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">地区</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{view === "cumulative" ? "累计访问" : "访问次数"}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">首次访问</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">最近访问</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    正在加载...
                  </td>
                </tr>
              ) : list.length > 0 ? (
                view === "region" ? (
                  (list as AdminActiveIpRegionItem[]).map((item) => (
                    <tr key={`${item.region}-${item.lastSeenAt}`} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-foreground">{item.region || "未知地区"}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{item.views}</td>
                      <td className="px-4 py-3 text-foreground">{item.uniqueIps}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.lastSeenAt)}</td>
                    </tr>
                  ))
                ) : view === "date" ? (
                  (list as AdminActiveIpDateItem[]).map((item) => (
                    <tr key={`${item.label}-${item.lastSeenAt}`} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-foreground">{item.label}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{item.views}</td>
                      <td className="px-4 py-3 text-foreground">{item.uniqueIps}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.firstSeenAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.lastSeenAt)}</td>
                    </tr>
                  ))
                ) : (
                  (list as AdminActiveIpItem[]).map((item) => (
                    <tr key={`${item.ip}-${item.lastSeenAt}`} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-foreground">{item.ip}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.region || "未知地区"}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{item.views}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.firstSeenAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.lastSeenAt)}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    暂无匹配数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pageText}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="admin-secondary-btn px-3 py-2 text-sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
            >
              上一页
            </button>
            <button
              type="button"
              className="admin-secondary-btn px-3 py-2 text-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
            >
              下一页
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
