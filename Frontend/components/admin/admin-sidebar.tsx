"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, FolderKanban, KeyRound, LayoutDashboard, MessageSquareMore, Newspaper, Settings2, Shapes, Tags, UserCog } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/admin", label: "后台总览", icon: LayoutDashboard, color: "slate" },
  { href: "/admin/apps", label: "软件管理", icon: FolderKanban, color: "blue" },
  { href: "/admin/app-categories", label: "分类管理", icon: Tags, color: "indigo" },
  { href: "/admin/posts", label: "文章管理", icon: Newspaper, color: "emerald" },
  { href: "/admin/topics", label: "专题管理", icon: Shapes, color: "violet" },
  { href: "/admin/submissions", label: "用户需求", icon: MessageSquareMore, color: "amber" },
  { href: "/admin/netdisk-reports", label: "网盘失效报告", icon: AlertTriangle, color: "rose" },
  { href: "/admin/invite-codes", label: "邀请码管理", icon: KeyRound, color: "cyan" },
  { href: "/admin/settings", label: "系统设置", icon: Settings2, color: "gray" },
  { href: "/admin/account", label: "账号设置", icon: UserCog, color: "teal" },
]

const colorClasses = {
  slate: { activeBg: "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-100", iconBg: "bg-slate-600" },
  gray: { activeBg: "bg-gray-100 text-gray-700 dark:bg-gray-800/80 dark:text-gray-100", iconBg: "bg-gray-600" },
  blue: { activeBg: "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-100", iconBg: "bg-blue-600" },
  indigo: { activeBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-100", iconBg: "bg-indigo-600" },
  emerald: { activeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-100", iconBg: "bg-emerald-600" },
  violet: { activeBg: "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100", iconBg: "bg-violet-600" },
  amber: { activeBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-100", iconBg: "bg-amber-600" },
  rose: { activeBg: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-100", iconBg: "bg-rose-600" },
  cyan: { activeBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-100", iconBg: "bg-cyan-600" },
  teal: { activeBg: "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-100", iconBg: "bg-teal-600" },
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="space-y-4">
      {/* Logo Branding */}
      <div className="overflow-hidden rounded-[26px] border border-border/70 bg-[linear-gradient(145deg,rgba(8,15,28,0.96),rgba(15,23,42,0.9)_54%,rgba(14,165,233,0.72))] p-5 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.9)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 backdrop-blur">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Triangle CMS</h1>
            <p className="text-xs text-slate-300/80">管理后台</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="admin-panel p-3">
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const colors = colorClasses[item.color as keyof typeof colorClasses]
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? `${colors.activeBg} shadow-[0_20px_42px_-34px_rgba(15,23,42,0.95)]`
                    : "text-slate-600 hover:bg-slate-50/90 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/70 dark:hover:text-slate-100",
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border border-transparent transition-transform duration-200 group-hover:scale-105",
                  active ? `${colors.iconBg} text-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.7)]` : "bg-slate-100 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400"
                )}>
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
