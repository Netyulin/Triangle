"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, ListChecks, Plus } from "lucide-react"
import { AdminTable, type AdminTableRow, type FilterTab } from "@/components/admin/admin-table"
import { PageHeader } from "@/components/admin/page-header"
import {
  deleteAdminPost,
  fetchAdminPosts,
  fetchAdminPostCategories,
  saveAdminPost,
} from "@/lib/admin-api"
import { toastSuccess, toastError } from "@/components/admin/toast"
import { confirmDelete, confirmHide, confirmShow } from "@/components/admin/confirm-dialog"

export default function AdminPostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Array<{ slug: string; title: string; author: string; status: string }>>([])
  const [error, setError] = useState("")
  // ====== Batch Mode ======
  const [batchMode, setBatchMode] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  // ====== Filter ======
  const [activeFilter, setActiveFilter] = useState("all")

  useEffect(() => {
    let active = true

    Promise.all([
      fetchAdminPosts().catch(() => []),
      fetchAdminPostCategories().catch(() => []),
    ]).then(([items, cats]) => {
      if (!active) return
      setPosts(items.map((item) => ({ slug: item.slug, title: item.title, author: item.author, status: item.status })))
      if (cats?.length) setCategories(cats.map(c => c.name))
    }).catch((nextError) => {
      if (!active) return
      setError(nextError instanceof Error ? nextError.message : "文章数据加载失败。")
    })

    return () => { active = false }
  }, [])

  const rows = useMemo(
    () => posts.map((item) => ({
        id: item.slug,
        title: item.title,
        type: "文章",
        author: item.author || "管理员",
        status: item.status || "published",
      })),
    [posts],
  )

  // Filter tabs with counts
  const filterTabs: FilterTab[] = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return [
      { key: "all", label: "全部", count: posts.length },
      { key: "published", label: "已发布", count: counts["published"] || 0 },
      { key: "hidden", label: "已隐藏", count: counts["hidden"] || 0 },
      { key: "draft", label: "草稿", count: counts["draft"] || 0 },
    ]
  }, [posts])

  // ====== Single actions ======
  const handleDelete = useCallback(async (row: AdminTableRow) => {
    if (!row.id) return
    const confirmed = await confirmDelete(row.title)
    if (!confirmed) return
    setError("")
    try {
      await deleteAdminPost(row.id)
      setPosts((current) => current.filter((item) => item.slug !== row.id))
      toastSuccess("删除成功", `文章"${row.title}"已删除`)
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "文章删除失败。"
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
      await saveAdminPost(row.id, { status: nextStatus })
      setPosts((current) => current.map((item) => (item.slug === row.id ? { ...item, status: nextStatus } : item)))
      toastSuccess(nextStatus === "hidden" ? "已隐藏" : "已显示", `文章"${row.title}"已${nextStatus === "hidden" ? "隐藏" : "显示"}`)
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "文章状态更新失败。"
      setError(msg)
      toastError("操作失败", msg)
    }
  }, [])

  // ====== Batch actions ======
  const handleBatchDelete = useCallback(async (ids: Array<string | number>) => {
    const confirmed = await confirmDelete(`${ids.length} 篇文章`)
    if (!confirmed) return
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await deleteAdminPost(String(id))
        ok++
        setPosts(prev => prev.filter(item => item.slug !== id))
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("批量删除完成", `成功删除 ${ok} 篇文章`)
    } else if (ok > 0) {
      toastError("部分删除失败", `成功 ${ok}/${ids.length}，部分项目删除失败`)
    } else {
      toastError("删除失败", "所有项目删除失败，请重试")
    }
  }, [])

  const handleBatchHide = useCallback(async (ids: Array<string | number>) => {
    const confirmed = await confirmHide(`${ids.length} 篇文章`)
    if (!confirmed) return
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await saveAdminPost(String(id), { status: "hidden" })
        ok++
        setPosts(prev => prev.map(item => item.slug === id ? { ...item, status: "hidden" } : item))
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("批量隐藏完成", `成功隐藏 ${ok} 篇文章`)
    } else if (ok > 0) {
      toastError("部分操作失败", `成功 ${ok}/${ids.length}，部分状态更新失败`)
    } else {
      toastError("操作失败", "所有操作失败，请重试")
    }
  }, [])

  const handleBatchShow = useCallback(async (ids: Array<string | number>) => {
    const confirmed = await confirmShow(`${ids.length} 篇文章`)
    if (!confirmed) return
    setError("")
    let ok = 0
    for (const id of ids) {
      try {
        await saveAdminPost(String(id), { status: "published" })
        ok++
        setPosts(prev => prev.map(item => item.slug === id ? { ...item, status: "published" } : item))
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("批量显示完成", `成功显示 ${ok} 篇文章`)
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
        await saveAdminPost(String(id), { category })
        ok++
      } catch {}
    }
    if (ok === ids.length) {
      toastSuccess("移动完成", `成功将 ${ok} 篇文章移动到"${category}"`)
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
        title="文章管理"
        description="维护文章内容，并支持隐藏或利除现有条目"
        icon={<FileText className="h-5 w-5" />}
        iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        actions={
          <button
            onClick={() => router.push("/admin/posts/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            新建文章
          </button>
        }
      />

      {/* Batch mode toggle */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setBatchMode(prev => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${batchMode ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
        >
          <ListChecks className="h-4 w-4" />
          {batchMode ? "退出批量模式" : "批量操作"}
        </button>
        {batchMode && <span className="text-xs text-muted-foreground">选择多项后在底部操作</span>}
      </div>

      {error ? <div role="alert" className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <AdminTable
        title="文章列表"
        description="统一管理文章内容和显示状态"
        rows={rows}
        newLabel="新建文章"
        onNew={() => router.push("/admin/posts/new")}
        onEdit={(row) => router.push("/admin/posts/new?slug=" + encodeURIComponent(String(row.id || "")))}
        onToggleVisibility={(row) => void handleToggleVisibility(row)}
        onDelete={(row) => void handleDelete(row)}
        emptyText="还没有文章内容。"
        batchMode={batchMode}
        onBatchDelete={handleBatchDelete}
        onBatchHide={handleBatchHide}
        onBatchShow={handleBatchShow}
        onBatchMoveCategory={handleBatchMoveCategory}
        categoryOptions={categories}
        // New features
        searchable={true}
        searchPlaceholder="搜索文章标题、作者..."
        filterTabs={filterTabs}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortable={true}
        pageSize={10}
      />
    </div>
  )
}
