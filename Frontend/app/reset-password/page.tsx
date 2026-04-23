"use client"

import Link from "next/link"
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { resetPasswordByToken, verifyResetPasswordToken } from "@/lib/api"

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

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = (searchParams.get("token") || "").trim()
  const [tokenChecking, setTokenChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    const verifyToken = async () => {
      if (!token) {
        if (!active) return
        setTokenValid(false)
        setTokenChecking(false)
        return
      }

      setTokenChecking(true)
      setError("")
      try {
        await verifyResetPasswordToken(token)
        if (!active) return
        setTokenValid(true)
      } catch {
        if (!active) return
        setTokenValid(false)
      } finally {
        if (!active) return
        setTokenChecking(false)
      }
    }

    void verifyToken()
    return () => {
      active = false
    }
  }, [token])

  const strength = useMemo(() => getStrength(password), [password])
  const strengthText = ["", "很弱", "偏弱", "中等", "较强", "很强"][strength]

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !tokenValid) return

    if (!password) {
      setError("请输入新密码。")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await resetPasswordByToken(token, password)
      setSuccess(true)
      window.setTimeout(() => {
        router.push("/login")
      }, 1200)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "重置失败，请稍后重试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-border bg-card p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">账号安全</p>
          <h1 className="mt-2 text-3xl font-black text-foreground">重置密码</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">请设置新的登录密码，建议使用更强强度的密码。</p>

          {tokenChecking ? (
            <p className="mt-8 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              正在验证重置链接...
            </p>
          ) : !tokenValid ? (
            <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
              链接无效或已过期，请重新发起找回密码。
              <div className="mt-3">
                <Link href="/forgot-password" className="font-semibold underline">
                  去找回密码
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">新密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="至少 8 位，建议包含大小写、数字和符号"
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
                {password ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <span key={item} className={`h-1 flex-1 rounded-full ${item <= strength ? "bg-primary" : "bg-border"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{strengthText}</span>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">确认新密码</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    placeholder="请再次输入新密码"
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

              {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
              {success ? (
                <p className="rounded-2xl bg-emerald-100/60 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  密码重置成功，正在跳转到登录页...
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting || success}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {submitting ? "提交中..." : "确认重置密码"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            返回
            <Link href="/login" className="ml-1 font-semibold text-accent hover:underline">
              登录页
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

