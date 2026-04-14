"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, ClipboardList, FileText, Heart, LogOut, Menu, Moon, PenTool, Search, Sun, User, X, Mail, MessageCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { useAppContext } from "@/components/app-provider"
import { SiteLogo } from "@/components/site-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { request } from "@/lib/api"
import { cn } from "@/lib/utils"

type CategoryItem = {
  name: string
  count: number
}

type NavItem = {
  label: string
  href: string
  categories?: CategoryItem[]
  categoryHrefPrefix?: string
  categoryFallbackLabel?: string
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, user, logout } = useAppContext()
  const { resolvedTheme, setTheme } = useTheme()
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [softwareCategories, setSoftwareCategories] = useState<CategoryItem[]>([])
  const [articleCategories, setArticleCategories] = useState<CategoryItem[]>([])
  const [openDropdownHref, setOpenDropdownHref] = useState<string | null>(null)
  const [mobileDropdownHref, setMobileDropdownHref] = useState<string | null>(null)

  const navItems: NavItem[] = [
    { label: t.navHome, href: "/" },
    {
      label: t.navSoftware,
      href: "/software",
      categories: softwareCategories,
      categoryHrefPrefix: "/software?category=",
      categoryFallbackLabel: "全部软件",
    },
    {
      label: t.navArticles,
      href: "/news",
      categories: articleCategories,
      categoryHrefPrefix: "/news?category=",
      categoryFallbackLabel: "全部文章",
    },
    { label: t.navRequests, href: "/requests" },
    { label: t.navSearch, href: "/search" },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
    setOpenDropdownHref(null)
    setMobileDropdownHref(null)
  }, [pathname])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  useEffect(() => {
    let active = true

    Promise.all([
      request<Array<{ name: string; count: number }>>("/api/apps/categories"),
      request<Array<{ name: string; count: number }>>("/api/posts/categories"),
    ])
      .then(([appCategories, postCategories]) => {
        if (!active) return
        setSoftwareCategories(appCategories.slice(0, 8))
        setArticleCategories(postCategories.slice(0, 8))
      })
      .catch(() => {
        if (!active) return
        setSoftwareCategories([])
        setArticleCategories([])
      })

    return () => {
      active = false
    }
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const isDark = mounted && resolvedTheme === "dark"

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const value = searchQuery.trim()
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search")
    setMobileOpen(false)
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const displayName = user ? user.name || user.username : ""
  const displayInitial = displayName.slice(0, 1).toUpperCase()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(248,250,252,0.82))] shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl supports-[backdrop-filter]:bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(248,250,252,0.74))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] dark:shadow-[0_16px_36px_-26px_rgba(2,6,23,0.8)] supports-[backdrop-filter]:dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.68))]">
      <div className="container-custom flex min-h-[4.5rem] items-center gap-3 py-3 md:gap-4">
        <Link href="/" className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.55)]">
            <SiteLogo className="h-8 w-auto" tone="auto" />
          </div>
            <div className="hidden sm:block">
              <div className="text-[17px] font-extrabold leading-none tracking-wide text-foreground">三角软件</div>
              <div className="mt-1 text-[10px] leading-none tracking-[0.22em] text-muted-foreground">{t.brandTagline}</div>
            </div>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 rounded-full border border-border/70 bg-background/70 p-1.5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const dropdownOpen = openDropdownHref === item.href
            if (!item.categories?.length) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenDropdownHref(null)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-foreground text-background shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)]"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            }

            return (
              <div
                key={item.href}
                className="group relative"
                onMouseEnter={() => setOpenDropdownHref(item.href)}
                onMouseLeave={() => {
                  if (!active) setOpenDropdownHref(null)
                }}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpenDropdownHref(null)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-foreground text-background shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)]"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                  >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Link>

                <div
                  className={cn(
                    "absolute left-0 top-full z-50 pt-2 transition",
                    dropdownOpen
                      ? "visible opacity-100"
                      : "invisible pointer-events-none opacity-0",
                  )}
                >
                  <div className="w-64 overflow-hidden rounded-2xl border border-border bg-card/95 p-2 shadow-elevated backdrop-blur-sm">
                    <Link
                      href={item.href}
                      onClick={() => setOpenDropdownHref(null)}
                      className="mb-1 block rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      {item.categoryFallbackLabel}
                    </Link>
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {item.categories.map((category) => (
                        <Link
                          key={category.name}
                        href={`${item.categoryHrefPrefix}${encodeURIComponent(category.name)}`}
                        onClick={() => setOpenDropdownHref(null)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      >
                          <span>{category.name}</span>
                          <span className="font-mono text-xs">{category.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="hidden max-w-sm flex-1 sm:block">
          <form onSubmit={submitSearch} className="relative">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-full border border-border/80 bg-background/78 py-2.5 pl-10 pr-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </form>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={isDark ? t.themeToLight : t.themeToDark}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            href="/feedback"
            aria-label="反馈"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>

          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((value) => !value)}
                className="flex items-center gap-3 rounded-full border border-border/70 bg-background/78 px-2.5 py-1.5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.55)] transition-all hover:border-accent/25 hover:bg-secondary/80"
              >
                <Avatar className="h-9 w-9 border border-border/60 bg-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                  <AvatarImage src={user.avatar ?? undefined} alt={displayName} className="object-contain p-0.5" />
                  <AvatarFallback className="bg-accent/12 text-xs font-semibold text-accent">{displayInitial}</AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[8rem] truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="max-w-[8rem] truncate text-[11px] text-muted-foreground">@{user.username}</p>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", userMenuOpen && "rotate-180")} />
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card/95 py-1.5 shadow-elevated backdrop-blur-sm">
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <PenTool className="mr-2 h-4 w-4 text-muted-foreground" />
                    应用签名
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    {t.profile}
                  </Link>
                  <Link
                    href="/profile?tab=messages"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    消息中心
                  </Link>
                  <Link
                    href="/profile?tab=requests"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                    {t.myRequests}
                  </Link>
                  <Link
                    href="/profile?tab=favorites"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <Heart className="mr-2 h-4 w-4 text-muted-foreground" />
                    {t.favorites}
                  </Link>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={() => {
                      logout()
                      setUserMenuOpen(false)
                      router.push("/")
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-secondary"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.logout}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block"
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {t.register}
              </Link>
            </div>
          )}

          <button
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={t.mobileMenu}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="space-y-3 border-t border-border/70 bg-card/95 px-4 py-4 backdrop-blur md:hidden">
          <form onSubmit={submitSearch} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-2xl border border-border/80 bg-background/80 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </form>

          {user ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3"
            >
              <Avatar className="h-10 w-10 border border-border/60 bg-secondary">
                <AvatarImage src={user.avatar ?? undefined} alt={displayName} className="object-contain p-0.5" />
                <AvatarFallback className="bg-accent/12 text-sm font-semibold text-accent">{displayInitial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </Link>
          ) : null}

          {user ? (
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              个人中心
            </Link>
          ) : null}

          {user ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <PenTool className="h-5 w-5 text-muted-foreground" />
              应用签名
            </Link>
          ) : null}

          {user ? (
            <Link
              href="/profile?tab=messages"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Mail className="h-5 w-5 text-accent" />
              消息中心
            </Link>
          ) : null}

          {user ? (
            <Link
              href="/profile?tab=requests"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              {t.myRequests}
            </Link>
          ) : null}

          {user ? (
            <Link
              href="/profile?tab=favorites"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Heart className="h-5 w-5 text-muted-foreground" />
              {t.favorites}
            </Link>
          ) : null}

          <Link
            href="/feedback"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <MessageCircle className="h-5 w-5 text-accent" />
            意见反馈
          </Link>

          {navItems.map((item) => {
            const mobileDropdownOpen = mobileDropdownHref === item.href

            if (!item.categories?.length) {
              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    onClick={() => {
                      setMobileOpen(false)
                      setMobileDropdownHref(null)
                    }}
                    className={cn(
                      "block rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-secondary font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </div>
              )
            }

            return (
              <div key={item.href} className="space-y-1">
                <div className="flex gap-2">
                  <Link
                    href={item.href}
                    onClick={() => {
                      setMobileOpen(false)
                      setMobileDropdownHref(null)
                    }}
                    className={cn(
                      "flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-secondary font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileDropdownHref((value) => (value === item.href ? null : item.href))}
                    aria-label={`${item.label}分类菜单`}
                    aria-expanded={mobileDropdownOpen}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      mobileDropdownOpen && "bg-secondary text-foreground",
                    )}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", mobileDropdownOpen && "rotate-180")} />
                  </button>
                </div>

                {mobileDropdownOpen ? (
                  <div className="ml-3 space-y-1 border-l border-border pl-3">
                    <Link
                      href={item.href}
                      onClick={() => {
                        setMobileOpen(false)
                        setMobileDropdownHref(null)
                      }}
                      className="block rounded-xl px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      {item.categoryFallbackLabel}
                    </Link>
                    {item.categories.map((category) => (
                      <Link
                        key={category.name}
                        href={`${item.categoryHrefPrefix}${encodeURIComponent(category.name)}`}
                        onClick={() => {
                          setMobileOpen(false)
                          setMobileDropdownHref(null)
                        }}
                        className="block rounded-xl px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}

          {user ? (
            <button
              onClick={() => {
                logout()
                setMobileOpen(false)
                router.push("/")
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
              {t.logout}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
