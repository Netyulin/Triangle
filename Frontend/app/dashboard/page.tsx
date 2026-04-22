"use client"

import Link from "next/link"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { AppSigningCard } from "@/components/dashboard/app-signing-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppContext } from "@/components/app-provider"
import { buildAuthUrl } from "@/lib/utils"

export default function DashboardPage() {
  const { token, user } = useAppContext()

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container-custom py-14">
          <Card className="rounded-3xl border-border/70">
            <CardHeader>
              <CardTitle>请先登录</CardTitle>
              <CardDescription>
                应用签名功能仅对已登录用户开放。登录后你可以在这里完成获取 UDID、选择证书、上传 IPA 和安装签名包的完整流程。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={buildAuthUrl("/login", "/dashboard")}>前往登录</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-custom space-y-8 py-10">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="rounded-3xl border-border/70">
            <CardHeader>
              <CardTitle>签名工作台</CardTitle>
              <CardDescription>
                欢迎回来，{user.name || user.username}。你可以在这里完成 IPA 签名全流程：获取 UDID、选择签名方案、上传文件，并拿到安装链接。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs text-muted-foreground">服务状态</p>
                <p className="mt-2 text-lg font-semibold text-foreground">运行中</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs text-muted-foreground">签名链接有效期</p>
                <p className="mt-2 text-lg font-semibold text-foreground">24 小时</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs text-muted-foreground">签名产物处理</p>
                <p className="mt-2 text-lg font-semibold text-foreground">自动清理</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70">
            <CardHeader>
              <CardTitle>操作说明</CardTitle>
              <CardDescription>首次使用建议按下面顺序操作，通常 2 分钟左右就能走完整个流程。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-muted-foreground">
              <p className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                在 iPhone 或 iPad 上点击“获取 UDID”，安装描述文件后回到本页面。
              </p>
              <p className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                选择要使用的证书与描述文件，也可以上传自己的整套签名方案。
              </p>
              <p className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                上传 IPA，等待签名完成后在任务记录里安装或下载。
              </p>
            </CardContent>
          </Card>
        </section>

        <AppSigningCard />
      </main>
      <Footer />
    </div>
  )
}
