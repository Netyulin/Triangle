"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { clearToken, request, setToken, type AuthPayload, type SiteSettings, type User, type UserPermissions } from "@/lib/api"
import { getMessages } from "@/lib/i18n"
import { Toaster } from "@/components/ui/toaster"

type AppContextValue = {
  t: ReturnType<typeof getMessages>
  user: User | null
  permissions: UserPermissions | null
  token: string
  siteSettings: SiteSettings | null
  unreadCount: number
  refreshSession: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
  saveSession: (payload: AuthPayload) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)
const SITE_SETTINGS_UPDATED_EVENT = "triangle-site-settings-updated"
const AUTH_ERROR_MESSAGES = new Set(["login required", "token expired", "invalid token", "user not found"])

function isAuthFailure(error: unknown) {
  if (!(error instanceof Error)) return false
  return AUTH_ERROR_MESSAGES.has(error.message.trim().toLowerCase())
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [token, setTokenState] = useState("")
  const [bootstrapped, setBootstrapped] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    document.documentElement.lang = "zh-CN"
    setTokenState(window.localStorage.getItem("triangle-token") ?? "")
    setBootstrapped(true)
  }, [])

  useEffect(() => {
    let active = true
    const loadSiteSettings = async () => {
      try {
        const settings = await request<SiteSettings>("/api/settings")
        if (!active) return
        setSiteSettings(settings)
      } catch {
        if (!active) return
      }
    }

    void loadSiteSettings()
    const handleSiteSettingsUpdated = () => {
      void loadSiteSettings()
    }
    window.addEventListener(SITE_SETTINGS_UPDATED_EVENT, handleSiteSettingsUpdated)

    return () => {
      active = false
      window.removeEventListener(SITE_SETTINGS_UPDATED_EVENT, handleSiteSettingsUpdated)
    }
  }, [])

  const refreshUnreadCount = async () => {
    const storedToken = window.localStorage.getItem("triangle-token") ?? ""
    if (!storedToken) {
      setUnreadCount(0)
      return
    }

    try {
      const data = await request<{ unreadCount: number }>("/api/notifications/unread-count", { token: storedToken })
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      setUnreadCount(0)
    }
  }

  const refreshSession = async () => {
    if (!token) {
      setUser(null)
      setPermissions(null)
      setTokenState("")
      setUnreadCount(0)
      return
    }

    try {
      const data = await request<{ user: User; permissions: UserPermissions }>("/api/auth/me", { token })
      setUser(data.user)
      setPermissions(data.permissions)
      await refreshUnreadCount()
    } catch (error) {
      if (isAuthFailure(error)) {
        clearToken()
        setTokenState("")
        setUser(null)
        setPermissions(null)
        setUnreadCount(0)
        return
      }
      // 网络异常时保留 token，下次访问会自动重试
    }
  }

  useEffect(() => {
    if (!bootstrapped) return
    if (token) {
      void refreshSession()
    } else {
      setUser(null)
      setPermissions(null)
      setUnreadCount(0)
    }
  }, [bootstrapped, token])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const payloadData: { path: string; referrer?: string } = {
      path: pathname || window.location.pathname,
    }
    const referrer = document.referrer || ""
    if (referrer) {
      payloadData.referrer = referrer
    }

    const payload = JSON.stringify(payloadData)

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/page-view", new Blob([payload], { type: "application/json" }))
    } else {
      void fetch("/api/analytics/page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }

    if (token && user) {
      void refreshUnreadCount()
    }
  }, [pathname, token, user])

  const saveSession = (payload: AuthPayload) => {
    setToken(payload.token)
    setTokenState(payload.token)
    setUser(payload.user)
    setPermissions(payload.permissions)
    void refreshUnreadCount()
  }

  const logout = () => {
    clearToken()
    setTokenState("")
    setUser(null)
    setPermissions(null)
    setUnreadCount(0)
  }

  const value: AppContextValue = {
    t: getMessages(),
    user,
    permissions,
    token,
    siteSettings,
    unreadCount,
    refreshSession,
    refreshUnreadCount,
    saveSession,
    logout,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <Toaster />
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider")
  }
  return context
}
