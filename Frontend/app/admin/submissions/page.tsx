"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { XCircle, MessageSquareMore } from "lucide-react"
import { fetchAdminRequests, formatDateTime, updateAdminRequest } from "@/lib/admin-api"
import type { RequestItem } from "@/lib/api"
import { cn } from "@/lib/utils"

const statusMap = {
  pending: "待处理",
  processing: "处理中",
  done: "已完成",
  rejected: "已关闭",
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  processing: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  rejected: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
}

const filters = [
  { key: "all", label: "全部需求" },
  { key: "pending", label: "待处理" },
  { key: "processing", label: "处理中" },
  { key: "done", label: "已完成" },
  { key: "rejected", label: "已关闭" },
]

export default function AdminSubmissionsPage() {
  const searchParams = useSearchParams()
  const activeFilter = searchParams.get("status") || "all"
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null)
  const [replyText, setReplyText] = useState("")
  const [error, setError] = useState("")

  const load = async (status = "") => {
    try {
      const response = await fetchAdminRequests(status)
      setRequests(response.list)
      setError("")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "需求数据加载失败。")
    }
  }

  useEffect(() => {
    void load(activeFilter === "all" ? "" : activeFilter)
  }, [activeFilter])

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((item) => item.status === "pending").length,
      processing: requests.filter((item) => item.status === "processing").length,
      done: requests.filter((item) => item.status === "done").length,
    }),
    [requests],
  )

  const handleReply = async () => {
    if (!selectedRequest || !replyText.trim()) return
    await updateAdminRequest(selectedRequest.id, { status: "done", adminReply: replyText })
    setSelectedRequest(null)
    setReplyText("")
    await load(activeFilter === "all" ? "" : activeFilter)
  }

  const handleStatusChange = async (request: RequestItem, status: RequestItem["status"]) => {
    await updateAdminRequest(request.id, { status })
    await load(activeFilter === "all" ? "" : activeFilter)
  }

  return (
    <>
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-100 dark:border-amber-900">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-lg shadow-amber-600/20">
              <MessageSquareMore className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">用户需求管理</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">处理用户提交的软件需求，修改状态和回复都会直接写回后台</p>
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
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="总需求" value={stats.total} color="amber" />
        <StatCard label="待处理" value={stats.pending} color="orange" />
        <StatCard label="处理中" value={stats.processing} color="sky" />
        <StatCard label="已完成" value={stats.done} color="emerald" />
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = item.key === activeFilter
          const href = item.key === "all" ? "/admin/submissions" : `/admin/submissions?status=${item.key}`
          return (
            <a
              key={item.key}
              href={href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-amber-200 dark:hover:border-amber-800",
              )}
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {/* Reply Modal */}
      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">回复需求</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">需求标题</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedRequest.title}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">用户描述</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{selectedRequest.description}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">你的回复</p>
                <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={5} className={inputClass} placeholder="写下给用户的回复..." />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedRequest(null)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                取消
              </button>
              <button onClick={handleReply} disabled={!replyText.trim()} className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-700 hover:shadow-md hover:shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                提交回复
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Request List */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        {requests.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {requests.map((item) => (
              <div key={item.id} className="p-4 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h2>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor[item.status]}`}>{statusMap[item.status]}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                      <span>by {item.authorName}</span>
                      <span>•</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                      {item.repliedAt ? (
                        <>
                          <span>•</span>
                          <span>已回复于 {formatDateTime(item.repliedAt)}</span>
                        </>
                      ) : null}
                    </div>
                    {item.adminReply ? (
                      <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">管理员回复：</span>
                        <span className="text-slate-600 dark:text-slate-400"> {item.adminReply}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={item.status} onChange={(event) => void handleStatusChange(item, event.target.value as RequestItem["status"])} className={inputClassSmall}>
                      <option value="pending">待处理</option>
                      <option value="processing">处理中</option>
                      <option value="done">已完成</option>
                      <option value="rejected">已关闭</option>
                    </select>
                    <button
                      onClick={() => {
                        setSelectedRequest(item)
                        setReplyText(item.adminReply || "")
                      }}
                      className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-700"
                    >
                      {item.adminReply ? "编辑回复" : "回复"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">当前筛选下还没有需求。</div>
        )}
      </section>
    </>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bgClass = {
    amber: "bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400",
    orange: "bg-gradient-to-br from-orange-50/80 to-red-50/50 dark:from-orange-950/40 dark:to-red-950/20 border-orange-100 dark:border-orange-900 text-orange-600 dark:text-orange-400",
    sky: "bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-sky-950/40 dark:to-cyan-950/20 border-sky-100 dark:border-sky-900 text-sky-600 dark:text-sky-400",
    emerald: "bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/40 dark:to-green-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400",
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

const inputClass = "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:focus:border-amber-500 dark:focus:ring-amber-500/20 text-slate-900 dark:text-slate-100"

const inputClassSmall = "rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-slate-100"
