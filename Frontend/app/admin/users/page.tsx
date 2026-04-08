"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, KeyRound, ShieldBan, ShieldCheck, ShieldOff, Sparkles, Trash2, Users } from "lucide-react"
import { MembershipBadge, getMembershipMeta } from "@/components/membership-badge"
import { fetchAdminUsers, updateAdminUser, updateAdminUserPassword, deleteAdminUser, type AdminUserItem } from "@/lib/admin-api"
import { cn } from "@/lib/utils"

type UserFilter = "all" | "active" | "disabled" | "banned"

type MembershipDraft = {
  level: string
}

const filters: Array<{ key: UserFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "active", label: "正常" },
  { key: "disabled", label: "禁用" },
  { key: "banned", label: "封禁" },
]

const membershipOptions = [
  { value: "free", label: "注册会员", icon: ShieldCheck },
  { value: "sponsor", label: "黄金会员", icon: Award },
  { value: "premium", label: "白金会员", icon: Sparkles },
  { value: "lifetime", label: "终生会员", icon: KeyRound },
  { value: "supreme", label: "至尊会员", icon: Sparkles },
]

function statusLabel(status?: string) {
  if (status === "disabled") return "已禁用"
  if (status === "banned") return "已封禁"
  return "正常"
}

function normalizeMembershipLevel(level?: string) {
  const value = String(level || "").trim().toLowerCase()
  if (value === "member") return "sponsor"
  if (value === "vip") return "supreme"
  if (value === "premium") return "premium"
  if (value === "sponsor" || value === "lifetime" || value === "supreme" || value === "free") return value
  return "free"
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [membershipDrafts, setMembershipDrafts] = useState<Record<string, MembershipDraft>>({})

  const loadUsers = async () => {
    setLoading(true)
    setError("")

    try {
      const data = await fetchAdminUsers()
      setUsers(data.list)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "用户数据加载失败。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  useEffect(() => {
    if (!expandedUserId) return
    const current = users.find((item) => item.id === expandedUserId)
    if (!current) return
    setMembershipDrafts((state) => ({
      ...state,
      [expandedUserId]: { level: normalizeMembershipLevel(current.membershipLevel) },
    }))
  }, [expandedUserId, users])

  const visibleUsers = useMemo(() => {
    if (activeFilter === "all") return users
    return users.filter((item) => {
      if (activeFilter === "active") return !item.status || item.status === "active"
      return item.status === activeFilter
    })
  }, [activeFilter, users])

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((item) => !item.status || item.status === "active").length,
      disabled: users.filter((item) => item.status === "disabled").length,
      banned: users.filter((item) => item.status === "banned").length,
    }),
    [users],
  )

  const toggleExpanded = (user: AdminUserItem) => {
    setMessage("")
    setExpandedUserId((current) => (current === user.id ? null : user.id))
    setMembershipDrafts((state) => ({
      ...state,
      [user.id]: { level: normalizeMembershipLevel(user.membershipLevel) },
    }))
  }

  const handleStatusUpdate = async (user: AdminUserItem, nextStatus: string) => {
    setMessage("")
    try {
      await updateAdminUser(user.id, { status: nextStatus })
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)))
      setMessage("用户状态已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "用户状态更新失败。")
    }
  }

  const handleMembershipUpdate = async (user: AdminUserItem) => {
    const draft = membershipDrafts[user.id]
    const nextLevel = normalizeMembershipLevel(draft?.level || user.membershipLevel)

    try {
      await updateAdminUser(user.id, { membershipLevel: nextLevel })
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, membershipLevel: nextLevel } : item)))
      setMessage("会员等级已更新。")
      setExpandedUserId(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "会员等级更新失败。")
    }
  }

  const handleBanDays = async (user: AdminUserItem) => {
    const value = window.prompt("请输入封禁天数，输入 0 表示解除封禁", "7")
    if (value === null) return

    const days = Number(value)
    if (Number.isNaN(days) || days < 0) return

    try {
      await updateAdminUser(user.id, { banDays: days })
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, status: days > 0 ? "banned" : "active" } : item)))
      setMessage("封禁状态已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "封禁操作失败。")
    }
  }

  const handlePermissionToggle = async (user: AdminUserItem, key: "canComment" | "canSubmitRequest" | "canReply") => {
    try {
      const nextValue = !Boolean(user[key])
      await updateAdminUser(user.id, { [key]: nextValue })
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, [key]: nextValue } : item)))
      setMessage("权限已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "权限更新失败。")
    }
  }

  const handlePasswordReset = async (user: AdminUserItem) => {
    const password = window.prompt("请输入新密码")
    if (!password) return

    try {
      await updateAdminUserPassword(user.id, password)
      setMessage("密码已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "密码修改失败。")
    }
  }

  const handleDelete = async (user: AdminUserItem) => {
    if (!window.confirm(`确定删除用户“${user.username}”吗？`)) return

    try {
      await deleteAdminUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setMessage("用户已删除。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "用户删除失败。")
    }
  }

  return (
    <div className="space-y-6">
      <div className="admin-hero">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">用户管理</h1>
              <p className="mt-1 text-sm text-muted-foreground">管理注册用户的状态、等级、权限和密码。</p>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="总用户" value={stats.total} />
        <StatCard label="正常" value={stats.active} />
        <StatCard label="禁用" value={stats.disabled} />
        <StatCard label="封禁" value={stats.banned} />
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = item.key === activeFilter
          return (
            <button
              key={item.key}
              onClick={() => setActiveFilter(item.key)}
              className={cn("rounded-full border px-4 py-2 text-sm transition", active ? "admin-pill-active" : "admin-pill-idle")}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <section className="admin-panel p-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">正在加载用户数据...</div>
        ) : visibleUsers.length ? (
          <div className="space-y-3">
            {visibleUsers.map((user) => {
              const expanded = expandedUserId === user.id
              const draftLevel = membershipDrafts[user.id]?.level || normalizeMembershipLevel(user.membershipLevel)
              const currentMeta = getMembershipMeta(draftLevel)
              const CurrentIcon = currentMeta.icon

              return (
                <article key={user.id} className="rounded-[24px] border border-border bg-background p-5">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">{user.name || user.username}</h2>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">{statusLabel(user.status)}</span>
                          <MembershipBadge level={user.membershipLevel} compact />
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                          <p>用户名：{user.username}</p>
                          <p>邮箱：{user.email || "-"}</p>
                          <p>手机号：{user.phone || "-"}</p>
                          <p>封禁到期：{user.banUntil || "-"}</p>
                          <p>允许评论：{user.canComment ? "是" : "否"}</p>
                          <p>允许提交需求：{user.canSubmitRequest ? "是" : "否"}</p>
                        </div>
                      </div>

                      <button onClick={() => toggleExpanded(user)} className="admin-secondary-btn inline-flex items-center justify-center px-4 py-2.5">
                        {expanded ? "收起操作" : "展开操作"}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="space-y-4 rounded-2xl border border-border/80 bg-secondary/30 p-4">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_1fr]">
                          <div className="rounded-2xl border border-border bg-background p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">会员等级</p>
                            <div className="mt-3 flex items-center gap-3">
                              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold", currentMeta.className)}>
                                <CurrentIcon className="h-4 w-4" />
                                {currentMeta.label}
                              </span>
                            </div>
                            <label className="mt-4 block text-sm font-medium text-foreground">选择等级</label>
                            <select
                              value={draftLevel}
                              onChange={(event) =>
                                setMembershipDrafts((state) => ({
                                  ...state,
                                  [user.id]: { level: event.target.value },
                                }))
                              }
                              className="admin-input mt-2"
                            >
                              {membershipOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="mt-3 flex justify-end">
                              <button onClick={() => void handleMembershipUpdate(user)} className="admin-primary-btn px-4 py-2.5">
                                保存等级
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <button onClick={() => void handleStatusUpdate(user, user.status === "disabled" ? "active" : "disabled")} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                              {user.status === "disabled" ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                              {user.status === "disabled" ? "启用" : "禁用"}
                            </button>
                            <button onClick={() => void handleBanDays(user)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                              <ShieldBan className="h-4 w-4" />
                              封禁
                            </button>
                            <button onClick={() => void handlePermissionToggle(user, "canComment")} className="admin-secondary-btn px-4 py-2.5">
                              评论权限
                            </button>
                            <button onClick={() => void handlePermissionToggle(user, "canSubmitRequest")} className="admin-secondary-btn px-4 py-2.5">
                              需求权限
                            </button>
                            <button onClick={() => void handlePermissionToggle(user, "canReply")} className="admin-secondary-btn px-4 py-2.5">
                              回复权限
                            </button>
                            <button onClick={() => void handlePasswordReset(user)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                              <KeyRound className="h-4 w-4" />
                              改密码
                            </button>
                            <button onClick={() => void handleDelete(user)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:col-span-2 xl:col-span-1">
                              <Trash2 className="h-4 w-4" />
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">当前筛选下没有用户。</div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-panel px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
    </div>
  )
}
