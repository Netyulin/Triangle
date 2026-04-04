"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { fetchAdminMe } from "@/lib/admin-api"
import { clearToken, getToken } from "@/lib/api"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    const check = async () => {
      const token = getToken()
      if (!token) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`)
        return
      }

      try {
        const { user } = await fetchAdminMe()
        if (!active) return

        if (user.role !== "admin") {
          clearToken()
          router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`)
          return
        }

        setReady(true)
      } catch {
        if (!active) return
        clearToken()
        router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`)
      }
    }

    void check()

    return () => {
      active = false
    }
  }, [pathname, router])

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="admin-panel px-8 py-10 text-center">
          <p className="text-lg font-black text-foreground">正在检查后台权限...</p>
          <p className="mt-2 text-sm text-muted-foreground">未登录或权限不足时会自动跳回登录页。</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="admin-shell grid gap-6 p-4 md:p-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-6">
        <AdminSidebar />
        <section className="space-y-6">{children}</section>
      </div>
    </main>
  )
}
