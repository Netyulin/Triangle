"use client"

import { Award, BadgeCheck, Crown, Shield, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export type MembershipLevel = "free" | "member" | "premium" | "sponsor" | "lifetime" | "supreme"

type MembershipBadgeProps = {
  level: string
  compact?: boolean
  className?: string
}

const levelMeta: Record<MembershipLevel, { label: string; icon: typeof Shield; className: string }> = {
  free: {
    label: "注册会员",
    icon: Shield,
    className: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  member: {
    label: "黄金会员",
    icon: BadgeCheck,
    className: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
  premium: {
    label: "白金会员",
    icon: Award,
    className: "border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  sponsor: {
    label: "黄金会员",
    icon: BadgeCheck,
    className: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  },
  lifetime: {
    label: "终生会员",
    icon: Crown,
    className: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  },
  supreme: {
    label: "至尊会员",
    icon: Sparkles,
    className: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
}

function normalizeMembershipLevel(level: string): MembershipLevel {
  const value = String(level || "").trim().toLowerCase()
  if (value === "member") return "sponsor"
  if (value === "vip") return "supreme"
  if (value === "premium") return "premium"
  if (value === "sponsor" || value === "lifetime" || value === "supreme" || value === "free") return value
  return "free"
}

export function getMembershipMeta(level: string) {
  return levelMeta[normalizeMembershipLevel(level)] ?? levelMeta.free
}

export function MembershipBadge({ level, compact = false, className }: MembershipBadgeProps) {
  const meta = getMembershipMeta(level)
  const Icon = meta.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        compact && "px-2 py-0.5",
        meta.className,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
      {meta.label}
    </span>
  )
}
