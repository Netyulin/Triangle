"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Images, Pencil, Plus, Trash2 } from "lucide-react"
import {
  createAdminAdContent,
  deleteAdminAdContent,
  fetchAdminAdContents,
  fetchAdminAdSlots,
  updateAdminAdContent,
  type AdminAdContent,
  type AdminAdSlot,
} from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

type ContentForm = {
  slotId: string
  title: string
  description: string
  imageUrl: string
  targetUrl: string
  ctaText: string
  advertiser: string
  priority: string
  isActive: boolean
}

const initialForm: ContentForm = {
  slotId: "",
  title: "",
  description: "",
  imageUrl: "",
  targetUrl: "",
  ctaText: "了解更多",
  advertiser: "",
  priority: "0",
  isActive: true,
}

export default function AdminAdContentsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [items, setItems] = useState<AdminAdContent[]>([])
  const [slots, setSlots] = useState<AdminAdSlot[]>([])
  const [search, setSearch] = useState("")
  const [slotFilter, setSlotFilter] = useState("")
  const [createForm, setCreateForm] = useState<ContentForm>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ContentForm>(initialForm)

  const slotMap = useMemo(() => new Map(slots.map((item) => [item.id, item])), [slots])

  const loadBase = async () => {
    const [slotData, contentData] = await Promise.all([
      fetchAdminAdSlots({ page: 1, pageSize: 100 }),
      fetchAdminAdContents({
        page: 1,
        pageSize: 100,
        search: search.trim() || undefined,
        slotId: slotFilter || undefined,
      }),
    ])
    setSlots(slotData.list)
    setItems(contentData.list)
    if (!createForm.slotId && slotData.list[0]?.id) {
      setCreateForm((prev) => ({ ...prev, slotId: slotData.list[0].id }))
      setEditForm((prev) => ({ ...prev, slotId: slotData.list[0].id }))
    }
  }

  const loadAll = async () => {
    setLoading(true)
    setError("")
    try {
      await loadBase()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告内容加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const initialize = async () => {
      setLoading(true)
      setError("")
      try {
        const [slotData, contentData] = await Promise.all([
          fetchAdminAdSlots({ page: 1, pageSize: 100 }),
          fetchAdminAdContents({ page: 1, pageSize: 100 }),
        ])
        if (!active) return
        setSlots(slotData.list)
        setItems(contentData.list)
        if (slotData.list[0]?.id) {
          setCreateForm((prev) => ({ ...prev, slotId: prev.slotId || slotData.list[0].id }))
          setEditForm((prev) => ({ ...prev, slotId: prev.slotId || slotData.list[0].id }))
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "广告内容初始化失败")
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => {
      active = false
    }
  }, [])

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadAll()
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await createAdminAdContent({
        slotId: createForm.slotId,
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        imageUrl: createForm.imageUrl.trim(),
        targetUrl: createForm.targetUrl.trim(),
        ctaText: createForm.ctaText.trim() || "了解更多",
        advertiser: createForm.advertiser.trim(),
        priority: Number(createForm.priority) || 0,
        isActive: createForm.isActive,
      })
      setMessage("广告内容创建成功")
      setCreateForm((prev) => ({ ...initialForm, slotId: prev.slotId }))
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告内容创建失败")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: AdminAdContent) => {
    setError("")
    setMessage("")
    setEditingId(item.id)
    setEditForm({
      slotId: item.slotId,
      title: item.title,
      description: item.description || "",
      imageUrl: item.imageUrl,
      targetUrl: item.targetUrl,
      ctaText: item.ctaText,
      advertiser: item.advertiser,
      priority: String(item.priority ?? 0),
      isActive: item.isActive,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminAdContent(editingId, {
        slotId: editForm.slotId,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        imageUrl: editForm.imageUrl.trim(),
        targetUrl: editForm.targetUrl.trim(),
        ctaText: editForm.ctaText.trim() || "了解更多",
        advertiser: editForm.advertiser.trim(),
        priority: Number(editForm.priority) || 0,
        isActive: editForm.isActive,
      })
      setMessage("广告内容更新成功")
      setEditingId(null)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告内容更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: AdminAdContent) => {
    if (!window.confirm(`确定删除广告内容“${item.title}”吗？`)) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteAdminAdContent(item.id)
      setMessage("广告内容已删除")
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告内容删除失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="广告内容管理"
        description="管理广告素材、投放链接、优先级与启用状态。"
        icon={<Images className="h-5 w-5" />}
        iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="admin-panel p-4">
        <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-4">
          <input
            className="admin-input"
            placeholder="搜索标题 / 广告主"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-input" value={slotFilter} onChange={(event) => setSlotFilter(event.target.value)}>
            <option value="">全部广告位</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name}
              </option>
            ))}
          </select>
          <button className="admin-primary-btn px-4 py-2.5">查询</button>
          <button
            type="button"
            className="admin-secondary-btn px-4 py-2.5"
            onClick={() => {
              setSearch("")
              setSlotFilter("")
              void loadAll()
            }}
          >
            重置
          </button>
        </form>
      </section>

      <section className="admin-panel p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">新建广告内容</h2>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select className="admin-input" value={createForm.slotId} onChange={(event) => setCreateForm((prev) => ({ ...prev, slotId: event.target.value }))} required>
            <option value="">选择广告位</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name}
              </option>
            ))}
          </select>
          <input className="admin-input" placeholder="标题" value={createForm.title} onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))} required />
          <input className="admin-input" placeholder="图片 URL" value={createForm.imageUrl} onChange={(event) => setCreateForm((prev) => ({ ...prev, imageUrl: event.target.value }))} required />
          <input className="admin-input" placeholder="目标链接 URL" value={createForm.targetUrl} onChange={(event) => setCreateForm((prev) => ({ ...prev, targetUrl: event.target.value }))} required />
          <input className="admin-input" placeholder="广告主" value={createForm.advertiser} onChange={(event) => setCreateForm((prev) => ({ ...prev, advertiser: event.target.value }))} required />
          <input className="admin-input" placeholder="按钮文案" value={createForm.ctaText} onChange={(event) => setCreateForm((prev) => ({ ...prev, ctaText: event.target.value }))} />
          <input className="admin-input" type="number" placeholder="优先级" value={createForm.priority} onChange={(event) => setCreateForm((prev) => ({ ...prev, priority: event.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={createForm.isActive} onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            启用
          </label>
          <textarea
            className="admin-input md:col-span-2 xl:col-span-4 min-h-[84px]"
            placeholder="描述（可选）"
            value={createForm.description}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <button className="admin-primary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5" disabled={saving}>
            <Plus className="h-4 w-4" />
            {saving ? "处理中..." : "创建"}
          </button>
        </form>
      </section>

      <section className="admin-panel p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">广告内容列表</h2>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">正在加载...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无广告内容</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">标题</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">广告位</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">广告主</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">优先级</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">状态</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">链接</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="px-3 py-2 text-foreground">{item.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{slotMap.get(item.slotId)?.name || item.slot?.name || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.advertiser}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.priority}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.isActive ? "启用" : "禁用"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <a className="text-sky-600 hover:underline" href={item.targetUrl} target="_blank" rel="noreferrer">
                        打开
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button className="admin-secondary-btn inline-flex h-8 w-8 items-center justify-center p-0" onClick={() => startEdit(item)} title="编辑">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="admin-secondary-btn inline-flex h-8 w-8 items-center justify-center p-0" onClick={() => void handleDelete(item)} title="删除">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingId ? (
        <section className="admin-panel p-4">
          <h2 className="mb-4 text-sm font-semibold text-foreground">编辑广告内容</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select className="admin-input" value={editForm.slotId} onChange={(event) => setEditForm((prev) => ({ ...prev, slotId: event.target.value }))}>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name}
                </option>
              ))}
            </select>
            <input className="admin-input" value={editForm.title} onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))} />
            <input className="admin-input" value={editForm.imageUrl} onChange={(event) => setEditForm((prev) => ({ ...prev, imageUrl: event.target.value }))} />
            <input className="admin-input" value={editForm.targetUrl} onChange={(event) => setEditForm((prev) => ({ ...prev, targetUrl: event.target.value }))} />
            <input className="admin-input" value={editForm.advertiser} onChange={(event) => setEditForm((prev) => ({ ...prev, advertiser: event.target.value }))} />
            <input className="admin-input" value={editForm.ctaText} onChange={(event) => setEditForm((prev) => ({ ...prev, ctaText: event.target.value }))} />
            <input className="admin-input" type="number" value={editForm.priority} onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              启用
            </label>
            <textarea className="admin-input md:col-span-2 xl:col-span-4 min-h-[84px]" value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} />
            <div className="flex items-center gap-2">
              <button className="admin-primary-btn px-4 py-2.5" onClick={() => void saveEdit()} disabled={saving}>
                保存
              </button>
              <button className="admin-secondary-btn px-4 py-2.5" onClick={() => setEditingId(null)} disabled={saving}>
                取消
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
