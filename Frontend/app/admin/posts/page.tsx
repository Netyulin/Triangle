"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table"
import { deleteAdminPost, fetchAdminPosts, saveAdminPost } from "@/lib/admin-api"

export default function AdminPostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Array<{ slug: string; title: string; author: string; status: string }>>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    fetchAdminPosts()
      .then((items) => {
        if (!active) return
        setPosts(items.map((item) => ({ slug: item.slug, title: item.title, author: item.author, status: item.status })))
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "文章数据加载失败。")
      })

    return () => {
      active = false
    }
  }, [])

  const rows = useMemo(
    () =>
      posts.map((item) => ({
        id: item.slug,
        title: item.title,
        type: "文章",
        author: item.author || "管理员",
        status: item.status || "published",
      })),
    [posts],
  )

  const handleDelete = async (row: AdminTableRow) => {
    if (!row.id) return
    if (!window.confirm(`确定删除文章“${row.title}”吗？`)) return

    setError("")

    try {
      await deleteAdminPost(row.id)
      setPosts((current) => current.filter((item) => item.slug !== row.id))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "文章删除失败。")
    }
  }

  const handleToggleVisibility = async (row: AdminTableRow) => {
    if (!row.id) return

    setError("")

    try {
      const nextStatus = row.status === "hidden" ? "published" : "hidden"
      await saveAdminPost(row.id, { status: nextStatus })
      setPosts((current) => current.map((item) => (item.slug === row.id ? { ...item, status: nextStatus } : item)))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "文章状态更新失败。")
    }
  }

  return (
    <div className="space-y-6">
      <div className="admin-hero">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">文章管理</h1>
              <p className="mt-1 text-sm text-muted-foreground">维护文章内容，并支持隐藏或删除现有条目。</p>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}

      <AdminTable
        title="文章列表"
        description="统一管理文章内容和显示状态。"
        rows={rows}
        newLabel="新建文章"
        onNew={() => router.push("/admin/posts/new")}
        onEdit={(row) => router.push(`/admin/posts/new?slug=${encodeURIComponent(row.id || "")}`)}
        onToggleVisibility={(row) => void handleToggleVisibility(row)}
        onDelete={(row) => void handleDelete(row)}
        emptyText="还没有文章内容。"
      />
    </div>
  )
}
