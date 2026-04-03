"use client"

import { FormEvent, useEffect, useState } from "react"
import { UserCog, CheckCircle } from "lucide-react"
import { AvatarPicker } from "@/components/avatar-picker"
import { fetchAdminProfile, updateAdminProfile } from "@/lib/admin-api"
import { avatarPresets } from "@/lib/avatar-presets"
import { type AvatarGender } from "@/lib/avatar-random"

export default function AdminAccountPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    name: "",
    gender: "other" as AvatarGender,
    avatar: avatarPresets[0]?.src ?? "",
    currentPassword: "",
    newPassword: "",
  })

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await fetchAdminProfile()
      setForm({
        name: data.user.name || "",
        gender: (data.user.gender as AvatarGender) || "other",
        avatar: data.user.avatar || avatarPresets[0]?.src || "",
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

  useEffect(() => {
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
      setMessage("账号设置已经保存。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "账号设置保存失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50/80 to-cyan-50/50 dark:from-teal-950/40 dark:to-cyan-950/20 border border-teal-100 dark:border-teal-900">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">账号设置</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">修改头像、显示名称、性别和密码</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 011.06 1.06L11.06 10l.66.66a.75.75 0 01-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-[-1px]" />
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar & Profile */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">头像与资料</h2>
          <div className="space-y-5">
            <AvatarPicker value={form.avatar} onChange={(avatar) => setForm((current) => ({ ...current, avatar }))} gender={form.gender} />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="显示名称">
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
              </Field>
              <Field label="性别">
                <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as AvatarGender }))} className={inputClass}>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">修改密码</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="当前密码">
              <input type="password" value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="新密码">
              <input type="password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading || saving} className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-700 hover:shadow-md hover:shadow-teal-600/20 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:border-teal-500 dark:focus:ring-teal-500/20 text-slate-900 dark:text-slate-100"
