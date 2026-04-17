"use client"

import { FileBadge2, KeyRound, RefreshCw, ShieldCheck, ShieldEllipsis, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { type AdminSignProfile } from "@/lib/admin-api"
import { useAdminSigning } from "./use-admin-signing"

export default function AdminSigningPageContent() {
  const {
    activeCertId,
    activeProfileId,
    certFile,
    certForm,
    certs,
    error,
    handleCertActivate,
    handleCertDelete,
    handleCertPasswordUpdate,
    handleCertUpload,
    handleProfileActivate,
    handleProfileDelete,
    handleProfileUpdate,
    handleProfileUpload,
    loadData,
    loading,
    message,
    passwordDrafts,
    profileDrafts,
    profileFile,
    profileForm,
    profiles,
    saving,
    setCertFile,
    setCertForm,
    setPasswordDrafts,
    setProfileDrafts,
    setProfileFile,
    setProfileForm,
  } = useAdminSigning()

  return (
    <div className="space-y-5">
      <PageHeader
        title="应用签名管理"
        description="管理签名证书（p12）和描述文件（mobileprovision），配置当前生效的签名组合。"
        icon={<ShieldCheck className="h-5 w-5" />}
        iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
      />

      {error ? <div role="alert" className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div role="status" className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="admin-panel p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">当前生效组合</h2>
        {activeCertId || activeProfileId ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">证书</p>
                <p className="truncate text-sm font-semibold text-foreground">{certs.find((item) => item.id === activeCertId)?.name || "未选择"}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">生效</span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
              <ShieldEllipsis className="h-8 w-8 shrink-0 text-violet-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">描述文件</p>
                <p className="truncate text-sm font-semibold text-foreground">{profiles.find((item) => item.id === activeProfileId)?.name || "未选择"}</p>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="admin-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  证书列表 ({certs.length})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">.p12 文件</p>
              </div>
              <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2" onClick={() => void loadData()} disabled={loading || saving}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCertUpload} className="space-y-3">
              <input className="admin-input w-full" placeholder="证书名称" value={certForm.name} onChange={(event) => setCertForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <div className="flex gap-2">
                <input className="admin-input flex-1" type="password" placeholder="证书密码" value={certForm.password} onChange={(event) => setCertForm((prev) => ({ ...prev, password: event.target.value }))} required />
                <input className="admin-input flex-1" type="file" accept=".p12" onChange={(event) => setCertFile(event.target.files?.[0] ?? null)} required={!certFile} />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={certForm.isActive} onChange={(event) => setCertForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                上传后直接启用
              </label>
              <button className="admin-primary-btn w-full px-4 py-2.5" disabled={saving}>{saving ? "处理中..." : "+ 上传证书"}</button>
            </form>
          </section>

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
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                      {activeCertId === item.id ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">当前启用</span> : null}
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{item.fileName}</p>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button className="admin-secondary-btn flex-1 px-2.5 py-1.5 text-xs" disabled={saving || activeCertId === item.id} onClick={() => void handleCertActivate(item.id)}>设为启用</button>
                        <button className="admin-secondary-btn flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-rose-600" disabled={saving} onClick={() => void handleCertDelete(item.id, item.name)}>
                          <Trash2 className="h-3 w-3" /> 删除
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input className="admin-input flex-1 py-1.5 text-xs" type="password" placeholder="更新密码" value={passwordDrafts[item.id] ?? ""} onChange={(event) => setPasswordDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))} />
                        <button className="admin-secondary-btn shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs" disabled={saving} onClick={() => void handleCertPasswordUpdate(item.id)}>
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

        <div className="space-y-4">
          <section className="admin-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldEllipsis className="h-4 w-4 text-violet-500" />
                  描述文件列表 ({profiles.length})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">.mobileprovision 文件</p>
              </div>
              <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2" onClick={() => void loadData()} disabled={loading || saving}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProfileUpload} className="space-y-3">
              <input className="admin-input w-full" placeholder="描述文件名称" value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <div className="flex gap-2">
                <input className="admin-input flex-1" placeholder="备注" value={profileForm.note} onChange={(event) => setProfileForm((prev) => ({ ...prev, note: event.target.value }))} />
                <input className="admin-input flex-1" type="file" accept=".mobileprovision" onChange={(event) => setProfileFile(event.target.files?.[0] ?? null)} required={!profileFile} />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={profileForm.isActive} onChange={(event) => setProfileForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                上传后直接启用
              </label>
              <button className="admin-primary-btn w-full px-4 py-2.5" disabled={saving}>{saving ? "处理中..." : "+ 上传描述文件"}</button>
            </form>
          </section>

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
                        <span className="text-sm font-semibold text-foreground">{item.name}</span>
                        {activeProfileId === item.id ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">当前启用</span> : null}
                      </div>
                      <p className="mb-2 truncate text-xs text-muted-foreground">
                        {item.fileName}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button className="admin-secondary-btn flex-1 px-2.5 py-1.5 text-xs" disabled={saving || activeProfileId === item.id} onClick={() => void handleProfileActivate(item.id)}>
                            设为启用
                          </button>
                          <button className="admin-secondary-btn flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-rose-600" disabled={saving} onClick={() => void handleProfileDelete(item.id, item.name)}>
                            <Trash2 className="h-3 w-3" /> 删除
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input className="admin-input flex-1 py-1.5 text-xs" value={draft.name} onChange={(event) => setProfileDrafts((prev) => ({ ...prev, [item.id]: { ...draft, name: event.target.value } }))} placeholder="名称" />
                          <input className="admin-input w-24 py-1.5 text-xs" value={draft.note} onChange={(event) => setProfileDrafts((prev) => ({ ...prev, [item.id]: { ...draft, note: event.target.value } }))} placeholder="备注" />
                          <button className="admin-secondary-btn shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs" disabled={saving} onClick={() => void handleProfileUpdate(item as AdminSignProfile)}>
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
