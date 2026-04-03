export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "/api"

export type ApiEnvelope<T> = {
  success: boolean
  code: number
  message: string
  data: T
  timestamp: number
}

export type User = {
  id: number
  username: string
  email: string | null
  name: string | null
  avatar: string | null
  gender: string
  role: string
  membershipLevel: string
  canSubmitRequest: boolean
  canComment: boolean
  downloadQuotaDaily: number
  downloadCountDaily: number
}

export type UserPermissions = {
  role: string
  membershipLevel: string
  canComment: boolean
  canSubmitRequest: boolean
  allowedDownloadLevels: string[]
  downloadQuotaDaily: number
  downloadCountDaily: number
  remainingDownloads: number
}

export type AuthPayload = {
  token: string
  user: User
  permissions: UserPermissions
}

export type SiteSettings = {
  siteName: string
  siteDescription: string
  homeFeaturedPostCount: number
  registrationEnabled: boolean
  registrationRequiresInvite: boolean
  defaultLocale?: string
  supportedLocales?: string[]
  languageOptions?: Array<{ value: string; label: string }>
  updatedAt?: string
}

export type AppSummary = {
  id: number
  slug: string
  name: string
  subtitle: string
  category: string
  icon: string
  version: string
  size: string
  rating: number
  downloads: string
  updatedAt: string
  compatibility: string[]
  platforms: string[]
  heroImage: string
  gallery: string[]
  tags: string[]
  verified: boolean
  editorialScore: number
  pricing: string
  summary: string
  summaryText: string
  highlights: string[]
  requirements: string[]
  review: string
  featured: boolean
  status: string
  accessLevel: string
  isDownloadable: boolean
  downloadUrl: string | null
  downloadLinks: Array<{ name: string; url: string }>
}

export type PostSummary = {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  author: string
  coverImage: string
  featured: boolean
  readingTime: string
  dateLabel: string
  publishedAt: string
  status: string
  relatedApp?: {
    slug: string
    name: string
    icon: string | null
    subtitle: string | null
  } | null
}

export type RequestItem = {
  id: number
  title: string
  description: string
  authorName: string
  authorEmail?: string
  status: "pending" | "processing" | "done" | "rejected"
  adminReply: string | null
  createdAt: string
  repliedAt: string | null
  voteCount?: number
  userVoted?: boolean
  userId?: number | null
}

export type RequestListPayload = {
  list: RequestItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type SearchPayload = {
  keyword: string
  type: string
  apps: Array<{
    id: number
    slug: string
    name: string
    subtitle: string
    icon: string
    category: string
    pricing: string
    rating: number
    featured: boolean
    heroImage: string
  }>
  posts: Array<{
    id: number
    slug: string
    title: string
    excerpt: string
    coverImage: string
    category: string
    author: string
    readingTime: string
    dateLabel: string
    featured: boolean
  }>
  requests: RequestItem[]
  totalApps: number
  totalPosts: number
  totalRequests: number
  total: number
}

export type HomeSlide = {
  id: string
  type: "app" | "post"
  tag: string
  subtitle: string
  title: string
  desc: string
  color: string
  coverBg: string
  coverText: string
  coverColor: string
  href: string
  downloadHref: string | null
}

export type RankedPost = PostSummary & {
  rank: number
}

export type RankedApp = AppSummary & {
  rank: number
}

export type HomePayload = {
  site: {
    siteName: string
    siteDescription: string
    defaultLocale?: string
    supportedLocales?: string[]
    languageOptions?: Array<{ value: string; label: string }>
  }
  stats: {
    publishedApps: number
    publishedPosts: number
    publicRequests: number
    solvedRequests: number
  }
  heroSlides: HomeSlide[]
  featuredPosts: PostSummary[]
  softwareRankings: RankedApp[]
  editorPicks: PostSummary[]
  readingRanks: RankedPost[]
  hotSearches: Array<{ keyword: string; count: number }>
}

export type FavoritesPayload = {
  apps: AppSummary[]
  posts: PostSummary[]
}

export type RechargeRecord = {
  id: number
  amount: number
  status: string
  description: string
  createdAt: string
}

export type ProfilePayload = {
  user: User
  permissions: UserPermissions
  requests: RequestItem[]
  comments: Array<{
    id: number
    content: string
    createdAt: string
  }>
  favorites: FavoritesPayload
  rechargeRecords: RechargeRecord[]
}

export type AppAccessPayload = {
  appSlug: string
  accessLevel: string
  isDownloadable: boolean
  downloadUrl: string | null
  downloadLinks: Array<{ name: string; url: string }>
  downloadPermission: {
    allowed: boolean
    reason: string
    requiresLogin: boolean
  }
  userPermissions: UserPermissions
}

export type NetdiskReportItem = {
  id: number
  appSlug: string
  app: {
    slug: string
    name: string
    category: string
    icon: string | null
  } | null
  netdiskName: string
  downloadUrl: string | null
  reason: string
  contact: string | null
  status: "pending" | "handled" | string
  adminNote: string | null
  createdAt: string
  handledAt: string | null
}

export type NetdiskReportListPayload = {
  list: NetdiskReportItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function getToken() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem("triangle-token") ?? ""
}

export function setToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("triangle-token", token)
}

export function clearToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("triangle-token")
}

type RequestOptions = RequestInit & {
  token?: string
}

export async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers ?? {})
  headers.set("Content-Type", "application/json")

  const token = options.token ?? getToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "请求失败")
  }
  return payload.data
}

export function formatDateLabel(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("zh-CN")
}
