"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { KeyRound, CheckCircle } from "lucide-react"
import { createAdminInviteCodeBatch, fetchAdminInviteCodes, formatDateTime } from "@/lib/admin-api"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/admin/page-header"

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
    if (status === "unused") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
    return "bg-secondary text-muted-foreground border-border"
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="邀请码管理"
        description="批量生成邀请码，适合在开启邀请码注册时使用。"
        icon={<KeyRound className="h-5 w-5" />}
        iconClassName="bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="总邀请码" value={String(stats.total)} />
        <Metric label="未使用" value={String(stats.unused)} />
        <Metric label="已使用" value={String(stats.used)} />
      </div>

      <div className="admin-panel p-5">
        <h2 className="text-lg font-semibold text-foreground">批量生成邀请码</h2>

        {error ? <div className="mt-4 admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
        {message ? <div className="mt-4 admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

        <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_140px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">生成数量</label>
            <select value={count} onChange={(event) => setCount(Number(event.target.value))} className={inputClass}>
              {[5, 10, 20, 50].map((item) => (
                <option key={item} value={item}>
                  {item} 个
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">备注</label>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：四月活动、内测用户" className={inputClass} />
          </div>

          <div className="flex items-end">
            <button type="submit" disabled={saving} className="admin-primary-btn w-full px-4 py-2.5">
              {saving ? "生成中..." : "生成邀请码"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-panel p-5">
        <h2 className="mb-4 text-lg font-semibold text-foreground">最近邀请码</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">正在加载邀请码列表...</p>
        ) : inviteCodes.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">邀请码</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-3 py-3 font-medium">备注</th>
                  <th className="px-3 py-3 font-medium">创建时间</th>
                  <th className="px-3 py-3 font-medium">使用人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inviteCodes.map((item) => (
                  <tr key={item.code} className="bg-background">
                    <td className="px-3 py-3 font-mono text-sm font-semibold text-foreground">{item.code}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusColor(item.status))}>
                        {item.status === "used" ? "已使用" : "未使用"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{item.note || "-"}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{item.usedByUsername || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">还没有生成过邀请码。</p>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-panel px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

const inputClass = "admin-input"
