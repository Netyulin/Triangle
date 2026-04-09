"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { clearToken, request, setToken, type AuthPayload, type SiteSettings, type User, type UserPermissions } from "@/lib/api"
import { getMessages } from "@/lib/i18n"
import { Toaster } from "@/components/ui/toaster"

type AppContextValue = {
  t: ReturnType<typeof getMessages>
  user: User | null
  permissions: UserPermissions | null
  token: string
  siteSettings: SiteSettings | null
  refreshSession: () => Promise<void>
  saveSession: (payload: AuthPayload) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)
const SITE_SETTINGS_UPDATED_EVENT = "triangle-site-settings-updated"

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    document.documentElement.lang = "zh-CN"
    setTokenState(window.localStorage.getItem("triangle-token") ?? "")
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

  const refreshSession = async () => {
    const storedToken = window.localStorage.getItem("triangle-token") ?? ""
    if (!storedToken) {
      setUser(null)
      setPermissions(null)
      setTokenState("")
      return
    }

    try {
      const data = await request<{ user: User; permissions: UserPermissions }>("/api/auth/me", { token: storedToken })
      setTokenState(storedToken)
      setUser(data.user)
      setPermissions(data.permissions)
    } catch {
      // 网络异常时保留 token，下次访问会自动重试
    }
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem("triangle-token")
    if (storedToken) {
      void refreshSession()
    } else if (!token) {
      setUser(null)
      setPermissions(null)
    }
  }, [token])

  const saveSession = (payload: AuthPayload) => {
    setToken(payload.token)
    setTokenState(payload.token)
    setUser(payload.user)
    setPermissions(payload.permissions)
  }

  const logout = () => {
    clearToken()
    setTokenState("")
    setUser(null)
    setPermissions(null)
  }

  const value = useMemo<AppContextValue>(
    () => ({
      t: getMessages(),
      user,
      permissions,
      token,
      siteSettings,
      refreshSession,
      saveSession,
      logout,
    }),
    [user, permissions, token, siteSettings],
  )

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
