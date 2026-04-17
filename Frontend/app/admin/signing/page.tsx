"use client"

import { FormEvent, useEffect, useState } from "react"
export { default } from "./signing-page-content"
import {
  FileBadge2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ShieldEllipsis,
  Trash2,
} from "lucide-react"
import {
  // Certificate APIs
  activateAdminSignCertificate,
  deleteAdminSignCertificate,
  fetchAdminSignCertificates,
  fetchAdminSignConfig,
  updateAdminSignCertificatePassword,
  uploadAdminSignCertificate,
  // Profile APIs
  activateAdminSignProfile,
  deleteAdminSignProfile,
  fetchAdminSignProfiles,
  updateAdminSignProfile,
  uploadAdminSignProfile,
  type AdminSignCertificate,
  type AdminSignProfile,
} from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

function AdminSigningPageLegacy() {
  // ====== State: Certificates ======
  const [certs, setCerts] = useState<AdminSignCertificate[]>([])
  const [activeCertId, setActiveCertId] = useState<number | null>(null)

  // ====== State: Profiles ======
  const [profiles, setProfiles] = useState<AdminSignProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)

  // ====== Shared State ======
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // ====== Form: Certificate Upload ======
  const [certForm, setCertForm] = useState({ name: "", password: "", isActive: true })
  const [certFile, setCertFile] = useState<File | null>(null)
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({})

  // ====== Form: Profile Upload ======
  const [profileForm, setProfileForm] = useState({ name: "", note: "", isActive: true })
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profileDrafts, setProfileDrafts] = useState<Record<number, { name: string; note: string }>>({})

  // ========================================
  // Data Loading
  // ========================================
  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const [certificates, profileList, config] = await Promise.all([
        fetchAdminSignCertificates(),
        fetchAdminSignProfiles(),
        fetchAdminSignConfig(),
      ])
      setCerts(certificates)
      setProfiles(profileList)
      setActiveCertId(config.activeCertificate?.id ?? null)
      setActiveProfileId(config.activeProfile?.id ?? null)
      setProfileDrafts(
        Object.fromEntries(
          profileList.map((item) => [
            item.id,
            { name: item.name, note: item.note || "" },
          ]),
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "签名数据加载失败")
    } finally {
      setLoading(false)
    }
}


  useEffect(() => { void loadData() }, [])

  // ========================================
  // Certificate Handlers
  // ========================================
  const handleCertUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!certFile) { setError("请先选择 .p12 证书文件"); return }

    setSaving(true); setError(""); setMessage("")
    try {
      const fd = new FormData()
      fd.append("certificate", certFile)
      fd.append("name", certForm.name.trim())
      fd.append("password", certForm.password)
      fd.append("isActive", String(certForm.isActive))
      await uploadAdminSignCertificate(fd)
      setCertForm({ name: "", password: "", isActive: true })
      setCertFile(null)
      setMessage("签名证书已上传")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "证书上传失败")
    } finally { setSaving(false) }
  }

  const handleCertActivate = async (id: number) => {
    setSaving(true); setError(""); setMessage("")
    try {
      await activateAdminSignCertificate(id)
      setMessage("已切换生效证书")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "证书切换失败")
    } finally { setSaving(false) }
  }

  const handleCertPasswordUpdate = async (id: number) => {
    const pwd = passwordDrafts[id]?.trim()
    if (!pwd) { setError("请先填写新密码"); return }
    setSaving(true); setError(""); setMessage("")
    try {
      await updateAdminSignCertificatePassword(id, pwd)
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }))
      setMessage("证书密码已更新")
    } catch (err) {
      setError(err instanceof Error ? err.message : "证书密码更新失败")
    } finally { setSaving(false) }
  }

  const handleCertDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除证书“${name}”吗？`)) return
    setSaving(true); setError(""); setMessage("")
    try {
      await deleteAdminSignCertificate(id)
      setMessage("证书已删除")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "证书删除失败")
    } finally { setSaving(false) }
  }

  // ========================================
  // Profile Handlers
  // ========================================
  const handleProfileUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!profileFile) { setError("请先选择 mobileprovision 文件"); return }

    setSaving(true); setError(""); setMessage("")
    try {
      const fd = new FormData()
      fd.append("profile", profileFile)
      fd.append("name", profileForm.name.trim())
      fd.append("note", profileForm.note.trim())
      fd.append("isActive", String(profileForm.isActive))
      await uploadAdminSignProfile(fd)
      setProfileForm({ name: "", note: "", isActive: true })
      setProfileFile(null)
      setMessage("描述文件已上传")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "描述文件上传失败")
    } finally { setSaving(false) }
  }

  const handleProfileActivate = async (id: number) => {
    setSaving(true); setError(""); setMessage("")
    try {
      await activateAdminSignProfile(id)
      setMessage("已切换生效描述文件")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "描述文件切换失败")
    } finally { setSaving(false) }
  }

  const handleProfileUpdate = async (item: AdminSignProfile) => {
    const draft = profileDrafts[item.id]
    if (!draft?.name.trim()) { setError("描述文件名称不能为空"); return }
    setSaving(true); setError(""); setMessage("")
    try {
      await updateAdminSignProfile(item.id, { name: draft.name.trim(), note: draft.note.trim() })
      setMessage("描述文件信息已更新")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "描述文件更新失败")
    } finally { setSaving(false) }
  }

  const handleProfileDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除描述文件“${name}”吗？`)) return
    setSaving(true); setError(""); setMessage("")
    try {
      await deleteAdminSignProfile(id)
      setMessage("描述文件已删除")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "描述文件删除失败")
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="应用签名管理"
        description="管理签名证书（p12）和描述文件（mobileprovision），配置当前生效的签名组合。"
        icon={<ShieldCheck className="h-5 w-5" />}
        iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
      />

      {/* ========== Messages ========== */}
      {error ? (
        <div role="alert" className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}
      {message ? (
        <div role="status" className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {/* ========== Active Config Card ========== */}
      <section className="admin-panel p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">当前生效组合</h2>
        {(activeCertId || activeProfileId) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">璇佷功</p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {certs.find(c => c.id === activeCertId)?.name || "未选择"}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">生效</span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
              <ShieldEllipsis className="h-8 w-8 shrink-0 text-violet-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">描述文件</p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {profiles.find(p => p.id === activeProfileId)?.name || "未选择"}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">生效</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-8 text-center text-sm text-muted-foreground">
            还没有配置签名组合，请在下方上传证书和描述文件
          </div>
        )}
      </section>

      {/* ========== Two Column Layout: Certificates & Profiles ========== */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* ===== Column A: Certificates ===== */}
        <div className="space-y-4">
          {/* Upload Form */}
          <section className="admin-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  证书列表 ({certs.length})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">.p12 文件</p>
              </div>
              <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2"
                onClick={() => void loadData()} disabled={loading || saving}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCertUpload} className="space-y-3">
              <input className="admin-input w-full" placeholder="证书名称"
                value={certForm.name}
                onChange={(e) => setCertForm(prev => ({ ...prev, name: e.target.value }))} required />
              <div className="flex gap-2">
                <input className="admin-input flex-1" type="password" placeholder="证书密码"
                  value={certForm.password}
                  onChange={(e) => setCertForm(prev => ({ ...prev, password: e.target.value }))} required />
                <input className="admin-input flex-1" type="file" accept=".p12"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={certForm.isActive}
                  onChange={(e) => setCertForm(prev => ({ ...prev, isActive: e.target.checked }))} />
                上传后直接启用
              </label>
              <button className="admin-primary-btn w-full px-4 py-2.5" disabled={saving}>
                {saving ? "处理中..." : "+ 上传证书"}
              </button>
            </form>
          </section>

          {/* List */}
          <section className="admin-panel p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">加载中...</div>
            ) : certs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">暂无证书</div>
            ) : (
              <div className="space-y-3">
                {certs.map((item) => (
                  <div key={item.id} className="group rounded-xl border border-border bg-background p-3 transition-colors hover:bg-secondary/30">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{item.name}</span>
                      {activeCertId === item.id && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          当前启用
                        </span>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{item.fileName}</p>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button className="admin-secondary-btn flex-1 px-2.5 py-1.5 text-xs"
                          disabled={saving || activeCertId === item.id}
                          onClick={() => void handleCertActivate(item.id)}>
                          设为启用
                        </button>
                        <button className="admin-secondary-btn flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-rose-600"
                          disabled={saving}
                          onClick={() => void handleCertDelete(item.id, item.name)}>
                          <Trash2 className="h-3 w-3" /> 删除
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input className="admin-input flex-1 text-xs py-1.5" type="password" placeholder="更新密码"
                          value={passwordDrafts[item.id] ?? ""}
                          onChange={(e) => setPasswordDrafts(prev => ({ ...prev, [item.id]: e.target.value }))} />
                        <button className="admin-secondary-btn shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                          disabled={saving} onClick={() => void handleCertPasswordUpdate(item.id)}>
                          <KeyRound className="h-3 w-3" /> 更新
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===== Column B: Profiles ===== */}
        <div className="space-y-4">
          {/* Upload Form */}
          <section className="admin-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldEllipsis className="h-4 w-4 text-violet-500" />
                  描述文件列表 ({profiles.length})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">.mobileprovision 文件</p>
              </div>
              <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2"
                onClick={() => void loadData()} disabled={loading || saving}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProfileUpload} className="space-y-3">
              <input className="admin-input w-full" placeholder="描述文件名称"
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))} required />
              <div className="flex gap-2">
                <input className="admin-input flex-1" placeholder="备注"
                  value={profileForm.note}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, note: e.target.value }))} />
                <input className="admin-input flex-1" type="file" accept=".mobileprovision"
                  onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={profileForm.isActive}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, isActive: e.target.checked }))} />
                上传后直接启用
              </label>
              <button className="admin-primary-btn w-full px-4 py-2.5" disabled={saving}>
                {saving ? "处理中..." : "+ 上传描述文件"}
              </button>
            </form>
          </section>

          {/* List */}
          <section className="admin-panel p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">加载中...</div>
            ) : profiles.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">暂无描述文件</div>
            ) : (
              <div className="space-y-3">
                {profiles.map((item) => {
                  const draft = profileDrafts[item.id] || { name: item.name, note: item.note || "" }
                  return (
                    <div key={item.id} className="group rounded-xl border border-border bg-background p-3 transition-colors hover:bg-secondary/30">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{item.name}</span>
                        {activeProfileId === item.id && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                            当前启用
                          </span>
                        )}
                      </div>
                      <p className="mb-2 truncate text-xs text-muted-foreground">{item.fileName}{item.note ? ` 路 ${item.note}` : ""}</p>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button className="admin-secondary-btn flex-1 px-2.5 py-1.5 text-xs"
                            disabled={saving || activeProfileId === item.id}
                            onClick={() => void handleProfileActivate(item.id)}>
                            设为启用
                          </button>
                          <button className="admin-secondary-btn flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-rose-600"
                            disabled={saving}
                            onClick={() => void handleProfileDelete(item.id, item.name)}>
                            <Trash2 className="h-3 w-3" /> 删除
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input className="admin-input flex-1 text-xs py-1.5" value={draft.name}
                            onChange={(e) => setProfileDrafts(prev => ({
                              ...prev,
                              [item.id]: { ...draft, name: e.target.value },
                            }))} placeholder="名称" />
                          <input className="admin-input w-24 text-xs py-1.5" value={draft.note}
                            onChange={(e) => setProfileDrafts(prev => ({
                              ...prev,
                              [item.id]: { ...draft, note: e.target.value },
                            }))} placeholder="备注" />
                          <button className="admin-secondary-btn shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                            disabled={saving} onClick={() => void handleProfileUpdate(item)}>
                            <FileBadge2 className="h-3 w-3" /> 保存
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
