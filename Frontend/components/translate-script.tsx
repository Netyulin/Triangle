"use client"

import { useEffect, useState } from "react"

declare global {
  interface Window {
    translate?: {
      language: {
        setLocal: (lang: string) => void
        getLocal: () => string
        translateNode: (node: HTMLElement) => void
      }
      service: {
        use: (service: string) => void
      }
      listener: {
        start: () => void
        stop: () => void
      }
      execute: () => void
      to: (targetLang: string) => void
    }
  }
}

interface TranslateScriptProps {
  defaultLanguage?: string
  autoExecute?: boolean
}

export function TranslateScript({
  defaultLanguage = "chinese_simplified",
  autoExecute = true,
}: TranslateScriptProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (document.getElementById("translate-script")) {
      setLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.id = "translate-script"
    script.src = "https://cdn.staticfile.net/translate.js/3.18.66/translate.js"
    script.async = true

    script.onload = () => {
      if (window.translate) {
        window.translate.language.setLocal(defaultLanguage)
        window.translate.service.use("client.edge")
        window.translate.listener.start()
        if (autoExecute) {
          window.translate.execute()
        }
      }
      setLoaded(true)
    }

    script.onerror = () => {
      console.warn("[Translate] Failed to load translate.js")
      setLoaded(false)
    }

    document.body.appendChild(script)
  }, [defaultLanguage, autoExecute])

  // 隐藏 translate.js 默认的右下角浮动选择器
  useEffect(() => {
    const styleId = "translate-hide-style"
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      #translateSelectLanguage {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      .translatebox {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [])

  return null
}
