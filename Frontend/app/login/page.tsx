"use client"

import { FormEvent, Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { SiteLogo } from "@/components/site-logo"
import { useAppContext } from "@/components/app-provider"
import { request, type AuthPayload } from "@/lib/api"
import { CreditCard, Eye, EyeOff, Heart, List, MessageSquare } from "lucide-react"

const features = [
  { icon: Heart, title: "收藏同步", desc: "登录后可以统一查看自己收藏的软件和文章。" },
  { icon: List, title: "需求记录", desc: "随时查看自己提交过的需求和处理进度。" },
  { icon: MessageSquare, title: "互动记录", desc: "投票、评论和浏览记录都会保存在账号里。" },
  { icon: CreditCard, title: "会员信息", desc: "可查看会员状态、下载次数和充值记录。" },
]

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { saveSession } = useAppContext()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError("请先填写账号和密码。")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const payload = await request<AuthPayload>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })
      saveSession(payload)
      const redirect = searchParams.get("redirect")
      router.push(redirect || "/profile")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "登录失败，请稍后再试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-3xl bg-primary p-8 text-primary-foreground">
            <div className="flex items-center gap-2">
              <SiteLogo className="h-12 w-auto" tone="dark" />
              <span className="text-sm font-semibold tracking-[0.18em] opacity-75">TRIANGLE ACCOUNT</span>
            </div>

            <h1 className="mt-8 text-4xl font-black leading-tight">登录后继续管理你的收藏、需求和下载记录</h1>
            <p className="mt-4 text-sm leading-7 opacity-80">
              登录成功后会直接进入个人中心。你可以继续查看收藏内容、自己的需求记录、下载次数和账号信息。
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="rounded-2xl bg-primary-foreground/10 p-4">
                    <Icon className="h-5 w-5 opacity-80" />
                    <p className="mt-3 text-sm font-bold">{feature.title}</p>
                    <p className="mt-2 text-xs leading-6 opacity-75">{feature.desc}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">欢迎回来</p>
              <h2 className="mt-2 text-3xl font-black text-foreground">登录账号</h2>
              <p className="mt-2 text-sm text-muted-foreground">输入账号信息后，即可继续使用个人中心相关功能。</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">用户名</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入用户名"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {submitting ? "登录中..." : "立即登录"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                还没有账号？
                <Link href="/register" className="ml-1 font-semibold text-accent hover:underline">
                  去注册
                </Link>
              </p>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  )
}
