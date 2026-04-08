"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Bookmark, CreditCard, LogOut, Mail, MessageSquare, RefreshCw, Trash2, User as UserIcon } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { AppIcon } from "@/components/app-icon"
import { MembershipBadge } from "@/components/membership-badge"
import { AvatarPicker } from "@/components/avatar-picker"
import { useAppContext } from "@/components/app-provider"
import { deleteUserInbox, fetchUserInbox, markUserInboxRead } from "@/lib/admin-api"
import {
  request,
  type InboxItem,
  type AppSummary,
  type PostSummary,
  type ProfilePayload,
  type RechargeRecord,
  type RequestItem,
  type User,
} from "@/lib/api"
import { type AvatarGender } from "@/lib/avatar-random"
import { cn } from "@/lib/utils"

type TabKey = "profile" | "favorites" | "requests" | "recharge" | "messages"

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "资料" },
  { key: "favorites", label: "收藏" },
  { key: "requests", label: "需求" },
  { key: "recharge", label: "充值" },
  { key: "messages", label: "消息中心" },
]

const rechargeOptions = [18, 68, 168]

function statusLabel(status: RequestItem["status"]) {
  if (status === "done") return "已完成"
  if (status === "processing") return "处理中"
  if (status === "rejected") return "已关闭"
  return "待回复"
}

function genderText(value: string) {
  if (value === "male") return "男"
  if (value === "female") return "女"
  return "其他"
}

function FavoriteApps({ items }: { items: AppSummary[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">还没有收藏的软件。</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link key={item.slug} href={`/software/${item.slug}`} className="block rounded-2xl border border-border bg-background p-4 transition hover:border-primary/25">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary text-xs font-black text-foreground">
              <AppIcon value={item.icon} name={item.name} className="flex h-full w-full items-center justify-center" imageClassName="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-foreground">{item.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summaryText}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function InboxList({
  items,
  loading,
  onMarkRead,
  onDelete,
}: {
  items: InboxItem[]
  loading: boolean
  onMarkRead: (item: InboxItem) => Promise<void>
  onDelete: (item: InboxItem) => Promise<void>
}) {
  if (loading) {
    return <div className="rounded-3xl border border-border bg-background p-6 text-sm text-muted-foreground">消息加载中...</div>
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-center">
        <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">暂时还没有消息。</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className={cn(
            "rounded-3xl border p-5 transition",
            item.read ? "border-border bg-background" : "border-accent/20 bg-accent/5",
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                  {item.kind === "message" ? "站内信" : "通知"}
                </span>
                <span className="text-xs text-muted-foreground">{item.senderName || "系统消息"}</span>
                <span className="text-xs text-muted-foreground">{item.createdAt}</span>
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.content}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!item.read ? (
                <button
                  onClick={() => void onMarkRead(item)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/30 hover:text-accent"
                >
                  标记已读
                </button>
              ) : null}
              <button
                onClick={() => void onDelete(item)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-destructive/30 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </div>
          </div>
          {item.actionUrl ? (
            <Link
              href={item.actionUrl}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              查看详情
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function FavoritePosts({ items }: { items: PostSummary[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">还没有收藏的文章。</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link key={item.slug} href={`/news/${item.slug}`} className="block rounded-2xl border border-border bg-background p-4 transition hover:border-primary/25">
          <p className="text-base font-bold text-foreground">{item.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.excerpt}</p>
        </Link>
      ))}
    </div>
  )
}

function rechargeStatusLabel(status: string) {
  if (status === "success") return "已完成"
  if (status === "pending") return "处理中"
  if (status === "failed") return "失败"
  return status
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabKey | null) ?? "profile"
  const { token, logout, refreshSession } = useAppContext()

  const [activeTab, setActiveTab] = useState<TabKey>(tabs.some((item) => item.key === initialTab) ? initialTab : "profile")
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [selectedRecharge, setSelectedRecharge] = useState(0)
  const [recharging, setRecharging] = useState(false)
  const [form, setForm] = useState({
    name: "",
    gender: "other" as AvatarGender,
    currentPassword: "",
    newPassword: "",
    avatar: "",
  })

  useEffect(() => {
    if (tabs.some((item) => item.key === initialTab)) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const loadProfile = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const data = await request<ProfilePayload>("/api/auth/profile", { token })
      setProfile(data)
      setForm({
        name: data.user.name || "",
        gender: (data.user.gender as AvatarGender) || "other",
        currentPassword: "",
        newPassword: "",
        avatar: data.user.avatar || "",
      })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "个人资料加载失败，请稍后再试。")
    } finally {
      setLoading(false)
    }
  }

  const loadInbox = async () => {
    if (!token) return

    setInboxLoading(true)
    try {
      const data = await fetchUserInbox()
      setInbox(data.list)
    } catch {
      setInbox([])
    } finally {
      setInboxLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [token])

  useEffect(() => {
    if (activeTab === "messages") {
      void loadInbox()
    }
  }, [activeTab, token])

  const stats = useMemo(
    () => ({
      favorites: (profile?.favorites.apps.length ?? 0) + (profile?.favorites.posts.length ?? 0),
      requests: profile?.requests.length ?? 0,
      comments: profile?.comments.length ?? 0,
      recharge: profile?.rechargeRecords.length ?? 0,
    }),
    [profile],
  )

  const handleSave = async () => {
    if (!token) return

    setSaving(true)
    setError("")
    setSaveMessage("")

    try {
      const payload = await request<{ user: User }>("/api/auth/profile", {
        method: "PUT",
        token,
        body: JSON.stringify({
          name: form.name.trim(),
          gender: form.gender,
          avatar: form.avatar,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined,
        }),
      })

      setProfile((current) => (current ? { ...current, user: payload.user } : current))
      setForm((current) => ({ ...current, currentPassword: "", newPassword: "" }))
      setSaveMessage("资料已经保存。")
      await refreshSession()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败，请稍后再试。")
    } finally {
      setSaving(false)
    }
  }

  const handleMarkInboxRead = async (item: InboxItem) => {
    if (!token) return

    try {
      await markUserInboxRead(item.id)
      setInbox((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "标记已读失败。")
    }
  }

  const handleDeleteInbox = async (item: InboxItem) => {
    if (!token) return

    try {
      await deleteUserInbox(item.id)
      setInbox((current) => current.filter((entry) => entry.id !== item.id))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除消息失败。")
    }
  }

  const handleRecharge = async () => {
    if (!token) return

    setRecharging(true)
    setError("")
    setSaveMessage("")

    try {
      const records = await request<RechargeRecord[]>("/api/auth/recharge", {
        method: "POST",
        token,
        body: JSON.stringify({ amount: rechargeOptions[selectedRecharge] }),
      })

      setProfile((current) => (current ? { ...current, rechargeRecords: records } : current))
      setSaveMessage("充值记录已经更新。")
      await refreshSession()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "充值失败，请稍后再试。")
    } finally {
      setRecharging(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
          <section className="rounded-3xl border border-border bg-card p-10">
            <UserIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-black text-foreground">请先登录</h1>
            <p className="mt-2 text-sm text-muted-foreground">登录后才能查看和修改自己的头像、资料与记录。</p>
            <Link href="/login" className="mt-6 inline-block rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              去登录
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {loading ? (
          <section className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">个人资料加载中...</section>
        ) : error && !profile ? (
          <section className="rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadProfile}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </section>
        ) : profile ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-3xl border border-border bg-card p-6 text-center">
                <img src={form.avatar} alt={profile.user.name || profile.user.username} className="mx-auto h-20 w-20 rounded-3xl object-cover" />
                <h1 className="mt-4 text-xl font-black text-foreground">{profile.user.name || profile.user.username}</h1>
                <p className="mt-1 text-sm text-muted-foreground">@{profile.user.username}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <MembershipBadge level={profile.user.membershipLevel} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">今日剩余下载 {profile.permissions.remainingDownloads}</p>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">收藏</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{stats.favorites}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">需求</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{stats.requests}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">评论</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{stats.comments}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">充值记录</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{stats.recharge}</p>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-card p-3">
                <div className="flex flex-col gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key)
                        router.replace(`/profile?tab=${tab.key}`)
                      }}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-left text-sm transition",
                        activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </section>

              <button
                onClick={() => {
                  logout()
                  router.push("/")
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </aside>

            <section className="rounded-3xl border border-border bg-card p-6">
              {error ? <p className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
              {saveMessage ? <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground">{saveMessage}</p> : null}

              {activeTab === "profile" ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-foreground">个人资料</h2>
                    <p className="mt-2 text-sm text-muted-foreground">这里可以修改头像、显示名称、性别和密码。</p>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-foreground">更换头像</label>
                    <AvatarPicker
                      value={form.avatar}
                      onChange={(avatar) => setForm((current) => ({ ...current, avatar }))}
                      gender={form.gender}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">用户名</label>
                      <input value={profile.user.username} disabled className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">邮箱</label>
                      <input value={profile.user.email ?? ""} disabled className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">显示名称</label>
                      <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">性别</label>
                      <div className="flex gap-2">
                        {(["male", "female", "other"] as AvatarGender[]).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, gender: value }))}
                            className={cn(
                              "flex-1 rounded-2xl border px-4 py-3 text-sm transition",
                              form.gender === value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {genderText(value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">当前密码</label>
                      <input
                        type="password"
                        value={form.currentPassword}
                        onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">新密码</label>
                      <input
                        type="password"
                        value={form.newPassword}
                        onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                  >
                    {saving ? "保存中..." : "保存资料"}
                  </button>
                </div>
              ) : null}

              {activeTab === "messages" ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-foreground">消息中心</h2>
                      <p className="mt-2 text-sm text-muted-foreground">这里会显示站内通知和站内信，你可以标记已读或者直接删除。</p>
                    </div>
                    <button
                      onClick={() => void loadInbox()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/30 hover:text-accent"
                    >
                      <RefreshCw className="h-4 w-4" />
                      刷新
                    </button>
                  </div>
                  <InboxList items={inbox} loading={inboxLoading} onMarkRead={handleMarkInboxRead} onDelete={handleDeleteInbox} />
                </div>
              ) : null}

              {activeTab === "favorites" ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-accent" />
                    <h2 className="text-2xl font-black text-foreground">我的收藏</h2>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-foreground">收藏的软件</h3>
                    <FavoriteApps items={profile.favorites.apps} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-foreground">收藏的文章</h3>
                    <FavoritePosts items={profile.favorites.posts} />
                  </div>
                </div>
              ) : null}

              {activeTab === "requests" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-accent" />
                    <h2 className="text-2xl font-black text-foreground">我的需求</h2>
                  </div>
                  {profile.requests.length ? (
                    profile.requests.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-secondary px-2 py-1 font-medium text-foreground">{statusLabel(item.status)}</span>
                          <span>{item.createdAt}</span>
                        </div>
                        <p className="mt-3 text-base font-bold text-foreground">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                        {item.adminReply ? <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm text-muted-foreground">站内回复：{item.adminReply}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">你还没有提交过需求。</p>
                  )}
                </div>
              ) : null}

              {activeTab === "recharge" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <h2 className="text-2xl font-black text-foreground">充值与记录</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">选择金额后提交，页面会同步更新你的充值记录。</p>
                  <div className="flex flex-wrap gap-3">
                    {rechargeOptions.map((amount, index) => (
                      <button
                        key={amount}
                        onClick={() => setSelectedRecharge(index)}
                        className={cn(
                          "rounded-2xl border px-5 py-3 text-sm transition",
                          selectedRecharge === index ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {amount} 元
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleRecharge}
                    disabled={recharging}
                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                  >
                    {recharging ? "处理中..." : `提交 ${rechargeOptions[selectedRecharge]} 元充值`}
                  </button>

                  <div className="space-y-3">
                    {profile.rechargeRecords.length ? (
                      profile.rechargeRecords.map((record) => (
                        <div key={record.id} className="rounded-2xl border border-border bg-background p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-base font-bold text-foreground">{record.amount} 元</p>
                              <p className="mt-1 text-sm text-muted-foreground">{record.description}</p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>{rechargeStatusLabel(record.status)}</p>
                              <p className="mt-1">{record.createdAt}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">还没有充值记录。</p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProfileContent />
    </Suspense>
  )
}
