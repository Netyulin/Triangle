"use client"

import { FormEvent, useEffect, useState } from "react"
import { CheckCircle, UserCog } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { AvatarPicker } from "@/components/avatar-picker"
import { fetchAdminProfile, updateAdminProfile } from "@/lib/admin-api"
import { type AvatarGender } from "@/lib/avatar-random"

export default function AdminAccountPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    name: "",
    gender: "other" as AvatarGender,
    avatar: "",
    currentPassword: "",
    newPassword: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const data = await fetchAdminProfile()
        setForm({
          name: data.user.name || "",
          gender: (data.user.gender as AvatarGender) || "other",
          avatar: data.user.avatar || "",
          currentPassword: "",
          newPassword: "",
        })
        setError("")
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "账号资料加载失败。")
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    try {
      await updateAdminProfile({
        name: form.name.trim(),
        gender: form.gender,
        avatar: form.avatar,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      })
      setForm((current) => ({ ...current, currentPassword: "", newPassword: "" }))
      setMessage("账号设置已保存。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "账号设置保存失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="账号设置"
        description="修改头像、显示名称、性别和密码。"
        icon={<UserCog className="h-5 w-5" />}
        iconClassName="bg-slate-50 text-slate-600 dark:bg-slate-950/30 dark:text-slate-400"
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
          <CheckCircle className="mt-[-1px] h-5 w-5 flex-shrink-0" />
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="admin-panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">头像与资料</h2>
          <div className="space-y-5">
            <AvatarPicker
              value={form.avatar}
              onChange={(avatar) => setForm((current) => ({ ...current, avatar }))}
              gender={form.gender}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="显示名称">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="性别">
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gender: event.target.value as AvatarGender,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        <div className="admin-panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">修改密码</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="当前密码">
              <input
                type="password"
                value={form.currentPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="新密码">
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading || saving} className="admin-primary-btn px-6 py-2.5">
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "admin-input"
