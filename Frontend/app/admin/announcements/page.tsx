"use client"

import { FormEvent, useEffect, useState, type ReactNode } from "react"
import { Megaphone, Save } from "lucide-react"
import { fetchAdminSettings, updateAdminSettings } from "@/lib/admin-api"
import type { SiteSettings } from "@/lib/api"
import { PageHeader } from "@/components/admin/page-header"

const defaults: Pick<
  SiteSettings,
  | "siteAnnouncementEnabled"
  | "siteAnnouncementTitle"
  | "siteAnnouncementContent"
  | "siteAnnouncementLink"
> = {
  siteAnnouncementEnabled: true,
  siteAnnouncementTitle: "站点公告",
  siteAnnouncementContent: "",
  siteAnnouncementLink: "",
}

export default function AdminAnnouncementsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    fetchAdminSettings()
      .then((data) => {
        if (!active) return
        setSettings({
          ...data,
          siteAnnouncementEnabled:
            data.siteAnnouncementEnabled ?? defaults.siteAnnouncementEnabled,
          siteAnnouncementTitle:
            data.siteAnnouncementTitle ?? defaults.siteAnnouncementTitle,
          siteAnnouncementContent:
            data.siteAnnouncementContent ?? defaults.siteAnnouncementContent,
          siteAnnouncementLink:
            data.siteAnnouncementLink ?? defaults.siteAnnouncementLink,
        })
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "公告加载失败。")
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
      setMessage("公告已保存。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "公告保存失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="站点公告"
        description="管理前台首页与站内通知区的公告内容。"
        icon={<Megaphone className="h-5 w-5" />}
        iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
      />

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
          <Save className="mt-[-1px] h-5 w-5 flex-shrink-0" />
          {message}
        </div>
      ) : null}

      <div className="admin-panel p-5">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
          <Field label="是否启用公告">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 text-foreground/80">
                <input
                  type="radio"
                  checked={Boolean(settings.siteAnnouncementEnabled)}
                  onChange={() =>
                    setSettings((current) => ({ ...current, siteAnnouncementEnabled: true }))
                  }
                  className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                  disabled={loading}
                />
                <span>启用</span>
              </label>
              <label className="flex items-center gap-2 text-foreground/80">
                <input
                  type="radio"
                  checked={!settings.siteAnnouncementEnabled}
                  onChange={() =>
                    setSettings((current) => ({ ...current, siteAnnouncementEnabled: false }))
                  }
                  className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                  disabled={loading}
                />
                <span>关闭</span>
              </label>
            </div>
          </Field>

          <Field label="公告标题">
            <input
              value={settings.siteAnnouncementTitle ?? ""}
              onChange={(event) =>
                setSettings((current) => ({ ...current, siteAnnouncementTitle: event.target.value }))
              }
              disabled={loading}
              className={inputClass}
              placeholder="例如：站点公告"
            />
          </Field>

          <Field label="公告内容">
            <textarea
              value={settings.siteAnnouncementContent ?? ""}
              onChange={(event) =>
                setSettings((current) => ({ ...current, siteAnnouncementContent: event.target.value }))
              }
              rows={5}
              disabled={loading}
              className={inputClass}
              placeholder="公告展示内容，建议 200 字以内。"
            />
          </Field>

          <Field label="公告跳转链接（可选）">
            <input
              value={settings.siteAnnouncementLink ?? ""}
              onChange={(event) =>
                setSettings((current) => ({ ...current, siteAnnouncementLink: event.target.value }))
              }
              disabled={loading}
              className={inputClass}
              placeholder="https://"
            />
          </Field>

          <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            公告内容将展示在首页公告区与站内通知区，关闭后前台不再展示。
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading || saving} className="admin-primary-btn px-6 py-2.5">
              {saving ? "保存中..." : "保存公告"}
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
