"use client"

import Image from "next/image"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Bookmark, CreditCard, LogOut, Mail, MessageSquare, RefreshCw, Trash2, User as UserIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { AppIcon } from "@/components/app-icon"
import { MembershipBadge, getMembershipMeta } from "@/components/membership-badge"
import { AvatarPicker } from "@/components/avatar-picker"
import { useAppContext } from "@/components/app-provider"
import { createRechargeOrder, deleteUserInbox, fetchMembershipLevels, fetchUserBalance, fetchUserInbox, fetchUserOrders, markUserInboxRead, upgradeMembershipLevel } from "@/lib/admin-api"
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
import { buildAuthUrl, cn } from "@/lib/utils"

type TabKey = "profile" | "favorites" | "requests" | "recharge" | "messages"

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "资料" },
  { key: "favorites", label: "收藏" },
  { key: "requests", label: "需求" },
  { key: "recharge", label: "充值" },
  { key: "messages", label: "消息中心" },
]

const rechargeOptions = [10, 30, 50, 100]

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
  if (status === "success" || status === "paid") return "已完成"
  if (status === "pending") return "处理中"
  if (status === "failed" || status === "cancelled") return "失败"
  if (status === "refunded") return "已退款"
  return status
}

function PaymentOption({ icon, label, active, onClick, color }: {
  icon: string; label: string; active: boolean; onClick: () => void; color: "green" | "blue";
}) {
  const borderClass = active
    ? color === "green"
      ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30 dark:bg-emerald-950/20 dark:border-emerald-400"
      : "border-sky-500 bg-sky-50/60 ring-1 ring-sky-500/30 dark:bg-sky-950/20 dark:border-sky-400"
    : "border-border bg-background hover:border-primary/30"

  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 transition-all", borderClass)}>
      <span className={cn(
        "text-base font-bold",
        active ? color === "green" ? "text-emerald-600 dark:text-emerald-300" : "text-sky-600 dark:text-sky-300" : "text-muted-foreground"
      )}>{icon}</span>
      <span className={cn(
        "text-sm font-medium",
        active ? "text-foreground" : "text-muted-foreground"
      )}>{label}</span>
      {active && <span className={cn("ml-auto h-2 w-2 rounded-full", color === "green" ? "bg-emerald-500" : "bg-sky-500")} />}
    </button>
  )
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabKey | null) ?? "profile"
  const shouldAutoOpenUpgrade = searchParams.get("upgrade") === "1"
  const { token, logout, refreshSession, unreadCount, refreshUnreadCount } = useAppContext()

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
  const [customAmount, setCustomAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat")
  const [balanceData, setBalanceData] = useState<{ balance: number; membershipLevel: string } | null>(null)
  const [ordersData, setOrdersData] = useState<Array<{ id: string; orderNo: string; amount: number; bonusAmount: number; totalAmount: number; paymentMethod: string; paymentStatus: string; createdAt: string }>>([])
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState<{ orderNo: string; amount: number; bonusAmount: number; paymentMethod: string } | null>(null)
  const [membershipLevels, setMembershipLevels] = useState<Array<{ key: string; name: string; description: string | null; sortOrder: number; rechargePrice: number; color: string; isActive: boolean }>>([])
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [selectedUpgradeLevelKey, setSelectedUpgradeLevelKey] = useState("")

  const currentAmount = customAmount ? Number(customAmount) : (rechargeOptions[selectedRecharge] ?? 0)

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

  const loadProfile = useCallback(async () => {
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
  }, [token])

  const loadInbox = useCallback(async () => {
    if (!token) return

    setInboxLoading(true)
    try {
      const data = await fetchUserInbox()
      setInbox(data.list)
      await refreshUnreadCount()
    } catch {
      setInbox([])
    } finally {
      setInboxLoading(false)
    }
  }, [token, refreshUnreadCount])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (activeTab === "messages") {
      void loadInbox()
    }
  }, [activeTab, loadInbox])

  const loadRechargeData = useCallback(async () => {
    if (!token) return
    setRechargeLoading(true)
    try {
      const [balance, orders] = await Promise.all([fetchUserBalance(), fetchUserOrders()])
      setBalanceData(balance)
      setOrdersData(orders.orders)
    } catch {
      // Silently fail - use profile fallback
    } finally {
      setRechargeLoading(false)
    }
  }, [token])

  const loadMembershipLevels = useCallback(async () => {
    if (!token) return

    try {
      const data = await fetchMembershipLevels()
      const nextLevels = data.levels.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
      setMembershipLevels(nextLevels)

      const currentLevel = profile?.user.membershipLevel
      const currentLevelConfig = nextLevels.find((item) => item.key === currentLevel)
      const currentSortOrder = currentLevelConfig?.sortOrder ?? Number.NEGATIVE_INFINITY
      const upgradeCandidates = nextLevels.filter((item) => item.key !== currentLevel && item.sortOrder > currentSortOrder)
      setSelectedUpgradeLevelKey((prev) => {
        if (prev && upgradeCandidates.some((item) => item.key === prev)) return prev
        return upgradeCandidates[0]?.key ?? ""
      })
    } catch {
      setMembershipLevels([])
      setSelectedUpgradeLevelKey("")
    }
  }, [profile?.user.membershipLevel, token])

  const upgradeCandidates = useMemo(() => {
    if (!profile) return []
    const currentLevel = profile.user.membershipLevel
    const currentLevelConfig = membershipLevels.find((item) => item.key === currentLevel)
    const currentSortOrder = currentLevelConfig?.sortOrder ?? Number.NEGATIVE_INFINITY
    return membershipLevels.filter((item) => item.key !== currentLevel && item.sortOrder > currentSortOrder)
  }, [membershipLevels, profile])

  useEffect(() => {
    if (activeTab === "recharge") {
      void loadRechargeData()
    }
  }, [activeTab, loadRechargeData])

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
      await refreshUnreadCount()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "标记已读失败。")
    }
  }

  const handleDeleteInbox = async (item: InboxItem) => {
    if (!token) return

    try {
      await deleteUserInbox(item.id)
      setInbox((current) => current.filter((entry) => entry.id !== item.id))
      await refreshUnreadCount()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除消息失败。")
    }
  }

  const handleRecharge = async () => {
    if (!token || !currentAmount) return

    setRecharging(true)
    setError("")
    setSaveMessage("")

    try {
      const order = await createRechargeOrder({
        amount: currentAmount,
        paymentMethod: paymentMethod,
      })

      setShowPaymentDialog({
        orderNo: order.order.orderNo,
        amount: order.order.amount,
        bonusAmount: order.order.bonusAmount,
        paymentMethod: order.order.paymentMethod,
      })
      await loadRechargeData()
      await refreshSession()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "充值失败，请稍后再试。")
    } finally {
      setRecharging(false)
    }
  }

  const openUpgradeDialog = useCallback(async () => {
    setActiveTab("recharge")
    setUpgradeDialogOpen(true)
    setError("")
    setSaveMessage("")
    await loadMembershipLevels()
  }, [loadMembershipLevels])

  useEffect(() => {
    if (activeTab !== "recharge" || !shouldAutoOpenUpgrade || upgradeDialogOpen) {
      return
    }

    void openUpgradeDialog()
  }, [activeTab, openUpgradeDialog, shouldAutoOpenUpgrade, upgradeDialogOpen])

  const handleUpgradeMembership = async () => {
    if (!selectedUpgradeLevelKey) {
      setError("请选择要升级的会员等级。")
      return
    }

    setUpgradeLoading(true)
    setError("")
    setSaveMessage("")

    try {
      const result = await upgradeMembershipLevel(selectedUpgradeLevelKey)
      setBalanceData((current) => (current ? { ...current, balance: result.balance, membershipLevel: result.membershipLevel } : current))
      setUpgradeDialogOpen(false)
      setSelectedUpgradeLevelKey("")
      setSaveMessage("会员已经升级完成。")
      await refreshSession()
      await loadProfile()
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "升级失败，请稍后再试。"
      if (message.includes("余额不足")) {
        setUpgradeDialogOpen(false)
        router.replace("/profile?tab=recharge")
        setActiveTab("recharge")
      }
      setError(message)
    } finally {
      setUpgradeLoading(false)
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
            <Link href={buildAuthUrl("/login", "/profile")} className="mt-6 inline-block rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
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
                <Image
                  src={form.avatar}
                  alt={profile.user.name || profile.user.username}
                  width={80}
                  height={80}
                  unoptimized
                  className="mx-auto h-20 w-20 rounded-3xl object-cover"
                />
                <h1 className="mx-auto mt-4 w-full max-w-full truncate text-xl font-black text-foreground">{profile.user.name || profile.user.username}</h1>
                <p className="mx-auto mt-1 w-full max-w-full truncate text-sm text-muted-foreground">@{profile.user.username}</p>
                <button
                  type="button"
                  onClick={() => void openUpgradeDialog()}
                  className="mt-3 inline-flex items-center gap-2 rounded-full transition hover:scale-[1.01]"
                  aria-label="升级会员等级"
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full border",
                      getMembershipMeta(profile.user.membershipLevel).className,
                    )}
                  >
                    {(() => {
                      const Icon = getMembershipMeta(profile.user.membershipLevel).icon
                      return <Icon className="h-4 w-4" />
                    })()}
                  </span>
                  <MembershipBadge level={profile.user.membershipLevel} />
                </button>
                <p className="mt-2 text-xs text-muted-foreground">今日剩余下载 {profile.permissions.remainingDownloads}</p>
                <p className="mt-1 text-xs text-muted-foreground">当前余额 {typeof balanceData?.balance === "number" ? balanceData.balance.toFixed(2) : Number(profile.user.balance ?? 0).toFixed(2)} 元</p>
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
                      <span className="flex items-center justify-between gap-2">
                        <span>{tab.label}</span>
                        {tab.key === "messages" && unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </span>
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
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-foreground">消息中心</h2>
                        {unreadCount > 0 ? (
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </div>
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
                <div className="space-y-6">
                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">账户余额</p>
                        <p className="mt-0.5 text-3xl font-black tabular-nums text-foreground">
                          {typeof balanceData?.balance === "number"
                            ? balanceData.balance.toFixed(2)
                            : typeof profile.user.balance !== "undefined"
                            ? Number(profile.user.balance).toFixed(2)
                            : "0.00"}
                          <span className="ml-1.5 text-base font-medium text-muted-foreground">元</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-accent" />
                      <h2 className="text-lg font-bold text-foreground">余额充值</h2>
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">选择充值金额</label>
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {rechargeOptions.map((amount, idx) => {
                          const isSelected = selectedRecharge === idx && !customAmount
                          return (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => {
                                setSelectedRecharge(idx)
                                setCustomAmount("")
                              }}
                              className={cn(
                                "rounded-xl border py-3 text-sm font-semibold transition-all",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                  : "border-border bg-background hover:border-primary/30 hover:bg-secondary/40",
                              )}
                            >
                              {amount} 元
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground">自定义金额</label>
                      <input
                        type="number"
                        min={1}
                        value={customAmount}
                        onChange={(event) => {
                          setCustomAmount(event.target.value)
                          setSelectedRecharge(-1)
                        }}
                        placeholder="输入金额..."
                        className="w-full max-w-[240px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">选择支付方式</label>
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                        <PaymentOption
                          icon="微"
                          label="微信支付"
                          active={paymentMethod === "wechat"}
                          onClick={() => setPaymentMethod("wechat")}
                          color="green"
                        />
                        <PaymentOption
                          icon="支"
                          label="支付宝"
                          active={paymentMethod === "alipay"}
                          onClick={() => setPaymentMethod("alipay")}
                          color="blue"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleRecharge}
                      disabled={recharging || !currentAmount}
                      className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition hover:shadow-lg hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {recharging ? "处理中..." : `立即充值 ${currentAmount || 0} 元`}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">充值记录</h3>
                    {rechargeLoading ? (
                      <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">加载中...</div>
                    ) : ordersData.length > 0 ? (
                      <div className="overflow-hidden rounded-2xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-secondary/40">
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">金额</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">赠送</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">方式</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">状态</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ordersData.map((order) => (
                              <tr key={order.id} className="border-b border-border/60 last:border-b-0">
                                <td className="px-4 py-3 font-semibold tabular-nums text-foreground">{order.totalAmount.toFixed(2)} 元</td>
                                <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-300">
                                  {order.bonusAmount > 0 ? <span>+{order.bonusAmount.toFixed(2)}</span> : <span className="text-muted-foreground">-</span>}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{order.paymentMethod === "wechat" ? "微信支付" : order.paymentMethod === "alipay" ? "支付宝" : order.paymentMethod}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                      order.paymentStatus === "success" || order.paymentStatus === "paid"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        : order.paymentStatus === "pending"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                                    )}
                                  >
                                    {rechargeStatusLabel(order.paymentStatus)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{order.createdAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : profile.rechargeRecords.length > 0 ? (
                      <div className="overflow-hidden rounded-2xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-secondary/40">
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">金额</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">方式</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">状态</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.rechargeRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border/60 last:border-b-0">
                                <td className="px-4 py-3 font-semibold tabular-nums text-foreground">{record.amount} 元</td>
                                <td className="px-4 py-3 text-muted-foreground">{record.description || "-"}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                      record.status === "success" || record.status === "paid"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        : record.status === "pending"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                                    )}
                                  >
                                    {rechargeStatusLabel(record.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{record.createdAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">还没有充值记录</div>
                    )}
                  </div>

                  <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                    <DialogContent className="max-w-xl rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">升级会员等级</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                          选择你要升级到的会员等级，系统会自动读取对应费用并优先扣除余额。
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3">
                        {upgradeCandidates.length > 0 ? (
                          upgradeCandidates
                            .map((item) => {
                              const selected = selectedUpgradeLevelKey === item.key
                              const levelMeta = getMembershipMeta(item.key)
                              const LevelIcon = levelMeta.icon
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => setSelectedUpgradeLevelKey(item.key)}
                                  className={cn(
                                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                                    selected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30",
                                  )}
                                  >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border", levelMeta.className)}>
                                      <LevelIcon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {item.description || "暂无说明"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-foreground">{item.rechargePrice.toFixed(2)} 元</p>
                                    <p className="mt-1 text-xs text-muted-foreground">余额优先扣除</p>
                                  </div>
                                </button>
                              )
                            })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            当前已是最高等级，暂无可升级选项。
                          </div>
                        )}
                      </div>

                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setUpgradeDialogOpen(false)}
                          className="rounded-2xl"
                        >
                          取消
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void handleUpgradeMembership()}
                          disabled={upgradeLoading || !selectedUpgradeLevelKey}
                          className="rounded-2xl"
                        >
                          {upgradeLoading ? "升级中..." : "确认升级"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {showPaymentDialog ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-foreground">请扫码支付</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          支付方式：{showPaymentDialog.paymentMethod === "wechat" ? "微信支付" : "支付宝"}
                        </p>
                        <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center">
                          <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-xl bg-white text-4xl font-black text-slate-300">
                            {showPaymentDialog.paymentMethod === "wechat" ? "微" : "支"}
                          </div>
                          <p className="text-xs text-muted-foreground">扫码支付</p>
                        </div>
                        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">订单号</span>
                            <span className="font-mono text-foreground">{showPaymentDialog.orderNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">金额</span>
                            <span className="font-bold text-foreground">{showPaymentDialog.amount.toFixed(2)} 元</span>
                          </div>
                          {showPaymentDialog.bonusAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">赠送</span>
                              <span className="font-medium text-emerald-600 dark:text-emerald-300">+{showPaymentDialog.bonusAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-center text-xs text-muted-foreground">支付完成后，余额将自动到账</p>
                        <button
                          onClick={() => setShowPaymentDialog(null)}
                          className="mt-4 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  ) : null}
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



