"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopBar } from "@/components/admin/admin-topbar"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { fetchAdminMe } from "@/lib/admin-api"

/* ------------------------------------------------------------------ */
/*  AdminAuthGuard – 认证保护 + 新布局容器                              */
/*                                                                     */
/*  布局结构 (v2):                                                     */
/*  ┌─────────────────────────────────────────────────────────────┐   │
/*  │  TopBar (fixed, h-14)                                       │   │
/*  ├────┬─────────────────────────────────────────────────────────┤   │
*  │    │  Breadcrumb                                             │   │
│ 侧边│──────────────────────────────────────────────────────────│   │
│ 栏 │                                                          │   │
│(64/│         主内容区域 (children)                              │   │
│240)│                                                          │   │
│    │                                                          │   │
│    │                                                          │   │
└────┴──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘   */

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const authDoneRef = useRef(false)

  /* ── Sidebar state ── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Listen for collapse toggle event from sidebar's internal button
  useEffect(() => {
    const handler = () => setSidebarCollapsed((prev) => !prev)
    window.addEventListener("admin-sidebar-toggle", handler)
    return () => window.removeEventListener("admin-sidebar-toggle", handler)
  }, [])

  /* ── Auth check (unchanged logic) ── */
  const isPublic = ["/login", "/register", "/forgot-password"].some(
    (p) => pathname?.startsWith(p),
  )

  useEffect(() => {
    if (isPublic) {
      setReady(true)
      return
    }

    if (authDoneRef.current) return

    let active = true

    const check = async () => {
      const token = localStorage.getItem("triangle-token")
      if (!token) {
        if (active) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`)
        }
        return
      }

      try {
        const { user } = await fetchAdminMe()
        if (!active || authDoneRef.current) return

        if (user.role !== "admin") {
          authDoneRef.current = true
          if (active) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`)
          }
          return
        }

        authDoneRef.current = true
        if (active) setReady(true)
      } catch {
        if (active && !authDoneRef.current) {
          authDoneRef.current = true
          router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`)
        }
      }
    }

    void check()

    return () => {
      active = false
    }
  }, [pathname, router, isPublic])

  /* ── Handlers ── */
  const toggleSidebar = useCallback(() => {
    setMobileSidebarOpen(false)
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev)
  }, [])

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false)
  }, [])

  /* Close mobile sidebar on route change */
  useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  /* ── Render states ── */

  // Public pages — pass through
  if (isPublic) {
    return <>{children}</>
  }

  // Loading auth
  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="admin-panel w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">正在检查后台权限</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">未登录或权限不足时，会自动跳回登录页。</p>
        </div>
      </main>
    )
  }

  /* ── Main authenticated layout ── */
  return (
    <>
      {/* TopBar — fixed */}
      <AdminTopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main content area */}
      <main
        className={
          "pt-14 min-h-screen transition-all duration-300" +
          " " +
          (sidebarCollapsed
            ? "pl-[64px] max-lg:pl-0"
            : "pl-[240px] max-lg:pl-0")
        }
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {/* Auto breadcrumb for all admin sub-pages */}
          <AdminBreadcrumb />

          {/* Page content */}
          <section className="space-y-5">{children}</section>
        </div>
      </main>

      {/* Mobile sidebar toggle overlay trigger — visible when mobile sidebar is closed */}
      <button
        onClick={toggleMobileSidebar}
        className={
          "fixed bottom-4 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl transition hover:scale-105 lg:hidden" +
          (mobileSidebarOpen ? " hidden" : "")
        }
        aria-label="打开导航菜单"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </>
  )
}
