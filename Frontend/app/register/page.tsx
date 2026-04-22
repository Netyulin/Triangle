"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { AvatarPicker } from "@/components/avatar-picker"
import { useAppContext } from "@/components/app-provider"
import { request, type AuthPayload } from "@/lib/api"
import { type AvatarGender } from "@/lib/avatar-random"
import { buildAuthUrl, getSafeRedirectTarget, cn } from "@/lib/utils"

const genderOptions: Array<{ value: AvatarGender; label: string }> = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
]

function getStrength(password: string) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  return score
}

export default function RegisterPage() {
  const router = useRouter()
  const { saveSession, siteSettings } = useAppContext()

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "male" as AvatarGender,
    inviteCode: "",
  })
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [redirectQuery, setRedirectQuery] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    setRedirectQuery(new URLSearchParams(window.location.search).get("redirect") || "")
  }, [])

  const redirectTarget = getSafeRedirectTarget(redirectQuery, "/profile")
  const loginHref = buildAuthUrl("/login", redirectTarget)

  const strength = useMemo(() => getStrength(form.password), [form.password])
  const strengthText = ["", "很弱", "偏弱", "中等", "较强", "很强"][strength]

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!form.username.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      setError("请先把必填信息填写完整。")
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("两次输入的密码不一致。")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const payload = await request<AuthPayload>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: form.username.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          gender: form.gender,
          inviteCode: form.inviteCode.trim() || undefined,
        }),
      })

      let nextPayload = payload
      if (selectedAvatar) {
        const updated = await request<Omit<AuthPayload, "token">>("/api/auth/profile", {
          method: "PUT",
          token: payload.token,
          body: JSON.stringify({ avatar: selectedAvatar }),
        })
        nextPayload = {
          token: payload.token,
          user: updated.user,
          permissions: updated.permissions,
        }
      }

      saveSession(nextPayload)
      router.push(redirectTarget)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "注册失败，请稍后再试。")
    } finally {
      setSubmitting(false)
    }
  }

  const registrationEnabled = siteSettings?.registrationEnabled ?? true
  const inviteRequired = siteSettings?.registrationRequiresInvite ?? false

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border bg-secondary/40 px-8 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">创建账号</p>
            <h1 className="mt-2 text-4xl font-black text-foreground">注册账号</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              注册成功后会自动登录，并直接进入个人中心。你可以先选择一个喜欢的头像，也可以稍后再改。
            </p>
          </div>

          {!registrationEnabled ? (
            <div className="px-8 py-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-base font-semibold text-foreground">注册暂未开放</p>
              <p className="mt-2 text-sm text-muted-foreground">已有账号的话，可以直接前往登录。</p>
              <Link href={loginHref} className="mt-6 inline-block rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                去登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 px-8 py-8">
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">选择头像</label>
                <AvatarPicker value={selectedAvatar} onChange={setSelectedAvatar} gender={form.gender} />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">用户名</label>
                  <input
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder="建议 3 到 30 个字符"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">显示名称</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="你希望展示的名字"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">邮箱</label>
                  <input
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="请输入常用邮箱"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">性别</label>
                  <div className="flex gap-2">
                    {genderOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, gender: item.value }))}
                        className={cn(
                          "flex-1 rounded-2xl border px-4 py-3 text-sm transition",
                          form.gender === item.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {inviteRequired ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">邀请码</label>
                  <input
                    value={form.inviteCode}
                    onChange={(event) => setForm((current) => ({ ...current, inviteCode: event.target.value }))}
                    placeholder="请输入邀请码"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="至少 8 位"
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
                  {form.password ? (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3, 4, 5].map((item) => (
                          <span key={item} className={cn("h-1 flex-1 rounded-full", item <= strength ? "bg-primary" : "bg-border")} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{strengthText}</span>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">确认密码</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      placeholder="请再输入一次密码"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {submitting ? "注册中..." : "立即注册"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                已经有账号了？
                <Link href={loginHref} className="ml-1 font-semibold text-accent hover:underline">
                  去登录
                </Link>
              </p>
            </form>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
