"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Package } from "lucide-react"
import { AdminTable } from "@/components/admin/admin-table"
import { fetchAdminApps } from "@/lib/admin-api"

export default function AdminAppsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<Array<{ slug: string; name: string; status: string }>>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    fetchAdminApps()
      .then((items) => {
        if (!active) return
        setApps(items.map((item) => ({ slug: item.slug, name: item.name, status: item.status })))
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "软件数据加载失败。")
      })

    return () => {
      active = false
    }
  }, [])

  const rows = useMemo(
    () =>
      apps.map((item) => ({
        id: item.slug,
        title: item.name,
        type: "软件",
        author: "管理员",
        status: item.status || "published",
      })),
    [apps],
  )

  return (
    <>
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">软件管理</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">查看、编辑和维护站内软件条目</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : null}

      <AdminTable
        title=""
        description=""
        rows={rows}
        newLabel="新建软件"
        onNew={() => router.push("/admin/apps/new")}
        onEdit={(row) => router.push(`/admin/apps/new?slug=${encodeURIComponent(row.id || "")}`)}
        emptyText="还没有软件条目。"
      />
    </>
  )
}
