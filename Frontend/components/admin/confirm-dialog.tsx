"use client"

import { useState, useCallback, useEffect } from "react"
import { AlertTriangle, Trash2, EyeOff, CheckCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ConfirmType = "delete" | "hide" | "show" | "archive" | "custom"

interface ConfirmOptions {
  type?: ConfirmType
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: "danger" | "primary" | "secondary"
}

interface ConfirmDialogState extends ConfirmOptions {
  isOpen: boolean
  resolve?: (value: boolean) => void
}

const defaultTitles: Record<ConfirmType, string> = {
  delete: "确认删除",
  hide: "确认隐藏",
  show: "确认显示",
  archive: "确认归档",
  custom: "请确认",
}

const defaultMessages: Record<ConfirmType, string> = {
  delete: "此操作无法撤销，确定要删除吗？",
  hide: "隐藏后内容将不再对外可见，确定要继续吗？",
  show: "确定要显示此内容吗？",
  archive: "归档后内容将被移入存档，确定要继续吗？",
  custom: "您确定要执行此操作吗？",
}

const icons: Record<ConfirmType, typeof Trash2> = {
  delete: Trash2,
  hide: EyeOff,
  show: CheckCircle,
  archive: AlertTriangle,
  custom: AlertTriangle,
}

const iconStyles: Record<ConfirmType, string> = {
  delete: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  hide: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  show: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  archive: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  custom: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
}

// Global dialog state
let dialogState: ConfirmDialogState = { isOpen: false }
let listeners: ((state: ConfirmDialogState) => void)[] = []

function notifyListeners() {
  listeners.forEach(listener => listener({ ...dialogState }))
}

export function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    dialogState = {
      isOpen: true,
      ...options,
      resolve,
    }
    notifyListeners()
  })
}

function handleConfirm() {
  dialogState.resolve?.(true)
  dialogState = { isOpen: false }
  notifyListeners()
}

function handleCancel() {
  dialogState.resolve?.(false)
  dialogState = { isOpen: false }
  notifyListeners()
}

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({ isOpen: false })

  useEffect(() => {
    const listener = (newState: ConfirmDialogState) => setState(newState)
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!state.isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel()
    }
    
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [state.isOpen])

  // Prevent body scroll when open
  useEffect(() => {
    if (state.isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [state.isOpen])

  if (!state.isOpen) return null

  const type = state.type || "custom"
  const Icon = icons[type]
  const title = state.title || defaultTitles[type]
  const message = state.message || defaultMessages[type]
  const confirmLabel = state.confirmLabel || "确认"
  const cancelLabel = state.cancelLabel || "取消"
  const confirmVariant = state.confirmVariant || (type === "delete" ? "danger" : "primary")

  const confirmStyles = {
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80",
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconStyles[type]
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            </div>
            <button
              onClick={handleCancel}
              className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition",
                confirmStyles[confirmVariant]
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Convenience methods
export const confirmDelete = (itemName?: string) => 
  confirm({
    type: "delete",
    title: itemName ? `删除"${itemName}"` : "确认删除",
    message: itemName 
      ? `确定要删除"${itemName}"吗？此操作无法撤销。`
      : "此操作无法撤销，确定要删除吗？",
    confirmLabel: "删除",
    confirmVariant: "danger",
  })

export const confirmHide = (itemName?: string) =>
  confirm({
    type: "hide",
    title: itemName ? `隐藏"${itemName}"` : "确认隐藏",
    message: itemName
      ? `确定要隐藏"${itemName}"吗？隐藏后内容将不再对外可见。`
      : "隐藏后内容将不再对外可见，确定要继续吗？",
    confirmLabel: "隐藏",
  })

export const confirmShow = (itemName?: string) =>
  confirm({
    type: "show",
    title: itemName ? `显示"${itemName}"` : "确认显示",
    message: itemName
      ? `确定要显示"${itemName}"吗？`
      : "确定要显示此内容吗？",
    confirmLabel: "显示",
  })
