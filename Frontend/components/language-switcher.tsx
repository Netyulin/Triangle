"use client"

import { useEffect, useState, useCallback } from "react"
import { Globe, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LANGUAGE_GROUPS = [
  {
    label: "Asia",
    languages: [
      { code: "chinese_simplified", label: "简体中文", flag: "CN" },
      { code: "chinese_traditional", label: "繁体中文", flag: "HK" },
      { code: "japanese", label: "日本語", flag: "JP" },
      { code: "korean", label: "한국어", flag: "KR" },
    ],
  },
  {
    label: "Europe & Americas",
    languages: [
      { code: "english", label: "English", flag: "US" },
      { code: "french", label: "Français", flag: "FR" },
      { code: "german", label: "Deutsch", flag: "DE" },
      { code: "spanish", label: "Español", flag: "ES" },
      { code: "portuguese", label: "Português", flag: "PT" },
      { code: "russian", label: "Русский", flag: "RU" },
    ],
  },
  {
    label: "Middle East",
    languages: [
      { code: "arabic", label: "العربية", flag: "SA" },
    ],
  },
]

// 通过 translate.js 内置的 select 元素触发翻译（保证事件同步）
function triggerTranslateJS(langCode) {
  const select = document.getElementById("translateSelectLanguage")
  if (select) {
    select.value = langCode
    select.dispatchEvent(new Event("change", { bubbles: true }))
  }
}

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState("chinese_simplified")
  const [mounted, setMounted] = useState(false)
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    setMounted(true)
    const select = document.getElementById("translateSelectLanguage")
    if (select?.value) {
      setCurrentLang(select.value)
    }
  }, [])

  const switchLanguage = useCallback((langCode) => {
    setTranslating(true)
    setCurrentLang(langCode)
    // 通过内置 select 触发，保证和 translate.js 内部状态同步
    triggerTranslateJS(langCode)
    setTimeout(() => setTranslating(false), 1500)
  }, [])

  const currentLabel = LANGUAGE_GROUPS.flatMap((g) => g.languages).find(
    (l) => l.code === currentLang
  )

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="gap-2 opacity-40 cursor-wait">
        <Globe className="h-4 w-4" />
        <span>语言</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 group transition-all"
          disabled={translating}
        >
          {translating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">翻译中...</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span>{currentLabel?.label ?? "语言"}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {LANGUAGE_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <DropdownMenuSeparator className="my-1.5" />}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </div>
            {group.languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={
                  currentLang === lang.code
                    ? "bg-accent font-medium"
                    : "cursor-pointer"
                }
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-sm bg-muted/70 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {lang.flag}
                </span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
