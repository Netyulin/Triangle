"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  FolderKanban,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquareMore,
  Newspaper,
  Settings2,
  Shapes,
  ShieldCheck,
  ShieldEllipsis,
  Tags,
  UserCog,
  Users,
} from "lucide-react"
import { useAppContext } from "@/components/app-provider"
import { cn } from "@/lib/utils"

const toneClasses = {
  slate: { activeBg: "bg-foreground text-background", iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300" },
  emerald: { activeBg: "bg-foreground text-background", iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" },
  sky: { activeBg: "bg-foreground text-background", iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300" },
  indigo: { activeBg: "bg-foreground text-background", iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300" },
  violet: { activeBg: "bg-foreground text-background", iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300" },
  cyan: { activeBg: "bg-foreground text-background", iconBg: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-300" },
  rose: { activeBg: "bg-foreground text-background", iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300" },
  teal: { activeBg: "bg-foreground text-background", iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-300" },
} as const

const items: Array<{
  href: string
  label: string
  icon: typeof LayoutDashboard
  tone: keyof typeof toneClasses
  onlyWhenInviteRequired?: boolean
}> = [
  { href: "/admin", label: "后台总览", icon: LayoutDashboard, tone: "slate" },
  { href: "/admin/posts", label: "文章管理", icon: Newspaper, tone: "emerald" },
  { href: "/admin/apps", label: "软件管理", icon: FolderKanban, tone: "sky" },
  { href: "/admin/app-categories", label: "分类管理", icon: Tags, tone: "indigo" },
  { href: "/admin/topics", label: "专题管理", icon: Shapes, tone: "violet" },
  { href: "/admin/submissions", label: "需求管理", icon: MessageSquareMore, tone: "cyan" },
  { href: "/admin/ad-slots", label: "广告位管理", icon: Megaphone, tone: "sky" },
  { href: "/admin/ad-contents", label: "广告内容管理", icon: Images, tone: "indigo" },
  { href: "/admin/ads-stats", label: "广告数据", icon: BarChart3, tone: "teal" },
  { href: "/admin/sign-certificates", label: "签名证书管理", icon: ShieldCheck, tone: "emerald" },
  { href: "/admin/sign-profiles", label: "描述文件管理", icon: ShieldEllipsis, tone: "violet" },
  { href: "/admin/netdisk-reports", label: "失效报告", icon: AlertTriangle, tone: "rose" },
  { href: "/admin/account", label: "账号设置", icon: UserCog, tone: "slate" },
  { href: "/admin/users", label: "用户管理", icon: Users, tone: "slate" },
  { href: "/admin/invite-codes", label: "邀请码管理", icon: KeyRound, tone: "teal", onlyWhenInviteRequired: true },
  { href: "/admin/settings", label: "系统设置", icon: Settings2, tone: "slate" },
] as const

export function AdminSidebar() {
  const pathname = usePathname()
  const { siteSettings } = useAppContext()
  const visibleItems = items.filter((item) => !item.onlyWhenInviteRequired || siteSettings?.registrationRequiresInvite)

  return (
    <aside className="space-y-4">
      <div className="admin-panel p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-[0_12px_24px_-20px_rgba(14,165,233,0.4)] dark:bg-sky-950/30 dark:text-sky-300">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">Triangle 后台</h1>
            <p className="text-xs text-muted-foreground">统一管理内容、广告、签名分发和站点配置</p>
          </div>
        </div>
      </div>

      <div className="admin-panel p-3">
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const tone = toneClasses[item.tone]
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  active ? `${tone.activeBg} shadow-[0_18px_36px_-30px_rgba(15,23,42,0.6)]` : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105", active ? "bg-background text-foreground" : tone.iconBg)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
