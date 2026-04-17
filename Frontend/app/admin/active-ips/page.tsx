"use client"

import { useEffect, useMemo, useState } from "react"
import { Globe, Search } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { fetchAdminActiveIps, type AdminActiveIpItem } from "@/lib/admin-api"
import { formatDateTime } from "@/lib/admin-api"

const PAGE_SIZE = 20

export default function AdminActiveIpsPage() {
  const [keywordInput, setKeywordInput] = useState("")
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [list, setList] = useState<AdminActiveIpItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let active = true
    const loadData = async () => {
      setLoading(true)
      setError("")
      try {
        const data = await fetchAdminActiveIps({ page, pageSize: PAGE_SIZE, keyword })
        if (!active) return
        setList(data.list ?? [])
        setTotal(data.total ?? 0)
        setTotalPages(Math.max(data.totalPages ?? 1, 1))
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
  }, [keyword, page])

  const pageText = useMemo(() => `第 ${page} / ${Math.max(totalPages, 1)} 页`, [page, totalPages])

  return (
    <div className="space-y-5">
      <PageHeader
        title="活跃 IP 列表"
        description="展示站点访问来源 IP，支持分页与关键词搜索（IP / 地区）。"
        icon={<Globe className="h-5 w-5" />}
        iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <section className="admin-panel space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">共 {total} 个活跃 IP</div>
          <form
            className="flex w-full max-w-md items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setKeyword(keywordInput.trim())
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="输入 IP 或地区关键词"
                className="admin-input pl-9"
              />
            </div>
            <button type="submit" className="admin-primary-btn px-4 py-2.5 text-sm">
              搜索
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">地区</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">访问次数</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">首次访问</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">最近访问</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    正在加载...
                  </td>
                </tr>
              ) : list.length > 0 ? (
                list.map((item) => (
                  <tr key={`${item.ip}-${item.lastSeenAt}`} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-mono text-foreground">{item.ip}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.region || "未知地区"}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{item.views}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.firstSeenAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.lastSeenAt)}</td>
                  </tr>
                ))
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
