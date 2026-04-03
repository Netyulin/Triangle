"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { KeyRound, CheckCircle } from "lucide-react"
import { createAdminInviteCodeBatch, fetchAdminInviteCodes, formatDateTime } from "@/lib/admin-api"
import { cn } from "@/lib/utils"

export default function AdminInviteCodesPage() {
  const [inviteCodes, setInviteCodes] = useState<Array<{ code: string; note: string; status: "used" | "unused"; createdAt: string; usedByUsername?: string | null }>>([])
  const [count, setCount] = useState(10)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const loadInviteCodes = async () => {
    setLoading(true)
    try {
      const rows = await fetchAdminInviteCodes()
      setInviteCodes(rows)
      setError("")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "邀请码列表加载失败。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInviteCodes()
  }, [])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const result = await createAdminInviteCodeBatch(count, note)
      setMessage(`已生成 ${result.codes.length} 个邀请码：${result.codes.join("、")}`)
      setNote("")
      await loadInviteCodes()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "邀请码生成失败。")
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const used = inviteCodes.filter((item) => item.status === "used").length
    const unused = inviteCodes.filter((item) => item.status === "unused").length
    return { total: inviteCodes.length, used, unused }
  }, [inviteCodes])

  const statusColor = (status: string) => {
    if (status === "unused") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50/80 to-blue-50/50 dark:from-cyan-950/40 dark:to-blue-950/20 border border-cyan-100 dark:border-cyan-900">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">邀请码管理</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">批量生成邀请码，开启邀请注册模式时需要</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="总邀请码" value={String(stats.total)} color="cyan" />
        <Metric label="未使用" value={String(stats.unused)} color="emerald" />
        <Metric label="已使用" value={String(stats.used)} color="slate" />
      </div>

      {/* Batch Create */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">批量生成邀请码</h2>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
            <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 01-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-[-1px]" />
            {message}
          </div>
        ) : null}

        <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_140px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">生成数量</label>
            <select value={count} onChange={(event) => setCount(Number(event.target.value))} className={inputClass}>
              {[5, 10, 20, 50].map((item) => (
                <option key={item} value={item}>
                  {item} 个
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">备注</label>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：四月活动、内测用户" className={inputClass} />
          </div>

          <div className="flex items-end">
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cyan-700 hover:shadow-md hover:shadow-cyan-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? "生成中..." : "生成邀请码"}
            </button>
          </div>
        </form>
      </div>

      {/* Invite Code List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">最近邀请码</h2>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">正在加载邀请码列表...</p>
        ) : inviteCodes.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-3 py-3 font-medium">邀请码</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-3 py-3 font-medium">备注</th>
                  <th className="px-3 py-3 font-medium">创建时间</th>
                  <th className="px-3 py-3 font-medium">使用人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {inviteCodes.map((item) => (
                  <tr key={item.code} className="bg-white dark:bg-transparent">
                    <td className="px-3 py-3 font-mono text-sm font-semibold text-slate-900 dark:text-white">{item.code}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusColor(item.status))}>
                        {item.status === "used" ? "已使用" : "未使用"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{item.note || "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(item.createdAt)}</td>
                    <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{item.usedByUsername || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">还没有生成过邀请码。</p>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const bgClass = {
    cyan: "bg-gradient-to-br from-cyan-50/80 to-blue-50/50 dark:from-cyan-950/40 dark:to-blue-950/20 border-cyan-100 dark:border-cyan-900 text-cyan-600 dark:text-cyan-400",
    emerald: "bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/40 dark:to-green-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400",
    slate: "bg-gradient-to-br from-slate-50/80 to-gray-50/50 dark:from-slate-950/40 dark:to-gray-950/20 border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-400",
  }[color]

  return (
    <div className={`overflow-hidden rounded-2xl border ${bgClass}`}>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

const inputClass = "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20 text-slate-900 dark:text-slate-100"
