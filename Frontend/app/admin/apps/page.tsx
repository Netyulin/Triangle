"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ListChecks, Package, Plus } from "lucide-react"
import { AdminTable, type AdminTableRow, type FilterTab } from "@/components/admin/admin-table"
import { PageHeader } from "@/components/admin/page-header"
import {
  deleteAdminApp,
  fetchAdminApps,
  fetchAdminAppCategories,
  saveAdminApp,
} from "@/lib/admin-api"
import { toastSuccess, toastError } from "@/components/admin/toast"
import { confirmDelete, confirmHide, confirmShow } from "@/components/admin/confirm-dialog"

export default function AdminAppsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<Array<{ slug: string; name: string; status: string }>>([])
  const [error, setError] = useState("")
  // ====== Batch Mode ======
  const [batchMode, setBatchMode] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  // ====== Filter ======
  const [activeFilter, setActiveFilter] = useState("all")

  useEffect(() => {
    let active = true

    Promise.all([
      fetchAdminApps().catch(() => []),
      fetchAdminAppCategories().catch(() => []),
    ]).then(([items, cats]) => {
      if (!active) return
      setApps(items.map((item) => ({ slug: item.slug, name: item.name, status: item.status })))
      if (cats?.length) setCategories(cats.map(c => c.name))
    }).catch((nextError) => {
      if (!active) return
      setError(nextError instanceof Error ? nextError.message : "软件数据加载失败。")
    })

    return () => { active = false }
  }, [])

  const rows = useMemo(
    () => apps.map((item) => ({
        id: item.slug,
        title: item.name,
        type: "软件",
        author: "管理员",
        status: item.status || "published",
      })),
    [apps],
  )

  // Filter tabs with counts
  const filterTabs: FilterTab[] = useMemo(() => {
    const counts = apps.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return [
      { key: "all", label: "全部", count: apps.length },
      { key: "published", label: "已发布", count: counts["published"] || 0 },
      { key: "hidden", label: "已隐藏", count: counts["hidden"] || 0 },
      { key: "draft", label: "草稿", count: counts["draft"] || 0 },
    ]
  }, [apps])

  // ====== Single actions ======
  const handleDelete = useCallback(async (row: AdminTableRow) => {
    if (!row.id) return
    const confirmed = await confirmDelete(row.title)
    if (!confirmed) return
    setError("")
    try {
      await deleteAdminApp(row.id)
      setApps((current) => current.filter((item) => item.slug !== row.id))
      toastSuccess("删除成功", `软件"${row.title}"已删除`)
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "软件删除失败。"
      setError(msg)
      toastError("删除失败", msg)
    }
  }, [])

  const handleToggleVisibility = useCallback(async (row: AdminTableRow) => {
    if (!row.id) return
    const nextStatus = row.status === "hidden" ? "published" : "hidden"
    const confirmed = nextStatus === "hidden" 
      ? await confirmHide(row.title)
      : await confirmShow(row.title)
    if (!confirmed) return
    setError("")
    try {
      await saveAdminApp(row.id, { status: nextStatus })
      setApps((current) => current.map((item) => (item.slug === row.id ? { ...item, status: nextStatus } : item)))
      toastSuccess(nextStatus === "hidden" ? "已隐藏" : "已显示", `软件"${row.title}"已${nextStatus === "hidden" ? "隐藏" : "显示"}`)
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "软件状态更新失败。"
      setError(msg)
      toastError("操作失败", msg)
    }
  }, [])

  // ====== Batch actions ======
  const handleBatchDelete = useCallback(async (ids: Array<string | number>) => {
    const confirmed = await confirmDelete(`${ids.length} 个软件`)
    if (!confirmed) return
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await deleteAdminApp(String(id))
        ok++
        setApps(prev => prev.filter(item => item.slug !== id))
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("批量删除完成", `成功删除 ${ok} 个软件`)
    } else if (ok > 0) {
      toastError("部分删除失败", `成功 ${ok}/${ids.length}，部分项目删除失败`)
    } else {
      toastError("删除失败", "所有项目删除失败，请重试")
    }
  }, [])

  const handleBatchHide = useCallback(async (ids: Array<string | number>) => {
    const confirmed = await confirmHide(`${ids.length} 个软件`)
    if (!confirmed) return
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await saveAdminApp(String(id), { status: "hidden" })
        ok++
        setApps(prev => prev.map(item => item.slug === id ? { ...item, status: "hidden" } : item))
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("批量隐藏完成", `成功隐藏 ${ok} 个软件`)
    } else if (ok > 0) {
      toastError("部分操作失败", `成功 ${ok}/${ids.length}，部分状态更新失败`)
    } else {
      toastError("操作失败", "所有操作失败，请重试")
    }
  }, [])

  const handleBatchShow = useCallback(async (ids: Array<string | number>) => {
    const confirmed = await confirmShow(`${ids.length} 个软件`)
    if (!confirmed) return
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await saveAdminApp(String(id), { status: "published" })
        ok++
        setApps(prev => prev.map(item => item.slug === id ? { ...item, status: "published" } : item))
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("批量显示完成", `成功显示 ${ok} 个软件`)
    } else if (ok > 0) {
      toastError("部分操作失败", `成功 ${ok}/${ids.length}，部分状态更新失败`)
    } else {
      toastError("操作失败", "所有操作失败，请重试")
    }
  }, [])

  const handleBatchMoveCategory = useCallback(async (ids: Array<string | number>, category: string) => {
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await saveAdminApp(String(id), { category })
        ok++
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("移动完成", `成功将 ${ok} 个软件移动到"${category}"`)
    } else if (ok > 0) {
      toastError("部分移动失败", `成功 ${ok}/${ids.length}，部分移动失败`)
    } else {
      toastError("移动失败", "所有移动操作失败，请重试")
    }
  }, [])

  return (
    <div className="space-y-5">
      {/* PageHeader 替代原 Hero */}
      <PageHeader
        title="软件管理"
        description="查看、编辑、隐藏和删除站内软件内容"
        icon={<Package className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"
        actions={
          <button
            onClick={() => router.push("/admin/apps/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            新建软件
          </button>
        }
      />

      {/* Batch mode toggle */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setBatchMode(prev => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${batchMode ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
        >
          <ListChecks className={`h-4 w-4 transition-transform ${batchMode ? 'rotate-0' : ''}`} />
          {batchMode ? "退出批量模式" : "批量操作"}
        </button>
        {batchMode && (
          <span className="text-xs text-muted-foreground">
            选择多项后在底部操作
          </span>
        )}
      </div>

      {error ? <div role="alert" className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <AdminTable
        title="软件列表"
        description="维护站内软件条目，支持快速编辑、上下架和删除"
        rows={rows}
        newLabel="新建软件"
        onNew={() => router.push("/admin/apps/new")}
        onEdit={(row) => router.push("/admin/apps/new?slug=" + encodeURIComponent(String(row.id || "")))}
        onToggleVisibility={(row) => void handleToggleVisibility(row)}
        onDelete={(row) => void handleDelete(row)}
        emptyText="还没有软件条目。"
        batchMode={batchMode}
        onBatchDelete={handleBatchDelete}
        onBatchHide={handleBatchHide}
        onBatchShow={handleBatchShow}
        onBatchMoveCategory={handleBatchMoveCategory}
        categoryOptions={categories}
        // New features
        searchable={true}
        searchPlaceholder="搜索软件名称..."
        filterTabs={filterTabs}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortable={true}
        pageSize={10}
      />
    </div>
  )
}
