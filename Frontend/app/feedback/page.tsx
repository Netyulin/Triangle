"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { useAppContext } from "@/components/app-provider"
import { request } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, LoaderCircle, Send, X } from "lucide-react"

type FeedbackType = "bug" | "feature" | "content" | "other"

const typeOptions: Array<{ key: FeedbackType; label: string }> = [
  { key: "bug", label: "功能问题" },
  { key: "feature", label: "功能建议" },
  { key: "content", label: "内容纠错" },
  { key: "other", label: "其他" },
]

export default function FeedbackPage() {
  const router = useRouter()
  const { token, user } = useAppContext()

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("other")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [contact, setContact] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError("请填写标题和反馈内容")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      await request("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          type: feedbackType,
          title: title.trim(),
          description: description.trim(),
          contact: contact.trim(),
          userId: user?.id,
        }),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setSubmitted(true)
    } catch {
      setError("提交失败，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container-custom flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="w-full max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-foreground">感谢反馈</h1>
            <p className="mb-8 text-muted-foreground">我们已经收到你的反馈，会尽快处理。</p>
            <button
              onClick={() => router.push("/")}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              返回首页
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-custom flex flex-1 flex-col py-12">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">意见反馈</h1>
            <p className="text-muted-foreground">
              遇到问题或有改进建议？告诉我们，帮助我们做得更好。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">反馈类型</label>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFeedbackType(opt.key)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all",
                      feedbackType === opt.key
                        ? "bg-accent text-accent-foreground shadow-[0_8px_20px_-12px_rgba(14,165,233,0.7)]"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium text-foreground">
                标题 <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请简要描述你的反馈"
                className="w-full rounded-xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-medium text-foreground">
                反馈内容 <span className="text-destructive">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述你遇到的问题或建议..."
                rows={6}
                className="w-full resize-none rounded-xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                maxLength={2000}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {description.length}/2000
              </p>
            </div>

            <div>
              <label htmlFor="contact" className="mb-2 block text-sm font-medium text-foreground">
                联系方式（选填）
              </label>
              <input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="邮箱或微信，方便我们联系你"
                className="w-full rounded-xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                maxLength={100}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <X className="h-4 w-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  提交反馈
                </>
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
