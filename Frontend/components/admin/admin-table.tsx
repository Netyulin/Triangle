"use client"

import { EyeOff, PencilLine, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type AdminTableRow = {
  id?: string
  title: string
  type: string
  author: string
  status: string
}

type AdminTableProps = {
  title: string
  description?: string
  rows: AdminTableRow[]
  emptyText?: string
  newLabel?: string
  onNew?: () => void
  onEdit?: (row: AdminTableRow) => void
  onDelete?: (row: AdminTableRow) => void
  onToggleVisibility?: (row: AdminTableRow) => void
}

function statusClass(status: string) {
  if (status === "published" || status === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
  if (status === "processing") return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50"
  if (status === "pending" || status === "draft") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50"
  if (status === "rejected" || status === "archived" || status === "hidden") return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
}

function statusLabel(status: string) {
  if (status === "published") return "已发布"
  if (status === "hidden") return "已隐藏"
  if (status === "archived") return "已归档"
  if (status === "pending") return "待处理"
  if (status === "processing") return "处理中"
  if (status === "done") return "已完成"
  if (status === "rejected") return "已拒绝"
  if (status === "draft") return "草稿"
  if (status === "active") return "正常"
  if (status === "disabled") return "已禁用"
  if (status === "banned") return "已封禁"
  return status || "-"
}

export function AdminTable({
  title,
  description,
  rows,
  emptyText = "当前还没有内容。",
  newLabel = "新建",
  onNew,
  onEdit,
  onDelete,
  onToggleVisibility,
}: AdminTableProps) {
  return (
    <section className="admin-panel p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {onNew ? (
          <button onClick={onNew} className="admin-primary-btn">
            <Plus className="h-4 w-4" />
            {newLabel}
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_1.1fr] bg-secondary/60 px-4 py-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground">
            <span>标题</span>
            <span>类型</span>
            <span>作者</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.id || `${row.title}-${index}`}
              className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_1.1fr] items-center border-t border-border bg-card px-4 py-4 text-sm transition-colors hover:bg-secondary/40 dark:hover:bg-slate-900/35"
            >
              <span className="font-semibold text-foreground">{row.title}</span>
              <span className="text-muted-foreground">{row.type}</span>
              <span className="text-muted-foreground">{row.author}</span>
              <span>
                <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", statusClass(row.status))}>{statusLabel(row.status)}</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {onEdit ? (
                  <button onClick={() => onEdit(row)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent/25 hover:text-accent">
                    <PencilLine className="h-3.5 w-3.5" />
                    编辑
                  </button>
                ) : null}
                {onToggleVisibility ? (
                  <button onClick={() => onToggleVisibility(row)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-sky-300 hover:text-sky-600">
                    <EyeOff className="h-3.5 w-3.5" />
                    {row.status === "hidden" ? "显示" : "隐藏"}
                  </button>
                ) : null}
                {onDelete ? (
                  <button onClick={() => onDelete(row)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-rose-300 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-muted-panel border-dashed px-6 py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
      )}
    </section>
  )
}
