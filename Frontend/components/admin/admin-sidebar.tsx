"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  Award,
  BarChart3,
  FolderKanban,
  Images,
  KeyRound,
  LayoutDashboard,
  Globe,
  MailCheck,
  MailPlus,
  Megaphone,
  MessageSquareMore,
  Newspaper,
  Settings2,
  Shapes,
  ShieldCheck,
  Tags,
  UserCog,
  Users,
} from "lucide-react"
import { useAppContext } from "@/components/app-provider"
import { cn } from "@/lib/utils"

type AdminSidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

type ToneKey = "slate" | "emerald" | "sky" | "indigo" | "violet" | "cyan" | "amber" | "rose" | "teal"

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  tone: ToneKey
  onlyWhenInviteRequired?: boolean
}

type NavGroup = {
  label?: string
  items: NavItem[]
}

const toneMap: Record<ToneKey, { iconBg: string }> = {
  slate: { iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  emerald: { iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" },
  sky: { iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300" },
  indigo: { iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300" },
  violet: { iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300" },
  cyan: { iconBg: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-300" },
  amber: { iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300" },
  rose: { iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300" },
  teal: { iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-300" },
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "后台总览", icon: <LayoutDashboard className="h-4 w-4" />, tone: "slate" },
      { href: "/admin/active-ips", label: "活跃IP列表", icon: <Globe className="h-4 w-4" />, tone: "violet" },
      { href: "/admin/posts", label: "文章管理", icon: <Newspaper className="h-4 w-4" />, tone: "emerald" },
      { href: "/admin/apps", label: "软件管理", icon: <FolderKanban className="h-4 w-4" />, tone: "sky" },
      { href: "/admin/app-categories", label: "分类管理", icon: <Tags className="h-4 w-4" />, tone: "indigo" },
      { href: "/admin/topics", label: "专题管理", icon: <Shapes className="h-4 w-4" />, tone: "violet" },
      { href: "/admin/submissions", label: "需求管理", icon: <MessageSquareMore className="h-4 w-4" />, tone: "cyan" },
    ],
  },
  {
    label: "内容运营",
    items: [
      { href: "/admin/ad-slots", label: "广告位管理", icon: <Megaphone className="h-4 w-4" />, tone: "sky" },
      { href: "/admin/ad-contents", label: "广告内容管理", icon: <Images className="h-4 w-4" />, tone: "indigo" },
      { href: "/admin/ads-stats", label: "广告数据", icon: <BarChart3 className="h-4 w-4" />, tone: "teal" },
    ],
  },
  {
    label: "系统管理",
    items: [
      { href: "/admin/signing", label: "应用签名管理", icon: <ShieldCheck className="h-4 w-4" />, tone: "emerald" },
      { href: "/admin/levels", label: "等级管理", icon: <Award className="h-4 w-4" />, tone: "amber" },
      { href: "/admin/netdisk-reports", label: "失效报告", icon: <AlertTriangle className="h-4 w-4" />, tone: "rose" },
      { href: "/admin/announcements", label: "站点公告", icon: <Megaphone className="h-4 w-4" />, tone: "amber" },
      { href: "/admin/notification-templates", label: "站内信模板", icon: <MailCheck className="h-4 w-4" />, tone: "sky" },
      { href: "/admin/notifications/send", label: "立即发送站内信", icon: <MailPlus className="h-4 w-4" />, tone: "teal" },
      { href: "/admin/users", label: "用户管理", icon: <Users className="h-4 w-4" />, tone: "slate" },
      {
        href: "/admin/invite-codes",
        label: "邀请码管理",
        icon: <KeyRound className="h-4 w-4" />,
        tone: "teal",
        onlyWhenInviteRequired: true,
      },
      { href: "/admin/settings", label: "系统设置", icon: <Settings2 className="h-4 w-4" />, tone: "slate" },
    ],
  },
]

export function AdminSidebar({ collapsed, mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname()
  const { siteSettings } = useAppContext()

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.onlyWhenInviteRequired || Boolean(siteSettings?.registrationRequiresInvite)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      ) : null}

      <aside
        className={cn(
          "fixed bottom-0 top-14 z-40 flex flex-col border-r bg-slate-50 transition-all duration-300 ease-in-out dark:bg-slate-900",
          "border-slate-200/80 dark:border-slate-700/50",
          collapsed ? "w-[64px]" : "w-[240px]",
          "max-lg:left-0 max-lg:w-[280px] max-lg:shadow-2xl",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        <nav className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {visibleGroups.map((group) => (
            <SidebarGroup key={group.label ?? "main"} group={group} pathname={pathname} collapsed={collapsed} onItemClick={onCloseMobile} />
          ))}
        </nav>

        <div className="border-t border-slate-200/80 p-3 dark:border-slate-700/50">
          <SidebarLink
            href="/admin/account"
            icon={<UserCog className="h-4 w-4" />}
            label="账号设置"
            tone="slate"
            pathname={pathname}
            collapsed={collapsed}
            onClick={onCloseMobile}
          />
        </div>
      </aside>
    </>
  )
}

function SidebarGroup({
  group,
  pathname,
  collapsed,
  onItemClick,
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
  onItemClick?: () => void
}) {
  return (
    <div className={collapsed ? "mb-3 space-y-0.5" : "mb-4"}>
      {!collapsed && group.label ? (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{group.label}</p>
      ) : null}

      <div className="space-y-0.5">
        {group.items.map((item) => (
          <SidebarLink key={item.href} {...item} pathname={pathname} collapsed={collapsed} onClick={onItemClick} />
        ))}
      </div>
    </div>
  )
}

function SidebarLink({
  href,
  label,
  icon,
  tone,
  pathname,
  collapsed,
  onClick,
}: NavItem & {
  pathname: string
  collapsed: boolean
  onClick?: () => void
}) {
  const isActive = pathname === href || (href !== "/admin" && (pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`)))
  const toneConfig = toneMap[tone] ?? toneMap.slate

  const link = (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
        collapsed && "justify-center px-2",
      )}
    >
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]", isActive ? "bg-white/15 text-inherit dark:bg-slate-900/15" : toneConfig.iconBg)}>{icon}</span>
      {!collapsed ? <span>{label}</span> : null}
      {collapsed && isActive ? <span className="absolute right-1 h-1.5 w-1.5 rounded-full bg-sky-500" /> : null}
    </Link>
  )

  return collapsed ? <div className="relative">{link}</div> : link
}
