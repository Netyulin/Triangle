"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react"
import { useAppContext } from "@/components/app-provider"
import { SiteLogo } from "@/components/site-logo"
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [softwareCategories, setSoftwareCategories] = useState<CategoryItem[]>([])
  const [articleCategories, setArticleCategories] = useState<CategoryItem[]>([])

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
      href: "/articles",
      categories: articleCategories,
      categoryHrefPrefix: "/articles?category=",
      categoryFallbackLabel: "全部文章",
    },
    { label: t.navRequests, href: "/requests" },
    { label: t.navSearch, href: "/search" },
  ]

  useEffect(() => {
    const stored = localStorage.getItem("triangle-theme")
    if (stored === "dark") {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    } else if (stored === "light") {
      setTheme("light")
      document.documentElement.classList.remove("dark")
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    }
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
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem("triangle-theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const value = searchQuery.trim()
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search")
    setMobileOpen(false)
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container-custom flex h-16 items-center gap-4">
        <Link href="/" className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80">
          <SiteLogo className="h-9 w-auto" tone="auto" />
          <div className="hidden sm:block">
            <div className="text-base font-black leading-none text-foreground font-mono">TRIANGLE</div>
            <div className="mt-1 text-[10px] leading-none tracking-[0.2em] text-muted-foreground">{t.brandTagline}</div>
          </div>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href)
            if (!item.categories?.length) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            }

            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Link>

                <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="w-64 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-elevated">
                    <Link
                      href={item.href}
                      className="mb-1 block rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      {item.categoryFallbackLabel}
                    </Link>
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {item.categories.map((category) => (
                        <Link
                          key={category.name}
                          href={`${item.categoryHrefPrefix}${encodeURIComponent(category.name)}`}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        >
                          <span>{category.name}</span>
                          <span className="text-xs font-mono">{category.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="hidden max-w-xs flex-1 sm:block">
          <form onSubmit={submitSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-full border border-border bg-secondary py-2 pl-9 pr-4 text-sm transition-all placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </form>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === "light" ? t.themeToDark : t.themeToLight}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {(user.name || user.username)[0]}
                </div>
                <span className="hidden text-sm font-medium text-foreground sm:block">{user.name || user.username}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card py-1 shadow-elevated">
                  <Link href="/profile" className="flex items-center px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">
                    {t.profile}
                  </Link>
                  <Link
                    href="/profile?tab=requests"
                    className="flex items-center px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    {t.myRequests}
                  </Link>
                  <Link
                    href="/profile?tab=favorites"
                    className="flex items-center px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    {t.favorites}
                  </Link>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={() => {
                      logout()
                      setUserMenuOpen(false)
                      router.push("/")
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-secondary"
                  >
                    {t.logout}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-accent sm:block"
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
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
        <div className="space-y-2 border-t border-border bg-card px-4 py-3 md:hidden">
          <form onSubmit={submitSearch} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-border bg-secondary py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </form>

          {navItems.map((item) => (
            <div key={item.href} className="space-y-1">
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
              {item.categories?.length ? (
                <div className="ml-3 space-y-1 border-l border-border pl-3">
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {item.categoryFallbackLabel}
                  </Link>
                  {item.categories.map((category) => (
                    <Link
                      key={category.name}
                      href={`${item.categoryHrefPrefix}${encodeURIComponent(category.name)}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </header>
  )
}
