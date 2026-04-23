"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { forgotPassword } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("请输入注册邮箱。")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await forgotPassword(trimmedEmail)
      setSent(true)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "发送失败，请稍后重试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-border bg-card p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">账号找回</p>
          <h1 className="mt-2 text-3xl font-black text-foreground">忘记密码</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            输入你的注册邮箱，我们会发送一封包含重置链接的邮件。链接 30 分钟内有效且仅可使用一次。
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">注册邮箱</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
              />
            </div>

            {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
            {sent ? (
              <p className="rounded-2xl bg-emerald-100/60 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                如果该邮箱已注册，我们已经发送了重置密码邮件，请前往邮箱查收。
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
            >
              {submitting ? "发送中..." : "发送重置链接"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            想起密码了？
            <Link href="/login" className="ml-1 font-semibold text-accent hover:underline">
              返回登录
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

