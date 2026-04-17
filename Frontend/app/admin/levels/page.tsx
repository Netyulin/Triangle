"use client"

import { useEffect, useState } from "react"
export { default } from "./levels-page-content"
import { Award, Edit3, Plus, Shield, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { createLevel, deleteLevel, fetchLevels, updateLevel, type MembershipLevel } from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

type LevelForm = {
  name: string
  key: string
  dailyDownloadLimit: number
  publicCertLimit: number
  rechargePrice: number
  rechargeBonusPercent: number
  color: string
  isActive: boolean
}

const defaultForm: LevelForm = {
  name: "",
  key: "",
  dailyDownloadLimit: 10,
  publicCertLimit: 3,
  rechargePrice: 0,
  rechargeBonusPercent: 0,
  color: "#3B82F6",
  isActive: true,
}

const colorOptions = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // rose
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#F97316", // orange
  "#84CC16", // lime
]

function AdminLevelsPageLegacy() {
  const [levels, setLevels] = useState<MembershipLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState<LevelForm>(defaultForm)
  const [formError, setFormError] = useState("")

  const loadLevels = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchLevels()
      setLevels(data.levels ?? [])
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "等级列表加载失败。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLevels()
  }, [])

  const openAdd = () => {
    setEditingKey(null)
    setForm(defaultForm)
    setFormError("")
    setShowModal(true)
  }

  const openEdit = (level: MembershipLevel) => {
    setEditingKey(level.key)
    setForm({
      name: level.name,
      key: level.key,
      dailyDownloadLimit: level.dailyDownloadLimit,
      publicCertLimit: level.publicCertLimit,
      rechargePrice: level.rechargePrice,
      rechargeBonusPercent: level.rechargeBonusPercent,
      color: level.color || "#3B82F6",
      isActive: level.isActive,
    })
    setFormError("")
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingKey(null)
    setForm(defaultForm)
    setFormError("")
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("等级名称不能为空。")
      return
    }
    if (!editingKey && !form.key.trim()) {
      setFormError("Key 不能为空。")
      return
    }
    if (!editingKey && !/^[a-z0-9_-]+$/.test(form.key.trim())) {
      setFormError("Key 只能包含小写字母、数字、下划线和短横线。")
      return
    }

    setSaving(true)
    setFormError("")

    const payload = {
      name: form.name.trim(),
      dailyDownloadLimit: form.dailyDownloadLimit,
      publicCertLimit: form.publicCertLimit,
      rechargePrice: form.rechargePrice,
      rechargeBonusPercent: form.rechargeBonusPercent,
      color: form.color,
      isActive: form.isActive,
    }

    try {
      if (editingKey) {
        await updateLevel(editingKey, payload)
        setMessage("等级已更新。")
      } else {
        await createLevel({ ...payload, key: form.key.trim() })
        setMessage("等级已创建。")
      }
      closeModal()
      await loadLevels()
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "保存失败。")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (level: MembershipLevel) => {
    if (level.key === "free") {
      setError("不能删除默认的 free 等级。")
      return
    }
    if (!window.confirm(`确定删除等级"${level.name}"吗？此操作不可恢复。`)) return

    setSaving(true)
    setError("")
    setMessage("")

    try {
      await deleteLevel(level.key)
      setMessage(`等级"${level.name}"已删除。`)
      await loadLevels()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="等级管理"
        description="管理系统会员等级及充值设置"
        icon={<Award className="h-5 w-5" />}
        iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:shadow-lg hover:shadow-primary/25"
          >
            <Plus className="h-4 w-4" />
            添加等级
          </button>
        }
      />

      {/* Alerts */}
      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {/* Table */}
      <div className="admin-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">等级列表加载中...</div>
        ) : levels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
            <Shield className="mb-3 h-10 w-10 opacity-30" />
            还没有等级配置，点击上方按钮添加。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">等级名称</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">每日下载</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">证书数量</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">升级价格</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">充值赠送%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.id} className="border-b border-border/60 transition hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: level.color || "#3B82F6" }}
                        >
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{level.name}</p>
                          {level.description && <p className="mt-0.5 text-xs text-muted-foreground">{level.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">{level.key}</code>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{level.dailyDownloadLimit}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{level.publicCertLimit}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                      {level.rechargePrice > 0 ? <span>{level.rechargePrice} 元</span> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-300">
                      {level.rechargeBonusPercent > 0 ? <span>+{level.rechargeBonusPercent}%</span> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          level.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {level.isActive ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(level)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-sky-300 hover:text-sky-600"
                          title="编辑"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(level)}
                          disabled={level.key === "free" || saving}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title={level.key === "free" ? "不能删除 free 等级" : "删除"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingKey ? "编辑等级" : "添加等级"}</h2>
              <button
                onClick={closeModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {formError}
              </div>
            ) : null}

            <div className="space-y-4">
              {/* 等级名称 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">等级名称</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：高级会员"
                  className="admin-input w-full"
                />
              </div>

              {/* Key (仅新增时) */}
              {!editingKey && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Key <span className="text-xs text-muted-foreground">(唯一标识，小写字母/数字/下划线)</span></label>
                  <input
                    value={form.key}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))}
                    placeholder="例如：premium"
                    className="admin-input w-full font-mono"
                  />
                </div>
              )}

              {/* 每日下载限制 + 证书数量 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">每日下载限制</label>
                  <input
                    type="number"
                    min={0}
                    value={form.dailyDownloadLimit}
                    onChange={(e) => setForm((f) => ({ ...f, dailyDownloadLimit: Number(e.target.value) }))}
                    className="admin-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">证书数量限制</label>
                  <input
                    type="number"
                    min={0}
                    value={form.publicCertLimit}
                    onChange={(e) => setForm((f) => ({ ...f, publicCertLimit: Number(e.target.value) }))}
                    className="admin-input w-full"
                  />
                </div>
              </div>

              {/* 升级价格 + 充值赠送% */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">升级价格 <span className="text-xs text-muted-foreground">(CNY)</span></label>
                  <input
                    type="number"
                    min={0}
                    value={form.rechargePrice}
                    onChange={(e) => setForm((f) => ({ ...f, rechargePrice: Number(e.target.value) }))}
                    className="admin-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">充值赠送比例 <span className="text-xs text-muted-foreground">(%)</span></label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.rechargeBonusPercent}
                    onChange={(e) => setForm((f) => ({ ...f, rechargeBonusPercent: Number(e.target.value) }))}
                    className="admin-input w-full"
                  />
                </div>
              </div>

              {/* 颜色选择 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">颜色</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        form.color === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-border p-0.5"
                  />
                </div>
              </div>

              {/* 是否启用 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full align-middle transition-colors",
                    form.isActive ? "bg-primary" : "bg-secondary"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      form.isActive ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-foreground">{form.isActive ? "启用" : "禁用"}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "保存中..." : editingKey ? "保存修改" : "创建等级"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
