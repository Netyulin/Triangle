"use client"

import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Skeleton – 加载骨架屏组件                                          */
/*  用于表格、卡片、表单的加载占位状态                                   */
/* ------------------------------------------------------------------ */

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700",
        className
      )}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  预设骨架布局                                                       */
/* ------------------------------------------------------------------ */

/** 统计卡片骨架 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-3 h-3 w-16" />
      <Skeleton className="mt-2 h-8 w-20" />
    </div>
  )
}

/** 表格行骨架 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="h-4 w-4 rounded" />
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1 rounded" />
      ))}
    </div>
  )
}

/** 表格骨架 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-4 rounded" />
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  )
}

/** 页面标题骨架 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1.5 h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-9 w-24 rounded-xl" />
    </div>
  )
}

/** 图表骨架 */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="w-full rounded-xl" style={{ height }} />
    </div>
  )
}

/** 表单字段骨架 */
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

/** 详情卡片骨架 */
export function DetailCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-5 w-24" />
      <div className="mt-4 space-y-3">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
    </div>
  )
}
