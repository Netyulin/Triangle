"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Package } from "lucide-react"
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table"
import { deleteAdminApp, fetchAdminApps, saveAdminApp } from "@/lib/admin-api"

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

  const handleDelete = async (row: AdminTableRow) => {
    if (!row.id) return
    if (!window.confirm(`确定删除软件“${row.title}”吗？`)) return

    setError("")

    try {
      await deleteAdminApp(row.id)
      setApps((current) => current.filter((item) => item.slug !== row.id))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "软件删除失败。")
    }
  }

  const handleToggleVisibility = async (row: AdminTableRow) => {
    if (!row.id) return

    setError("")

    try {
      const nextStatus = row.status === "hidden" ? "published" : "hidden"
      await saveAdminApp(row.id, { status: nextStatus })
      setApps((current) => current.map((item) => (item.slug === row.id ? { ...item, status: nextStatus } : item)))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "软件状态更新失败。")
    }
  }

  return (
    <div className="space-y-6">
      <div className="admin-hero">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">软件管理</h1>
              <p className="mt-1 text-sm text-muted-foreground">查看、编辑、隐藏和删除站内软件内容。</p>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <AdminTable
        title="软件列表"
        description="维护站内软件条目，支持快速编辑、上下架和删除。"
        rows={rows}
        newLabel="新建软件"
        onNew={() => router.push("/admin/apps/new")}
        onEdit={(row) => router.push(`/admin/apps/new?slug=${encodeURIComponent(row.id || "")}`)}
        onToggleVisibility={(row) => void handleToggleVisibility(row)}
        onDelete={(row) => void handleDelete(row)}
        emptyText="还没有软件条目。"
      />
    </div>
  )
}
