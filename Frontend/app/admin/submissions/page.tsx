"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquareMore, Trash2, XCircle } from "lucide-react"
import { deleteAdminRequest, fetchAdminRequests, formatDateTime, updateAdminRequest } from "@/lib/admin-api"
import type { RequestItem } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/admin/page-header"

const statusMap = {
  pending: "待处理",
  processing: "处理中",
  done: "已完成",
  rejected: "已关闭",
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  processing: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  rejected: "bg-secondary text-muted-foreground border-border",
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

  const handleDelete = async (request: RequestItem) => {
    if (!window.confirm(`确定删除需求“${request.title}”吗？该操作不可恢复。`)) return
    await deleteAdminRequest(request.id)
    await load(activeFilter === "all" ? "" : activeFilter)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="需求管理"
        description="处理用户提交的软件需求，修改状态和回复都会直接写回后台。"
        icon={<MessageSquareMore className="h-5 w-5" />}
        iconClassName="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="总需求" value={stats.total} />
        <StatCard label="待处理" value={stats.pending} />
        <StatCard label="处理中" value={stats.processing} />
        <StatCard label="已完成" value={stats.done} />
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = item.key === activeFilter
          const href = item.key === "all" ? "/admin/submissions" : `/admin/submissions?status=${item.key}`
          return (
            <a
              key={item.key}
              href={href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                active ? "admin-pill-active" : "admin-pill-idle",
              )}
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto admin-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">回复需求</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-muted-foreground transition hover:text-foreground">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">需求标题</p>
                <p className="mt-1 font-semibold text-foreground">{selectedRequest.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">用户描述</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{selectedRequest.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">你的回复</p>
                <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={5} className={inputClass} placeholder="写下给用户的回复..." />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedRequest(null)} className="admin-secondary-btn px-4 py-2.5">
                取消
              </button>
              <button onClick={handleReply} disabled={!replyText.trim()} className="admin-primary-btn px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50">
                提交回复
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="admin-panel overflow-hidden">
        {requests.length ? (
          <div className="divide-y divide-border">
            {requests.map((item) => (
              <div key={item.id} className="p-4 transition-colors hover:bg-secondary/40">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusColor[item.status])}>{statusMap[item.status]}</span>
                    </div>
                    {item.description ? <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{item.authorName}</span>
                      <span>·</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                      {item.repliedAt ? (
                        <>
                          <span>·</span>
                          <span>已回复于 {formatDateTime(item.repliedAt)}</span>
                        </>
                      ) : null}
                    </div>
                    {item.adminReply ? (
                      <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3 text-sm text-foreground/80">
                        <span className="font-medium text-foreground">管理员回复：</span>
                        <span> {item.adminReply}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(event) => void handleStatusChange(item, event.target.value as RequestItem["status"])}
                      className={cn(inputClassSmall, "w-auto min-w-[140px]")}
                    >
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
                      className="admin-primary-btn px-4 py-2"
                    >
                      {item.adminReply ? "编辑回复" : "回复"}
                    </button>
                    <button
                      onClick={() => void handleDelete(item)}
                      className="admin-secondary-btn px-4 py-2 text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">当前筛选下还没有需求。</div>
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

const inputClass = "admin-input"
const inputClassSmall = "admin-input-sm"
