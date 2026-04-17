"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react"
import {
  createAdminAdSlot,
  deleteAdminAdSlot,
  fetchAdminAdSlots,
  updateAdminAdSlot,
  type AdminAdSlot,
} from "@/lib/admin-api"
import { ADSENSE_SLOT_IDS } from "@/lib/api"
import { PageHeader } from "@/components/admin/page-header"

type SlotForm = {
  name: string
  type: "banner" | "insertion" | "native" | "splash"
  position: "top" | "bottom" | "sidebar" | "infeed"
  width: string
  height: string
  theme: "light" | "dark" | "auto"
  isActive: boolean
}

const initialForm: SlotForm = {
  name: "",
  type: "banner",
  position: "top",
  width: "728",
  height: "90",
  theme: "auto",
  isActive: true,
}

const ADSENSE_SLOT_PRESETS: Array<{
  key: string
  label: string
  description: string
  slotId: string
  type: SlotForm["type"]
  position: SlotForm["position"]
  width: number
  height: number
  theme: SlotForm["theme"]
}> = [
  {
    key: "triangle_home_top",
    label: "首页顶部广告",
    description: "首页轮播下方",
    slotId: ADSENSE_SLOT_IDS.triangle_home_top,
    type: "banner",
    position: "top",
    width: 728,
    height: 90,
    theme: "auto",
  },
  {
    key: "triangle_detail_top",
    label: "详情页顶部广告",
    description: "软件详情版本信息下方",
    slotId: ADSENSE_SLOT_IDS.triangle_detail_top,
    type: "banner",
    position: "top",
    width: 728,
    height: 90,
    theme: "auto",
  },
  {
    key: "triangle_detail_bottom",
    label: "详情页底部广告",
    description: "软件详情相关文章下方",
    slotId: ADSENSE_SLOT_IDS.triangle_detail_bottom,
    type: "banner",
    position: "bottom",
    width: 728,
    height: 90,
    theme: "auto",
  },
  {
    key: "triangle_download_interstitial",
    label: "下载中间页广告",
    description: "下载倒计时页中部",
    slotId: ADSENSE_SLOT_IDS.triangle_download_interstitial,
    type: "banner",
    position: "infeed",
    width: 320,
    height: 100,
    theme: "auto",
  },
]

export default function AdminAdSlotsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [items, setItems] = useState<AdminAdSlot[]>([])
  const [createForm, setCreateForm] = useState<SlotForm>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<SlotForm>(initialForm)

  const totalContents = useMemo(
    () => items.reduce((sum, item) => sum + Number(item._count?.adContents ?? 0), 0),
    [items],
  )

  const presetRows = useMemo(() => {
    const itemMap = new Map(items.map((item) => [item.name, item]))
    return ADSENSE_SLOT_PRESETS.map((preset) => ({
      ...preset,
      slot: itemMap.get(preset.key) ?? null,
    }))
  }, [items])

  const loadSlots = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchAdminAdSlots({ page: 1, pageSize: 100 })
      setItems(data.list)
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告位加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSlots()
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await createAdminAdSlot({
        name: createForm.name.trim(),
        type: createForm.type,
        position: createForm.position,
        width: Number(createForm.width),
        height: Number(createForm.height),
        theme: createForm.theme,
        isActive: createForm.isActive,
      })
      setMessage("广告位创建成功")
      setCreateForm(initialForm)
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告位创建失败")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: AdminAdSlot) => {
    setMessage("")
    setError("")
    setEditingId(item.id)
    setEditForm({
      name: item.name,
      type: item.type,
      position: item.position,
      width: String(item.width),
      height: String(item.height),
      theme: item.theme,
      isActive: item.isActive,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminAdSlot(editingId, {
        name: editForm.name.trim(),
        type: editForm.type,
        position: editForm.position,
        width: Number(editForm.width),
        height: Number(editForm.height),
        theme: editForm.theme,
        isActive: editForm.isActive,
      })
      setMessage("广告位更新成功")
      setEditingId(null)
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告位更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: AdminAdSlot) => {
    if (!window.confirm(`确定删除广告位「${item.name}」吗？`)) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteAdminAdSlot(item.id)
      setMessage("广告位已删除")
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告位删除失败")
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePreset = async (item: AdminAdSlot) => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminAdSlot(item.id, { isActive: !item.isActive })
      setMessage(`已${item.isActive ? "关闭" : "开启"}：${item.name}`)
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : "广告位开关更新失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="广告位管理"
        description="管理广告位类型、尺寸、位置与启用状态"
        icon={<Megaphone className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="admin-panel p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">广告位总数</p>
          <p className="mt-2 text-3xl font-black text-foreground">{items.length}</p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">关联广告内容</p>
          <p className="mt-2 text-3xl font-black text-foreground">{totalContents}</p>
        </div>
      </section>

      <section className="admin-panel p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">AdSense 固定广告位开关</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          前台默认展示全部 SLOT_ID；只有这里显式关闭后，前台才会隐藏对应广告位。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">广告位键</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">用途</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">SLOT_ID</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">状态</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {presetRows.map((row) => (
                <tr key={row.key} className="border-b border-border/60">
                  <td className="px-3 py-2 text-foreground">{row.key}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.label}（{row.description}）
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.slotId || "未配置"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.slot?.isActive ?? true ? "启用" : "禁用"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="admin-secondary-btn px-3 py-1.5"
                      disabled={saving || !row.slot}
                      onClick={() => row.slot && void handleTogglePreset(row.slot)}
                    >
                      {row.slot?.isActive ?? true ? "关闭" : "开启"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">新建广告位</h2>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="admin-input"
            placeholder="广告位名称"
            value={createForm.name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <select className="admin-input" value={createForm.type} onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value as SlotForm["type"] }))}>
            <option value="banner">banner</option>
            <option value="insertion">insertion</option>
            <option value="native">native</option>
            <option value="splash">splash</option>
          </select>
          <select className="admin-input" value={createForm.position} onChange={(event) => setCreateForm((prev) => ({ ...prev, position: event.target.value as SlotForm["position"] }))}>
            <option value="top">top</option>
            <option value="bottom">bottom</option>
            <option value="sidebar">sidebar</option>
            <option value="infeed">infeed</option>
          </select>
          <select className="admin-input" value={createForm.theme} onChange={(event) => setCreateForm((prev) => ({ ...prev, theme: event.target.value as SlotForm["theme"] }))}>
            <option value="auto">auto</option>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
          <input className="admin-input" type="number" min={1} placeholder="宽度" value={createForm.width} onChange={(event) => setCreateForm((prev) => ({ ...prev, width: event.target.value }))} required />
          <input className="admin-input" type="number" min={1} placeholder="高度" value={createForm.height} onChange={(event) => setCreateForm((prev) => ({ ...prev, height: event.target.value }))} required />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={createForm.isActive} onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            启用
          </label>
          <button className="admin-primary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5" disabled={saving}>
            <Plus className="h-4 w-4" />
            {saving ? "处理中..." : "创建"}
          </button>
        </form>
      </section>

      <section className="admin-panel p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">广告位列表</h2>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">正在加载...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无广告位</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">名称</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">类型</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">位置</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">尺寸</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">主题</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">状态</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">内容数</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="px-3 py-2 text-foreground">{item.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.position}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.width} x {item.height}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{item.theme}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.isActive ? "启用" : "禁用"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item._count?.adContents ?? 0}</td>
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
          <h2 className="mb-4 text-sm font-semibold text-foreground">编辑广告位</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input className="admin-input" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
            <select className="admin-input" value={editForm.type} onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value as SlotForm["type"] }))}>
              <option value="banner">banner</option>
              <option value="insertion">insertion</option>
              <option value="native">native</option>
              <option value="splash">splash</option>
            </select>
            <select className="admin-input" value={editForm.position} onChange={(event) => setEditForm((prev) => ({ ...prev, position: event.target.value as SlotForm["position"] }))}>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
              <option value="sidebar">sidebar</option>
              <option value="infeed">infeed</option>
            </select>
            <select className="admin-input" value={editForm.theme} onChange={(event) => setEditForm((prev) => ({ ...prev, theme: event.target.value as SlotForm["theme"] }))}>
              <option value="auto">auto</option>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
            <input className="admin-input" type="number" min={1} value={editForm.width} onChange={(event) => setEditForm((prev) => ({ ...prev, width: event.target.value }))} />
            <input className="admin-input" type="number" min={1} value={editForm.height} onChange={(event) => setEditForm((prev) => ({ ...prev, height: event.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              启用
            </label>
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
