"use client"

import { FormEvent, useEffect, useState } from "react"
import { KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"
import {
  activateAdminSignCertificate,
  deleteAdminSignCertificate,
  fetchAdminSignCertificates,
  fetchAdminSignConfig,
  type AdminSignCertificate,
  updateAdminSignCertificatePassword,
  uploadAdminSignCertificate,
} from "@/lib/admin-api"

export default function AdminSignCertificatesPage() {
  const [items, setItems] = useState<AdminSignCertificate[]>([])
  const [activeCertificateId, setActiveCertificateId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    password: "",
    isActive: true,
  })
  const [file, setFile] = useState<File | null>(null)
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({})

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const [certificates, config] = await Promise.all([
        fetchAdminSignCertificates(),
        fetchAdminSignConfig(),
      ])
      setItems(certificates)
      setActiveCertificateId(config.activeCertificate?.id ?? null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书列表加载失败")
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
      setError("请先选择 .p12 证书文件")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")
    try {
      const formData = new FormData()
      formData.append("certificate", file)
      formData.append("name", form.name.trim())
      formData.append("password", form.password)
      formData.append("isActive", String(form.isActive))
      await uploadAdminSignCertificate(formData)
      setForm({ name: "", password: "", isActive: true })
      setFile(null)
      setMessage("签名证书已上传")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书上传失败")
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id: number) => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await activateAdminSignCertificate(id)
      setMessage("已切换当前生效证书")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书切换失败")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (id: number) => {
    const password = passwordDrafts[id]?.trim()
    if (!password) {
      setError("请先填写新密码")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminSignCertificatePassword(id, password)
      setPasswordDrafts((current) => ({ ...current, [id]: "" }))
      setMessage("证书密码已更新")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书密码更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除证书“${name}”吗？`)) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteAdminSignCertificate(id)
      setMessage("证书已删除")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书删除失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-hero p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">签名证书管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">上传 `.p12` 证书、维护密码，并指定当前签名任务使用的生效证书。</p>
          </div>
        </div>
      </section>

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="admin-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">上传新证书</h2>
            <p className="mt-1 text-xs text-muted-foreground">建议一份证书对应一个易识别名称，例如“推送分发证书 2026”。</p>
          </div>
          <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2" onClick={() => void loadData()} disabled={loading || saving}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>

        <form onSubmit={handleUpload} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="admin-input"
            placeholder="证书名称"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            className="admin-input"
            type="password"
            placeholder="证书密码"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
          <input
            className="admin-input"
            type="file"
            accept=".p12"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            上传后直接启用
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <button className="admin-primary-btn px-4 py-2.5" disabled={saving}>
              {saving ? "处理中..." : "上传证书"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">证书列表</h2>
          <p className="mt-1 text-xs text-muted-foreground">签名任务始终使用当前“已启用”的证书。你可以单独修改密码，而无需重新上传文件。</p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">正在加载...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂未上传任何签名证书。</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{item.name}</span>
                      {activeCertificateId === item.id ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">当前启用</span> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">文件名：{item.fileName}</p>
                    <p className="text-sm text-muted-foreground">路径：{item.filePath}</p>
                    {item.subjectCn ? <p className="text-sm text-muted-foreground">主题：{item.subjectCn}</p> : null}
                  </div>

                  <div className="flex min-w-[280px] flex-col gap-3">
                    <div className="flex gap-2">
                      <button className="admin-secondary-btn px-3 py-2" disabled={saving || activeCertificateId === item.id} onClick={() => void handleActivate(item.id)}>
                        设为启用
                      </button>
                      <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2 text-rose-600" disabled={saving} onClick={() => void handleDelete(item.id, item.name)}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        className="admin-input"
                        type="password"
                        placeholder="更新证书密码"
                        value={passwordDrafts[item.id] ?? ""}
                        onChange={(event) => setPasswordDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                      />
                      <button className="admin-secondary-btn inline-flex items-center gap-2 px-3 py-2" disabled={saving} onClick={() => void handlePasswordUpdate(item.id)}>
                        <KeyRound className="h-4 w-4" />
                        更新密码
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
