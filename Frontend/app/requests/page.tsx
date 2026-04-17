"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { useAppContext } from "@/components/app-provider"
import { request, type RequestItem, type RequestListPayload } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CheckCircle2, Clock3, LoaderCircle, MessageSquare, Plus, RefreshCw, Search, ThumbsUp, X, XCircle } from "lucide-react"

type FilterKey = "all" | RequestItem["status"]

const filterTabs: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待回复" },
  { key: "processing", label: "处理中" },
  { key: "done", label: "已完成" },
]

function statusMeta(status: RequestItem["status"]) {
  if (status === "done") return { label: "已完成", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 }
  if (status === "processing") return { label: "处理中", color: "bg-amber-100 text-amber-700", icon: LoaderCircle }
  if (status === "rejected") return { label: "已关闭", color: "bg-rose-100 text-rose-700", icon: XCircle }
  return { label: "待回复", color: "bg-secondary text-muted-foreground", icon: Clock3 }
}

export default function RequestsPage() {
  const router = useRouter()
  const { token, user, refreshSession } = useAppContext()

  const [items, setItems] = useState<RequestItem[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [keyword, setKeyword] = useState("")
  const [showMine, setShowMine] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [voteLoadingId, setVoteLoadingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    authorName: user?.name || user?.username || "",
    authorEmail: user?.email || "",
  })

  useEffect(() => {
    setForm((current) => ({
      ...current,
      authorName: user?.name || user?.username || current.authorName,
      authorEmail: user?.email || current.authorEmail,
    }))
  }, [user])

  const loadRequests = useCallback(async (mode = showMine) => {
    setLoading(true)
    setError("")
    try {
      const path = mode && token ? "/api/requests/mine?page=1&pageSize=50" : "/api/requests?page=1&pageSize=50"
      const data = await request<RequestListPayload>(path, token ? { token } : {})
      setItems(data.list)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "需求数据加载失败。")
    } finally {
      setLoading(false)
    }
  }, [showMine, token])

  useEffect(() => {
    void loadRequests(showMine)
  }, [showMine, loadRequests])

  const filteredItems = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return items.filter((item) => {
      const matchFilter = activeFilter === "all" || item.status === activeFilter
      const haystack = [item.title, item.description, item.authorName].join(" ").toLowerCase()
      return matchFilter && (!text || haystack.includes(text))
    })
  }, [activeFilter, items, keyword])

  const stats = useMemo(
    () => ({
      total: items.length,
      done: items.filter((item) => item.status === "done").length,
      mine: items.filter((item) => item.userId === user?.id).length,
    }),
    [items, user?.id],
  )

  const openMine = () => {
    if (!token) {
      router.push("/login")
      return
    }
    setShowMine((value) => !value)
  }

  const handleVote = async (item: RequestItem) => {
    if (!token) {
      router.push("/login")
      return
    }

    setVoteLoadingId(item.id)
    try {
      const result = await request<{ requestId: number; voteCount: number; userVoted: boolean }>(`/api/requests/${item.id}/vote`, {
        method: "POST",
        token,
        body: JSON.stringify({}),
      })

      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, voteCount: result.voteCount, userVoted: result.userVoted } : entry)),
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "支持失败，请稍后重试。")
    } finally {
      setVoteLoadingId(null)
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("请先把标题和说明填写完整。")
      return
    }

    if (!token && (!form.authorName.trim() || !form.authorEmail.trim())) {
      setFormError("未登录提交时，需要填写姓名和邮箱。")
      return
    }

    setSubmitting(true)
    setFormError("")

    try {
      await request<RequestItem>("/api/requests", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          ...(token
            ? {}
            : {
                authorName: form.authorName.trim(),
                authorEmail: form.authorEmail.trim(),
              }),
        }),
      })

      setForm({
        title: "",
        description: "",
        authorName: user?.name || user?.username || "",
        authorEmail: user?.email || "",
      })
      setShowModal(false)
      if (token) await refreshSession()
      await loadRequests(showMine)
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "提交失败，请稍后重试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-border bg-card p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">需求墙</p>
              <h1 className="mt-2 text-4xl font-black text-foreground">提交需求</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                这里用于收集大家想找的软件、工具和内容。你可以公开提交，也可以登录后查看自己的记录和处理进度。
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-2xl bg-secondary/50 p-4 text-center transition-all hover:bg-secondary/70">
                <p className="text-xs text-muted-foreground">当前列表</p>
                <p className="mt-1 text-2xl font-black text-foreground">{stats.total}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-4 text-center transition-all hover:bg-secondary/70">
                <p className="text-xs text-muted-foreground">已完成</p>
                <p className="mt-1 text-2xl font-black text-emerald-600">{stats.done}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-4 text-center transition-all hover:bg-secondary/70">
                <p className="text-xs text-muted-foreground">我的需求</p>
                <p className="mt-1 text-2xl font-black text-accent">{showMine ? stats.total : stats.mine}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              发布新需求
            </button>
            <button
              onClick={openMine}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm transition",
                showMine ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {showMine ? "返回公开需求" : "查看我的需求"}
            </button>
            <button
              onClick={() => void loadRequests(showMine)}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              刷新列表
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索需求标题、说明或提交人"
                className="w-full rounded-2xl border border-border bg-background px-10 py-3 text-sm outline-none transition focus:border-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    activeFilter === tab.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">需求列表加载中...</div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => void loadRequests(showMine)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold text-foreground">当前没有符合条件的需求</p>
            <p className="mt-2 text-sm text-muted-foreground">可以换个筛选条件，或直接提交一个新需求。</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_320px]">
            <section className="space-y-4">
              {filteredItems.map((item) => {
                const meta = statusMeta(item.status)
                const StatusIcon = meta.icon

                return (
                  <article key={item.id} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-accent/20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", meta.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.authorName}</span>
                          <span className="text-xs text-muted-foreground">{item.createdAt}</span>
                        </div>
                        <h2 className="mt-3 text-lg font-bold text-foreground transition-colors group-hover:text-accent">{item.title}</h2>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                        {item.adminReply ? (
                          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
                            <p className="mb-1 text-xs font-medium text-accent">站内回复</p>
                            <p className="text-sm text-muted-foreground">{item.adminReply}</p>
                          </div>
                        ) : null}
                      </div>

                      <button
                        onClick={() => void handleVote(item)}
                        disabled={voteLoadingId === item.id}
                        className={cn(
                          "inline-flex items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                          item.userVoted
                            ? "border-accent bg-accent text-accent-foreground shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-accent",
                        )}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {voteLoadingId === item.id ? "处理中..." : `支持 ${item.voteCount ?? 0}`}
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-border bg-card p-5">
                <h3 className="text-sm font-bold text-foreground">提交说明</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <li>标题尽量写清楚你想找什么内容。</li>
                  <li>说明里可以写上用途、平台和必须满足的条件。</li>
                  <li>登录后更方便查看自己的记录和处理进度。</li>
                </ul>
              </section>
              <section className="rounded-3xl border border-border bg-card p-5">
                <h3 className="text-sm font-bold text-foreground">当前统计</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>公开需求：{stats.total}</p>
                  <p>已完成：{stats.done}</p>
                  <p>我的需求：{stats.mine}</p>
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">新需求</p>
                <h2 className="mt-2 text-2xl font-black text-foreground">发布需求</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标题</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="例如：想找一款可离线使用的文字识别工具"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">需求说明</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                  placeholder="请写清用途、预算、设备平台和必须满足的条件。"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                />
              </div>

              {!token ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">姓名</label>
                    <input
                      value={form.authorName}
                      onChange={(event) => setForm((current) => ({ ...current, authorName: event.target.value }))}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">邮箱</label>
                    <input
                      value={form.authorEmail}
                      onChange={(event) => setForm((current) => ({ ...current, authorEmail: event.target.value }))}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                    />
                  </div>
                </div>
              ) : null}

              {formError ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</p> : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground transition hover:text-foreground">
                  取消
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                >
                  {submitting ? "提交中..." : "提交需求"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  )
}
