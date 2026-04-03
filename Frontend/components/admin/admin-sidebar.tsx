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
  slate: { bg: "bg-slate-600", activeBg: "bg-slate-100 dark:bg-slate-800", activeText: "text-slate-700 dark:text-slate-200", iconBg: "bg-slate-600" },
  gray: { bg: "bg-gray-600", activeBg: "bg-gray-100 dark:bg-gray-800", activeText: "text-gray-700 dark:text-gray-200", iconBg: "bg-gray-600" },
  blue: { bg: "bg-blue-600", activeBg: "bg-blue-100 dark:bg-blue-900/50", activeText: "text-blue-700 dark:text-blue-200", iconBg: "bg-blue-600" },
  indigo: { bg: "bg-indigo-600", activeBg: "bg-indigo-100 dark:bg-indigo-900/50", activeText: "text-indigo-700 dark:text-indigo-200", iconBg: "bg-indigo-600" },
  emerald: { bg: "bg-emerald-600", activeBg: "bg-emerald-100 dark:bg-emerald-900/50", activeText: "text-emerald-700 dark:text-emerald-200", iconBg: "bg-emerald-600" },
  violet: { bg: "bg-violet-600", activeBg: "bg-violet-100 dark:bg-violet-900/50", activeText: "text-violet-700 dark:text-violet-200", iconBg: "bg-violet-600" },
  amber: { bg: "bg-amber-600", activeBg: "bg-amber-100 dark:bg-amber-900/50", activeText: "text-amber-700 dark:text-amber-200", iconBg: "bg-amber-600" },
  rose: { bg: "bg-rose-600", activeBg: "bg-rose-100 dark:bg-rose-900/50", activeText: "text-rose-700 dark:text-rose-200", iconBg: "bg-rose-600" },
  cyan: { bg: "bg-cyan-600", activeBg: "bg-cyan-100 dark:bg-cyan-900/50", activeText: "text-cyan-700 dark:text-cyan-200", iconBg: "bg-cyan-600" },
  teal: { bg: "bg-teal-600", activeBg: "bg-teal-100 dark:bg-teal-900/50", activeText: "text-teal-700 dark:text-teal-200", iconBg: "bg-teal-600" },
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="space-y-4">
      {/* Logo Branding */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Triangle CMS</h1>
            <p className="text-xs text-slate-300/80">管理后台</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-sm">
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
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  active
                    ? `${colors.activeBg} ${colors.activeText}`
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                  active ? colors.iconBg + " text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
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
