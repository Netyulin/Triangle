"use client"

import { FormEvent, useEffect, useState } from "react"
import { FileBadge2, RefreshCw, ShieldEllipsis, Trash2 } from "lucide-react"
import {
  activateAdminSignProfile,
  deleteAdminSignProfile,
  fetchAdminSignConfig,
  fetchAdminSignProfiles,
  type AdminSignProfile,
  updateAdminSignProfile,
  uploadAdminSignProfile,
} from "@/lib/admin-api"

export default function AdminSignProfilesPage() {
  const [items, setItems] = useState<AdminSignProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    note: "",
    isActive: true,
  })
  const [file, setFile] = useState<File | null>(null)
  const [drafts, setDrafts] = useState<Record<number, { name: string; note: string }>>({})

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const [profiles, config] = await Promise.all([
        fetchAdminSignProfiles(),
        fetchAdminSignConfig(),
      ])
      setItems(profiles)
      setActiveProfileId(config.activeProfile?.id ?? null)
      setDrafts(
        Object.fromEntries(
          profiles.map((item) => [
            item.id,
            {
              name: item.name,
              note: item.note || "",
            },
          ]),
        ),
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件列表加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setError("请先选择 mobileprovision 文件")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")
    try {
      const formData = new FormData()
      formData.append("profile", file)
      formData.append("name", form.name.trim())
      formData.append("note", form.note.trim())
      formData.append("isActive", String(form.isActive))
      await uploadAdminSignProfile(formData)
      setForm({ name: "", note: "", isActive: true })
      setFile(null)
      setMessage("描述文件已上传")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件上传失败")
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id: number) => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await activateAdminSignProfile(id)
      setMessage("已切换当前生效描述文件")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件切换失败")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (item: AdminSignProfile) => {
    const draft = drafts[item.id]
    if (!draft?.name.trim()) {
      setError("描述文件名称不能为空")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminSignProfile(item.id, {
        name: draft.name.trim(),
        note: draft.note.trim(),
      })
      setMessage("描述文件信息已更新")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除描述文件“${name}”吗？`)) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteAdminSignProfile(id)
      setMessage("描述文件已删除")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件删除失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-hero p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
            <ShieldEllipsis className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">描述文件管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">集中管理多份 `mobileprovision` 文件，并指定当前签名任务所使用的生效版本。</p>
          </div>
        </div>
      </section>

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="admin-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">上传新描述文件</h2>
            <p className="mt-1 text-xs text-muted-foreground">建议名称中带上用途或设备批次，方便区分多份 profile。</p>
          </div>
          <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2" onClick={() => void loadData()} disabled={loading || saving}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>

        <form onSubmit={handleUpload} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="admin-input"
            placeholder="描述文件名称"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            className="admin-input"
            placeholder="备注（可选）"
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
          <input
            className="admin-input"
            type="file"
            accept=".mobileprovision"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            上传后直接启用
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <button className="admin-primary-btn px-4 py-2.5" disabled={saving}>
              {saving ? "处理中..." : "上传描述文件"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">描述文件列表</h2>
          <p className="mt-1 text-xs text-muted-foreground">签名任务默认使用当前启用的描述文件。保留多份文件后，切换起来会更方便。</p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">正在加载...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂未上传任何描述文件。</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const draft = drafts[item.id] || { name: item.name, note: item.note || "" }
              return (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{item.name}</span>
                        {activeProfileId === item.id ? <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">当前启用</span> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">文件名：{item.fileName}</p>
                      <p className="text-sm text-muted-foreground">路径：{item.filePath}</p>
                      <p className="text-sm text-muted-foreground">备注：{item.note || "无"}</p>
                    </div>

                    <div className="flex min-w-[320px] flex-col gap-3">
                      <div className="flex gap-2">
                        <button className="admin-secondary-btn px-3 py-2" disabled={saving || activeProfileId === item.id} onClick={() => void handleActivate(item.id)}>
                          设为启用
                        </button>
                        <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2 text-rose-600" disabled={saving} onClick={() => void handleDelete(item.id, item.name)}>
                          <Trash2 className="h-4 w-4" />
                          删除
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          className="admin-input"
                          value={draft.name}
                          onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, name: event.target.value } }))}
                          placeholder="描述文件名称"
                        />
                        <input
                          className="admin-input"
                          value={draft.note}
                          onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, note: event.target.value } }))}
                          placeholder="备注"
                        />
                        <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2" disabled={saving} onClick={() => void handleUpdate(item)}>
                          <FileBadge2 className="h-4 w-4" />
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
