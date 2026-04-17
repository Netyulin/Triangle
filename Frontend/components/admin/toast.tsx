"use client"

import { useEffect, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info" | "warning"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastItemProps extends Toast {
  onRemove: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styles = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300",
  error: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300",
  info: "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/30 dark:border-sky-900/50 dark:text-sky-300",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300",
}

const iconColors = {
  success: "text-emerald-500",
  error: "text-rose-500",
  info: "text-sky-500",
  warning: "text-amber-500",
}

function ToastItem({ id, type, title, message, duration = 5000, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const Icon = icons[type]

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10)
    
    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(id), 300)
    }, duration)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(dismissTimer)
    }
  }, [id, duration, onRemove])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onRemove(id), 300)
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm transition-all duration-300",
        styles[type],
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      role="alert"
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColors[type])} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
      </div>
      <button
        onClick={handleClose}
        className="shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]))
}

export function toast(type: ToastType, title: string, message?: string, duration?: number) {
  const id = Math.random().toString(36).substring(2, 9)
  toasts = [...toasts, { id, type, title, message, duration }]
  notifyListeners()
  return id
}

export function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  notifyListeners()
}

export function ToastContainer() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setActiveToasts(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const handleRemove = useCallback((id: string) => {
    dismissToast(id)
  }, [])

  if (activeToasts.length === 0) return null

  return (
    <div className="fixed right-4 top-20 z-[100] flex flex-col gap-2 sm:right-6 sm:top-24">
      {activeToasts.map(t => (
        <ToastItem key={t.id} {...t} onRemove={handleRemove} />
      ))}
    </div>
  )
}

// Convenience methods
export const toastSuccess = (title: string, message?: string) => toast("success", title, message)
export const toastError = (title: string, message?: string) => toast("error", title, message)
export const toastInfo = (title: string, message?: string) => toast("info", title, message)
export const toastWarning = (title: string, message?: string) => toast("warning", title, message)
