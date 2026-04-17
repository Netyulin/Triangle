"use client"

import { Award, Edit3, Plus, Shield, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/admin/page-header"
import { colorOptions } from "./levels-shared"
import { useAdminLevels } from "./use-admin-levels"

export default function AdminLevelsPageContent() {
  const { closeModal, editingKey, error, form, formError, handleDelete, handleSave, levels, loading, message, openAdd, openEdit, saving, setForm, showModal } = useAdminLevels()

  return (
    <div className="space-y-5">
      <PageHeader
        title="等级管理"
        description="管理系统会员等级及充值设置"
        icon={<Award className="h-5 w-5" />}
        iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        actions={
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:shadow-lg hover:shadow-primary/25">
            <Plus className="h-4 w-4" />
            添加等级
          </button>
        }
      />

      {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</div> : null}

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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">充值赠送</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.id} className="border-b border-border/60 transition hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: level.color || "#3B82F6" }}>
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{level.name}</p>
                          {level.description ? <p className="mt-0.5 text-xs text-muted-foreground">{level.description}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><code className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">{level.key}</code></td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{level.dailyDownloadLimit}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{level.publicCertLimit}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{level.rechargePrice > 0 ? <span>{level.rechargePrice} 元</span> : <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-300">{level.rechargeBonusPercent > 0 ? <span>+{level.rechargeBonusPercent}%</span> : <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", level.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                        {level.isActive ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(level)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-sky-300 hover:text-sky-600" title="编辑">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(level)} disabled={level.key === "free" || saving} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30" title={level.key === "free" ? "不能删除 free 等级" : "删除"}>
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

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingKey ? "编辑等级" : "添加等级"}</h2>
              <button onClick={closeModal} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{formError}</div> : null}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">等级名称</label>
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="例如：高级会员" className="admin-input w-full" />
              </div>

              {!editingKey ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Key <span className="text-xs text-muted-foreground">(唯一标识，小写字母/数字/下划线)</span></label>
                  <input value={form.key} onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value.toLowerCase() }))} placeholder="例如：premium" className="admin-input w-full font-mono" />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">每日下载限制</label>
                  <input type="number" min={0} value={form.dailyDownloadLimit} onChange={(event) => setForm((prev) => ({ ...prev, dailyDownloadLimit: Number(event.target.value) }))} className="admin-input w-full" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">证书数量限制</label>
                  <input type="number" min={0} value={form.publicCertLimit} onChange={(event) => setForm((prev) => ({ ...prev, publicCertLimit: Number(event.target.value) }))} className="admin-input w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">升级价格 <span className="text-xs text-muted-foreground">(CNY)</span></label>
                  <input type="number" min={0} value={form.rechargePrice} onChange={(event) => setForm((prev) => ({ ...prev, rechargePrice: Number(event.target.value) }))} className="admin-input w-full" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">充值赠送比例 <span className="text-xs text-muted-foreground">(%)</span></label>
                  <input type="number" min={0} max={100} value={form.rechargeBonusPercent} onChange={(event) => setForm((prev) => ({ ...prev, rechargeBonusPercent: Number(event.target.value) }))} className="admin-input w-full" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">颜色</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button key={color} type="button" onClick={() => setForm((prev) => ({ ...prev, color }))} className={cn("h-8 w-8 rounded-lg transition-all", form.color === color ? "scale-110 ring-2 ring-foreground ring-offset-2" : "hover:scale-105")} style={{ backgroundColor: color }} title={color} />
                  ))}
                  <input type="color" value={form.color} onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} className="h-8 w-8 cursor-pointer rounded-lg border border-border p-0.5" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))} className={cn("relative inline-flex h-6 w-11 items-center rounded-full align-middle transition-colors", form.isActive ? "bg-primary" : "bg-secondary")}>
                  <span className={cn("absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.isActive ? "translate-x-5" : "translate-x-0.5")} />
                </button>
                <span className="text-sm font-medium text-foreground">{form.isActive ? "启用" : "禁用"}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary">取消</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? "保存中..." : editingKey ? "保存修改" : "创建等级"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
