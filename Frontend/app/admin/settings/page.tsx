"use client"

import { FormEvent, useEffect, useState, type ReactNode } from "react"
import { CheckCircle, Settings2 } from "lucide-react"
import { fetchAdminSettings, updateAdminSettings } from "@/lib/admin-api"
import type { SiteSettings } from "@/lib/api"

const initialSettings: SiteSettings = {
  siteName: "Triangle",
  siteDescription: "把软件、文章和真实需求放到一个清晰的入口里。",
  homeFeaturedPostCount: 6,
  registrationEnabled: true,
  registrationRequiresInvite: false,
}

const SITE_SETTINGS_UPDATED_EVENT = "triangle-site-settings-updated"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    fetchAdminSettings()
      .then((data) => {
        if (!active) return
        setSettings(data)
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "设置加载失败。")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const next = await updateAdminSettings(settings)
      setSettings(next)
      window.dispatchEvent(new Event(SITE_SETTINGS_UPDATED_EVENT))
      setMessage("设置已保存。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "设置保存失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="admin-hero">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">系统设置</h1>
              <p className="mt-1 text-sm text-muted-foreground">控制站点名称、首页精选数量，以及注册开关和邀请码要求。</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="admin-panel flex items-start gap-2 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <svg className="mt-[-1px] h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 011.06 1.06L11.06 10l.66.66a.75.75 0 01-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="admin-panel flex items-start gap-2 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="mt-[-1px] h-5 w-5 flex-shrink-0" />
          {message}
        </div>
      ) : null}

      <div className="admin-panel p-5">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <Field label="站点名称">
            <input
              value={settings.siteName}
              onChange={(event) => setSettings((current) => ({ ...current, siteName: event.target.value }))}
              disabled={loading}
              className={inputClass}
            />
          </Field>

          <Field label="站点描述">
            <textarea
              value={settings.siteDescription}
              onChange={(event) => setSettings((current) => ({ ...current, siteDescription: event.target.value }))}
              rows={3}
              disabled={loading}
              className={inputClass}
            />
          </Field>

          <Field label="首页精选文章数量">
            <select
              value={settings.homeFeaturedPostCount}
              onChange={(event) => setSettings((current) => ({ ...current, homeFeaturedPostCount: Number(event.target.value) }))}
              disabled={loading}
              className={inputClass}
            >
              {[4, 6, 8, 10].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </Field>

          <Field label="是否开放注册">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 text-foreground/80">
                <input
                  type="radio"
                  checked={settings.registrationEnabled}
                  onChange={() => setSettings((current) => ({ ...current, registrationEnabled: true }))}
                  className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                />
                <span>开放</span>
              </label>
              <label className="flex items-center gap-2 text-foreground/80">
                <input
                  type="radio"
                  checked={!settings.registrationEnabled}
                  onChange={() => setSettings((current) => ({ ...current, registrationEnabled: false, registrationRequiresInvite: false }))}
                  className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                />
                <span>关闭</span>
              </label>
            </div>
          </Field>

          <Field label="注册是否需要邀请码">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 text-foreground/80">
                <input
                  type="radio"
                  checked={settings.registrationEnabled && settings.registrationRequiresInvite}
                  onChange={() => setSettings((current) => ({ ...current, registrationEnabled: true, registrationRequiresInvite: true }))}
                  className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                />
                <span>必须填写邀请码</span>
              </label>
              <label className="flex items-center gap-2 text-foreground/80">
                <input
                  type="radio"
                  checked={!settings.registrationRequiresInvite}
                  onChange={() => setSettings((current) => ({ ...current, registrationRequiresInvite: false }))}
                  className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                />
                <span>不需要邀请码</span>
              </label>
            </div>
          </Field>

          <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            关闭注册后，前台会直接显示未开放；如果开启邀请码，注册时会同时校验，没有邀请码就不能继续。
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading || saving} className="admin-primary-btn px-6 py-2.5">
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "admin-input"
