"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & { loaded?: boolean }
    __triangleAdsenseLoader?: Promise<void>
  }
}

export const ADSENSE_PUBLISHER_ID =
  process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "ca-pub-7143421934912272"

interface AdSenseSlotProps {
  slotId: string
  width?: number | "auto"
  height?: number
  format?: "auto" | "fluid" | "horizontal" | "vertical" | "rectangle"
  layout?: string
  className?: string
  isInterstitial?: boolean
}

type AdState = "idle" | "loading" | "requested" | "error"

const ADSENSE_GLOBAL_HIDE_KEY = "triangle_adsense_global_hide"
const ADSENSE_SLOT_HIDE_PREFIX = "triangle_adsense_slot_hide:"
const ADSENSE_RENDER_TIMEOUT_MS = 2500
const ADSENSE_STATUS_CHECK_INTERVAL_MS = 500

function getSlotHideKey(slotId: string) {
  return `${ADSENSE_SLOT_HIDE_PREFIX}${slotId}`
}

function shouldHideAllAds() {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(ADSENSE_GLOBAL_HIDE_KEY) === "1"
}

function shouldHideSlot(slotId: string) {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(getSlotHideKey(slotId)) === "1"
}

function markAllAdsHidden() {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ADSENSE_GLOBAL_HIDE_KEY, "1")
}

function markSlotHidden(slotId: string) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(getSlotHideKey(slotId), "1")
}

function loadAdSenseScript() {
  if (typeof window === "undefined") {
    return Promise.resolve()
  }

  if (window.__triangleAdsenseLoader) {
    return window.__triangleAdsenseLoader
  }

  window.__triangleAdsenseLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    )

    if (existing) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.async = true
    script.crossOrigin = "anonymous"
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("AdSense 脚本加载失败"))
    document.head.appendChild(script)
  })

  return window.__triangleAdsenseLoader
}

export function AdSenseSlot({
  slotId,
  width = "auto",
  height = 90,
  format = "auto",
  layout,
  className,
  isInterstitial = false,
}: AdSenseSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const requestedRef = useRef(false)
  const renderTimerRef = useRef<number | null>(null)
  const [state, setState] = useState<AdState>("idle")
  const [hidden, setHidden] = useState(false)

  const minHeight = useMemo(() => {
    if (height && Number.isFinite(height)) {
      return `${height}px`
    }
    return "90px"
  }, [height])

  useEffect(() => {
    if (!slotId || typeof window === "undefined") {
      return
    }

    if (shouldHideAllAds() || shouldHideSlot(slotId)) {
      setHidden(true)
      return
    }

    let cancelled = false
    let slotObserver: MutationObserver | null = null
    let statusTimer: number | null = null

    const clearRenderTimer = () => {
      if (renderTimerRef.current !== null) {
        window.clearTimeout(renderTimerRef.current)
        renderTimerRef.current = null
      }
    }

    const clearStatusTimer = () => {
      if (statusTimer !== null) {
        window.clearInterval(statusTimer)
        statusTimer = null
      }
    }

    const getSlotElement = () => containerRef.current?.querySelector<HTMLElement>("ins.adsbygoogle")

    const isExplicitlyUnfilled = () => {
      const slotElement = getSlotElement()
      if (!slotElement) {
        return false
      }
      return slotElement.getAttribute("data-ad-status") === "unfilled"
    }

    const hasRenderableContent = () => {
      const slotElement = getSlotElement()
      if (!slotElement) {
        return false
      }

      // Hide by default unless Google explicitly marks this slot as filled.
      // This avoids keeping an empty/failed frame on the page.
      return slotElement.getAttribute("data-ad-status") === "filled"
    }

    const hideCurrentSlot = (hideAll = false) => {
      clearRenderTimer()
      clearStatusTimer()
      slotObserver?.disconnect()
      slotObserver = null

      if (hideAll) {
        markAllAdsHidden()
      } else {
        markSlotHidden(slotId)
      }

      if (!cancelled) {
        setState("error")
        setHidden(true)
      }
    }

    const watchSlotRender = () => {
      const slotElement = getSlotElement()
      if (!slotElement) {
        hideCurrentSlot()
        return
      }

      if (isExplicitlyUnfilled()) {
        hideCurrentSlot()
        return
      }

      if (hasRenderableContent()) {
        if (!cancelled) {
          setState("requested")
        }
        return
      }

      slotObserver = new MutationObserver(() => {
        if (isExplicitlyUnfilled()) {
          hideCurrentSlot()
          return
        }

        if (hasRenderableContent()) {
          clearRenderTimer()
          clearStatusTimer()
          slotObserver?.disconnect()
          slotObserver = null
          if (!cancelled) {
            setState("requested")
          }
        }
      })

      slotObserver.observe(slotElement, {
        childList: true,
        subtree: true,
        attributes: true,
      })

      statusTimer = window.setInterval(() => {
        if (isExplicitlyUnfilled()) {
          hideCurrentSlot()
          return
        }

        if (hasRenderableContent()) {
          clearRenderTimer()
          clearStatusTimer()
          slotObserver?.disconnect()
          slotObserver = null
          if (!cancelled) {
            setState("requested")
          }
        }
      }, ADSENSE_STATUS_CHECK_INTERVAL_MS)

      renderTimerRef.current = window.setTimeout(() => {
        if (!hasRenderableContent() || isExplicitlyUnfilled()) {
          hideCurrentSlot()
        }
      }, ADSENSE_RENDER_TIMEOUT_MS)
    }

    const requestAd = async () => {
      try {
        setState("loading")
        await loadAdSenseScript()
        if (cancelled || !containerRef.current || requestedRef.current) {
          return
        }

        requestedRef.current = true
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        watchSlotRender()
      } catch {
        hideCurrentSlot(true)
      }
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          intersectionObserver.disconnect()
          void requestAd()
        }
      },
      { rootMargin: "200px" },
    )

    if (containerRef.current) {
      intersectionObserver.observe(containerRef.current)
    }

    return () => {
      cancelled = true
      clearRenderTimer()
      clearStatusTimer()
      slotObserver?.disconnect()
      intersectionObserver.disconnect()
    }
  }, [slotId])

  if (!slotId || hidden) {
    return null
  }

  return (
    <div className={cn("relative", className)}>
      <div className="mb-1 flex items-center gap-1">
        <span className="text-[10px] tracking-wide text-muted-foreground">广告</span>
        <GoogleIcon />
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900/50"
        style={{ minHeight }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: width === "auto" ? "100%" : `${width}px`,
            height: typeof height === "number" ? `${height}px` : minHeight,
          }}
          data-ad-client={ADSENSE_PUBLISHER_ID}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-ad-layout={layout}
          data-ad-channel={isInterstitial ? "interstitial" : undefined}
          data-full-width-responsive={width === "auto" ? "true" : undefined}
          data-adtest={process.env.NODE_ENV === "production" ? undefined : "on"}
        />

        {state === "idle" || state === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
            <div className="flex flex-col items-center gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg
      className="h-3 w-3 text-muted-foreground/60"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        fill="currentColor"
      />
    </svg>
  )
}

export default AdSenseSlot
