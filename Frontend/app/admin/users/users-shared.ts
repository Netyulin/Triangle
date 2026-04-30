"use client"

import { Award, KeyRound, ShieldCheck, Sparkles } from "lucide-react"

export type UserFilter = "all" | "active" | "disabled" | "banned"
export type RegistrationSourceFilter = "all" | "email" | "wechat" | "other"
export type ActivityFilter = "all" | "today" | "7d" | "30d" | "never"

export const filters: Array<{ key: UserFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "active", label: "正常" },
  { key: "disabled", label: "禁用" },
  { key: "banned", label: "封禁" },
]

export const registrationSourceFilters: Array<{ key: RegistrationSourceFilter; label: string }> = [
  { key: "all", label: "全部来源" },
  { key: "email", label: "邮箱注册" },
  { key: "wechat", label: "微信注册" },
  { key: "other", label: "其他导入" },
]

export const activityFilters: Array<{ key: ActivityFilter; label: string }> = [
  { key: "all", label: "全部活跃" },
  { key: "today", label: "今天活跃" },
  { key: "7d", label: "7天内活跃" },
  { key: "30d", label: "30天内活跃" },
  { key: "never", label: "从未登录" },
]

export const membershipOptions = [
  { value: "free", label: "免费会员", icon: ShieldCheck },
  { value: "sponsor", label: "赞助会员", icon: Award },
  { value: "lifetime", label: "终身会员", icon: KeyRound },
  { value: "supreme", label: "至尊会员", icon: Sparkles },
]

export function statusLabel(status?: string) {
  if (status === "disabled") return "已禁用"
  if (status === "banned") return "已封禁"
  return "正常"
}

export function normalizeMembershipLevel(level?: string) {
  const value = String(level || "").trim().toLowerCase()
  if (value === "member") return "sponsor"
  if (value === "vip") return "supreme"
  if (value === "premium") return "lifetime"
  if (value === "sponsor" || value === "lifetime" || value === "supreme" || value === "free") return value
  return "free"
}

export function shortUdid(udid: string) {
  if (!udid) return ""
  if (udid.length <= 16) return udid
  return `${udid.slice(0, 8)}...${udid.slice(-8)}`
}

export function registrationSourceLabel(source?: string) {
  if (source === "wechat") return "微信注册"
  if (source === "email") return "邮箱注册"
  return "其他导入"
}
