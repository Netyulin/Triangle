"use client"

import { KeyRound, ShieldBan, ShieldCheck, ShieldOff, Smartphone, Trash2, Users } from "lucide-react"
import { MembershipBadge, getMembershipMeta } from "@/components/membership-badge"
import { formatDateTime, updateAdminUser } from "@/lib/admin-api"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/admin/page-header"
import { filters, membershipOptions, normalizeMembershipLevel, shortUdid, statusLabel } from "./users-shared"
import { useAdminUsers } from "./use-admin-users"

export default function AdminUsersPageContent() {
  const {
    activeFilter,
    deviceLoadingUserId,
    deviceMap,
    error,
    expandedUserId,
    handleBanDays,
    handleCreateDevice,
    handleDelete,
    handleDeleteDevice,
    handleEditDevice,
    handleMembershipUpdate,
    handlePasswordReset,
    handlePermissionToggle,
    handleStatusUpdate,
    loading,
    message,
    patchUser,
    setActiveFilter,
    setError,
    setMessage,
    stats,
    toggleExpanded,
    visibleUsers,
  } = useAdminUsers()

  return (
    <div className="space-y-5">
      <PageHeader
        title="用户管理"
        description="集中管理用户状态、会员等级、签名权限与 UDID 设备信息。"
        icon={<Users className="h-5 w-5" />}
        iconClassName="bg-slate-50 text-slate-600 dark:bg-slate-950/30 dark:text-slate-400"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="用户总数" value={stats.total} />
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
              const currentMeta = getMembershipMeta(normalizeMembershipLevel(user.membershipLevel))
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
                          {user.canSign ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">可签名</span> : null}
                          {user.canSelfSign ? <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">可自签</span> : null}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                          <p>用户名：{user.username}</p>
                          <p>邮箱：{user.email || "-"}</p>
                          <p>手机号：{user.phone || "-"}</p>
                          <p>注册时间：{formatDateTime(user.createdAt)}</p>
                          <p>最近登录：{user.lastLoginAt || "-"}</p>
                          <p>最近登录 IP：{user.lastLoginIp || "-"}</p>
                          <p>封禁到期：{user.banUntil || "-"}</p>
                          <p>当前等级：{currentMeta.label}</p>
                        </div>
                      </div>

                      <button onClick={() => void toggleExpanded(user)} className="admin-secondary-btn inline-flex items-center justify-center px-4 py-2.5">
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
                            <div className="mt-4 grid gap-2">
                              {membershipOptions.map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() =>
                                    void updateAdminUser(user.id, { membershipLevel: option.value })
                                      .then(() => {
                                        patchUser(user.id, { membershipLevel: option.value })
                                        setMessage("会员等级已更新。")
                                      })
                                      .catch((nextError) => {
                                        setError(nextError instanceof Error ? nextError.message : "会员等级更新失败。")
                                      })
                                  }
                                  className={cn(
                                    "rounded-2xl border px-3 py-2 text-left text-sm transition",
                                    normalizeMembershipLevel(user.membershipLevel) === option.value ? "border-primary bg-primary/5 text-primary" : "border-border bg-background",
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button onClick={() => void handleMembershipUpdate(user)} className="admin-secondary-btn px-4 py-2.5">
                                手动输入等级
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              <button onClick={() => void handleStatusUpdate(user, user.status === "disabled" ? "active" : "disabled")} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                                {user.status === "disabled" ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                                {user.status === "disabled" ? "启用账号" : "禁用账号"}
                              </button>
                              <button onClick={() => void handleBanDays(user)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                                <ShieldBan className="h-4 w-4" />
                                封禁账号
                              </button>
                              <button onClick={() => void handlePasswordReset(user)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                                <KeyRound className="h-4 w-4" />
                                修改密码
                              </button>
                              <button onClick={() => void handlePermissionToggle(user, "canComment")} className="admin-secondary-btn px-4 py-2.5">
                                评论权限：{user.canComment ? "开" : "关"}
                              </button>
                              <button onClick={() => void handlePermissionToggle(user, "canReply")} className="admin-secondary-btn px-4 py-2.5">
                                回复权限：{user.canReply ? "开" : "关"}
                              </button>
                              <button onClick={() => void handlePermissionToggle(user, "canSubmitRequest")} className="admin-secondary-btn px-4 py-2.5">
                                提需求权限：{user.canSubmitRequest ? "开" : "关"}
                              </button>
                              <button onClick={() => void handlePermissionToggle(user, "canSign")} className="admin-secondary-btn px-4 py-2.5">
                                签名权限：{user.canSign ? "开" : "关"}
                              </button>
                              <button onClick={() => void handlePermissionToggle(user, "canSelfSign")} className="admin-secondary-btn px-4 py-2.5">
                                自签权限：{user.canSelfSign ? "开" : "关"}
                              </button>
                              <button onClick={() => void handleDelete(user)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5">
                                <Trash2 className="h-4 w-4" />
                                删除用户
                              </button>
                            </div>

                            <div className="rounded-2xl border border-border bg-background p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">UDID 设备管理</p>
                                  <p className="mt-1 text-sm text-muted-foreground">管理员可直接为账号补录、修改或删除 UDID。</p>
                                </div>
                                <button onClick={() => void handleCreateDevice(user)} className="admin-primary-btn inline-flex items-center gap-2 px-4 py-2.5">
                                  <Smartphone className="h-4 w-4" />
                                  新增 UDID
                                </button>
                              </div>

                              <div className="mt-4 space-y-3">
                                {deviceLoadingUserId === user.id ? (
                                  <p className="text-sm text-muted-foreground">正在加载设备列表...</p>
                                ) : deviceMap[user.id]?.length ? (
                                  deviceMap[user.id].map((device) => (
                                    <div key={device.id} className="rounded-2xl border border-border/70 px-4 py-3">
                                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <p className="text-sm font-medium text-foreground">{device.deviceName || "未命名设备"}</p>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {device.product || "未知型号"} / {device.version || "未知系统"} / {shortUdid(device.udid)}
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <button onClick={() => void handleEditDevice(user, device)} className="admin-secondary-btn px-3 py-2 text-sm">
                                            编辑
                                          </button>
                                          <button onClick={() => void handleDeleteDevice(user, device)} className="admin-secondary-btn px-3 py-2 text-sm">
                                            删除
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">这个用户还没有录入任何 UDID。</p>
                                )}
                              </div>
                            </div>
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
