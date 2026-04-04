"use client"

import { PencilLine, Trash2, Plus } from "lucide-react"
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
}

function statusClass(status: string) {
  if (status === "published" || status === "done") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
  if (status === "processing") return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800"
  if (status === "pending" || status === "draft") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  if (status === "rejected" || status === "archived") return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
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
}: AdminTableProps) {
  return (
    <section className="admin-panel p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {onNew ? (
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            {newLabel}
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.9fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <span>标题</span>
            <span>类型</span>
            <span>作者</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.id || `${row.title}-${index}`}
              className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.9fr] items-center border-t border-slate-200 bg-white px-4 py-4 text-sm transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:bg-transparent dark:hover:bg-slate-900/40"
            >
              <span className="font-semibold text-slate-900 dark:text-white">{row.title}</span>
              <span className="text-slate-500 dark:text-slate-400">{row.type}</span>
              <span className="text-slate-500 dark:text-slate-400">{row.author}</span>
              <span>
                <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", statusClass(row.status))}>{row.status}</span>
              </span>
              <div className="flex items-center gap-2">
                {onEdit ? (
                  <button
                    onClick={() => onEdit(row)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/40"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    编辑
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    onClick={() => onDelete(row)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-muted-panel border-dashed px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyText}
        </div>
      )}
    </section>
  )
}
