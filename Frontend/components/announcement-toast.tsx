"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type Announcement = {
  id: string | number
  title: string
  content: string
  kind: "system" | "activity" | "normal" | "notice"
  pinned?: boolean
  createdAt: string
}

interface AnnouncementToastProps {
  announcements: Announcement[]
}

const STORAGE_KEY = "triangle_ann_read"

function getIdKey(id: string | number) {
  return String(id)
}

function AnnouncementItem({ item, onDismiss }: { item: Announcement; onDismiss: (id: string | number) => void }) {
  const [countdown, setCountdown] = useState(8)
  const [autoClose, setAutoClose] = useState(true)

  useEffect(() => {
    if (!autoClose) return
    if (countdown <= 0) {
      onDismiss(item.id)
      return
    }
    const timer = window.setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearInterval(timer)
  }, [countdown, autoClose, item.id, onDismiss])

  const kindLabel = item.kind === "system" ? "系统公告" : item.kind === "activity" ? "活动通知" : "站内通知"
  const kindColor = item.kind === "system" ? "text-sky-500" : item.kind === "activity" ? "text-amber-500" : "text-muted-foreground"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold uppercase tracking-wide", kindColor)}>{kindLabel}</span>
          {item.pinned ? (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">置顶</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {autoClose && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
              {countdown}
            </span>
          )}
          <button
            onClick={() => onDismiss(item.id)}
            aria-label="关闭公告"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <h3 className="text-base font-bold text-foreground">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.content}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">{item.createdAt}</span>
        <button
          onClick={() => setAutoClose(false)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {autoClose ? "取消自动关闭" : "已暂停自动关闭"}
        </button>
      </div>
    </div>
  )
}

export function AnnouncementToast({ announcements }: AnnouncementToastProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState<Announcement[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setReadIds(new Set(JSON.parse(stored) as string[]))
    } catch {}
  }, [])

  useEffect(() => {
    const unread = announcements.filter((a) => !readIds.has(getIdKey(a.id)))
    setVisible(unread)
    setCurrent(0)
  }, [announcements, readIds])

  const dismiss = (id: string | number) => {
    const key = getIdKey(id)
    const newRead = new Set(readIds)
    newRead.add(key)
    setReadIds(newRead)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newRead]))
    } catch {}
    if (current >= visible.length - 1) {
      setCurrent((c) => Math.min(c, visible.length - 2))
    }
  }

  const active = visible[current]
  if (!active) return null

  return (
    <div className="fixed right-4 top-16 z-[100] w-full max-w-sm space-y-3" role="region" aria-label="网站公告">
      <AnnouncementItem key={getIdKey(active.id)} item={active} onDismiss={dismiss} />

      {visible.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {visible.map((a, i) => (
            <button
              key={getIdKey(a.id)}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-5 bg-accent" : "w-1.5 bg-muted-foreground/30",
              )}
              aria-label={`第 ${i + 1} 条公告`}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">
            {current + 1} / {visible.length}
          </span>
        </div>
      )}
    </div>
  )
}
