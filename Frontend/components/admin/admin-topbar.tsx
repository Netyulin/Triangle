"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from "lucide-react"
import { useAppContext } from "@/components/app-provider"
import { SiteLogo } from "@/components/site-logo"
import { cn } from "@/lib/utils"

type AdminTopBarProps = {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

const pageTitleMap: Record<string, string> = {
  "/admin": "后台总览",
  "/admin/posts": "文章管理",
  "/admin/apps": "软件管理",
  "/admin/app-categories": "分类管理",
  "/admin/topics": "专题管理",
  "/admin/submissions": "需求管理",
  "/admin/ad-slots": "广告位管理",
  "/admin/ad-contents": "广告内容管理",
  "/admin/ads-stats": "广告数据",
  "/admin/signing": "应用签名管理",
  "/admin/levels": "等级管理",
  "/admin/netdisk-reports": "失效报告",
  "/admin/account": "账号设置",
  "/admin/users": "用户管理",
  "/admin/invite-codes": "邀请码管理",
  "/admin/announcements": "站点公告",
  "/admin/notification-templates": "站内信模板",
  "/admin/settings": "系统设置",
}

export function AdminTopBar({
  sidebarCollapsed,
  onToggleSidebar,
}: AdminTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme, user } = useAppContext()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  useEffect(() => {
    if (!userMenuOpen) return
    const close = () => setUserMenuOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [userMenuOpen])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [setTheme, theme])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("triangle-token")
    router.push("/login")
  }, [router])

  const pageTitle = getPageTitle(pathname)

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-50 flex h-14 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur-xl transition-all duration-300 dark:bg-slate-900/80",
        "border-slate-200/80 dark:border-slate-700/50",
        "left-0",
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="hidden items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-secondary lg:flex"
        >
          <SiteLogo className="h-7 w-auto" tone="auto" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">三角软件</span>
            <span className="text-[11px] text-muted-foreground">管理后台</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="truncate text-sm font-semibold text-foreground md:hidden">
          {pageTitle}
        </span>
      </div>

      <div className="mx-auto hidden w-full max-w-md md:block">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-2 text-left text-sm text-muted-foreground transition hover:border-accent/30 hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>搜索软件、文章、用户</span>
          <kbd className="ml-auto hidden rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground lg:inline-block">
            Ctrl+K
          </kbd>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setMobileSearchOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground md:hidden"
        aria-label="搜索"
      >
        <Search className="h-5 w-5" />
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        <div className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setUserMenuOpen((prev) => !prev)
            }}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-secondary"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-bold text-white shadow-sm">
              {(user?.name?.charAt(0) ?? "A").toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-foreground lg:block">
              {user?.name ?? "管理员"}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-3.5 w-3.5 text-muted-foreground transition lg:block",
                userMenuOpen && "rotate-180",
              )}
            />
          </button>

          {userMenuOpen ? (
            <div
              className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-white p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-1.5 rounded-xl bg-secondary/50 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">
                  {user?.name ?? "管理员"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email ?? "admin@triangle.dev"}
                </p>
              </div>

              <div className="my-1.5 h-px bg-border" />

              <Link
                href="/admin/account"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-secondary"
                onClick={() => setUserMenuOpen(false)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                账号设置
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-secondary"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                系统设置
              </Link>

              <div className="my-1.5 h-px bg-border" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} /> : null}

      {mobileSearchOpen ? (
        <div className="absolute left-0 right-0 top-full border-b border-t bg-white p-3 dark:bg-slate-900">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-secondary/50 px-4 py-2.5 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-accent" />
              <input
                type="text"
                placeholder="搜索软件、文章、用户"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 pt-[20vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.2)] dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索软件、文章、用户"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="shrink-0 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {!query ? (
            <div className="space-y-0.5 p-2">
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                快捷跳转
              </p>
              {[
                { label: "后台总览", href: "/admin" },
                { label: "软件管理", href: "/admin/apps" },
                { label: "文章管理", href: "/admin/posts" },
                { label: "系统设置", href: "/admin/settings" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-secondary"
                >
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">跳转</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              搜索功能开发中，当前输入：&quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return "Triangle"
  if (pageTitleMap[pathname]) return pageTitleMap[pathname]

  const matched = Object.entries(pageTitleMap).find(
    ([key]) =>
      key !== "/admin" &&
      (pathname.startsWith(`${key}/`) || pathname.startsWith(`${key}?`)),
  )

  return matched?.[1] ?? "Triangle"
}
