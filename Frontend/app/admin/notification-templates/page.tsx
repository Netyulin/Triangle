"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CheckCircle, MailCheck, Send } from "lucide-react"
import { fetchAdminInboxTemplates, saveAdminInboxTemplate, type AdminInboxTemplate } from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

type UsageCondition = "register" | "ban" | "sign_disabled" | "new_feature" | "manual" | "general"

const usageConditionOptions: Array<{ value: UsageCondition; label: string }> = [
  { value: "register", label: "注册时发送" },
  { value: "ban", label: "禁言时发送" },
  { value: "sign_disabled", label: "禁止签名时发送" },
  { value: "new_feature", label: "新功能通知" },
  { value: "manual", label: "手动发送" },
  { value: "general", label: "通用通知" },
]

type TemplateForm = {
  title: string
  content: string
  description: string
  usageCondition: UsageCondition
  enabled: boolean
}

export default function AdminNotificationTemplatesPage() {
  const [templates, setTemplates] = useState<AdminInboxTemplate[]>([])
  const [activeKey, setActiveKey] = useState<string>("")
  const [form, setForm] = useState<TemplateForm>({
    title: "",
    content: "",
    description: "",
    usageCondition: "general",
    enabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const activeTemplate = useMemo(() => templates.find((item) => item.key === activeKey) ?? null, [activeKey, templates])

  const loadTemplates = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchAdminInboxTemplates()
      setTemplates(data)
      if (!activeKey && data[0]) {
        setActiveKey(data[0].key)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "模板加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  useEffect(() => {
    if (!activeTemplate) return
    setForm({
      title: activeTemplate.title || "",
      content: activeTemplate.content || "",
      description: activeTemplate.description || "",
      usageCondition: (activeTemplate.usageCondition as UsageCondition) || "general",
      enabled: Boolean(activeTemplate.enabled),
    })
  }, [activeTemplate])

  const handleSave = async () => {
    if (!activeTemplate) return
    setSaving(true)
    setMessage("")
    setError("")
    try {
      const updated = await saveAdminInboxTemplate(activeTemplate.key, {
        title: form.title.trim(),
        content: form.content.trim(),
        description: form.description.trim(),
        usageCondition: form.usageCondition,
        enabled: form.enabled,
      })
      setTemplates((current) => current.map((item) => (item.key === updated.key ? updated : item)))
      setMessage("模板已保存。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "模板保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="站内信模板"
        description="为每个模板设置使用条件，并维护模板标题与正文。"
        icon={<MailCheck className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300"
      />

      <div className="flex justify-end">
        <Link href="/admin/notifications/send" className="admin-primary-btn inline-flex items-center gap-2 px-4 py-2.5">
          <Send className="h-4 w-4" />
          立即发送站内信
        </Link>
      </div>

      {error ? (
        <div className="admin-panel flex items-start gap-2 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
      ) : null}

      {message ? (
        <div className="admin-panel flex items-start gap-2 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="mt-[-1px] h-5 w-5 flex-shrink-0" />
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="admin-panel p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">模板列表</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">正在加载模板...</p>
          ) : (
            <div className="space-y-2">
              {templates.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveKey(item.key)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                        : "border-border bg-background hover:border-accent/30 hover:bg-secondary/60"
                    }`}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className={`mt-1 text-[11px] ${isActive ? "text-white/80 dark:text-slate-700" : "text-muted-foreground"}`}>
                      条件：
                      {usageConditionOptions.find((option) => option.value === item.usageCondition)?.label || "通用通知"}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="admin-panel p-5">
          {activeTemplate ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">编辑模板</p>
                  <p className="text-xs text-muted-foreground">模板标识：{activeTemplate.key}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                    className="h-4 w-4 border-border text-sky-600 focus:ring-sky-500"
                  />
                  启用
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">使用条件</label>
                <select
                  value={form.usageCondition}
                  onChange={(event) => setForm((current) => ({ ...current, usageCondition: event.target.value as UsageCondition }))}
                  className="admin-input"
                >
                  {usageConditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标题</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="admin-input"
                  placeholder="模板标题"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">说明</label>
                <input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="admin-input"
                  placeholder="模板用途说明"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">内容</label>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="admin-input"
                  rows={7}
                  placeholder="模板正文，支持变量占位符，例如 {{name}}。"
                />
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={handleSave} disabled={saving} className="admin-primary-btn px-6 py-2.5">
                  {saving ? "保存中..." : "保存模板"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">请选择一个模板进行编辑。</div>
          )}
        </div>
      </div>
    </div>
  )
}
