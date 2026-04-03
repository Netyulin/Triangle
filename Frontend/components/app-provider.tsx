"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { clearToken, request, setToken, type AuthPayload, type SiteSettings, type User, type UserPermissions } from "@/lib/api"
import { type Language, getMessages, isLanguage } from "@/lib/i18n"

type AppContextValue = {
  language: Language
  setLanguage: (language: Language) => void
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

function applyLanguage(language: Language) {
  document.documentElement.lang = language
  window.localStorage.setItem("triangle-language", language)
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh-CN")
  const [token, setTokenState] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("triangle-language")
    const nextLanguage = isLanguage(storedLanguage) ? storedLanguage : "zh-CN"
    setLanguageState(nextLanguage)
    applyLanguage(nextLanguage)
    setTokenState(window.localStorage.getItem("triangle-token") ?? "")
  }, [])

  useEffect(() => {
    let active = true

    const loadSiteSettings = async () => {
      try {
        const settings = await request<SiteSettings>("/api/settings")
        if (!active) return

        setSiteSettings(settings)

        const storedLanguage = window.localStorage.getItem("triangle-language")
        if (!isLanguage(storedLanguage) && isLanguage(settings.defaultLocale)) {
          setLanguageState(settings.defaultLocale)
          applyLanguage(settings.defaultLocale)
        }
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
      clearToken()
      setTokenState("")
      setUser(null)
      setPermissions(null)
    }
  }

  useEffect(() => {
    if (token) {
      refreshSession()
    }
  }, [token])

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    applyLanguage(nextLanguage)
  }

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
      language,
      setLanguage,
      t: getMessages(language),
      user,
      permissions,
      token,
      siteSettings,
      refreshSession,
      saveSession,
      logout,
    }),
    [language, user, permissions, token, siteSettings],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider")
  }
  return context
}
