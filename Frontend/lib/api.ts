// API 调用通过 Next.js /api/[...path] 代理路由访问后端
// 注意：所有 request() 路径已包含 /api 前缀，因此这里留空
export const API_BASE_URL = ""

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
  phone?: string | null
  role: string
  membershipLevel: string
  membershipExpireAt?: string | null
  status?: string
  banUntil?: string | null
  balance: number
  canSubmitRequest: boolean
  canReply?: boolean
  canSign?: boolean
  canSelfSign?: boolean
  canComment: boolean
  downloadQuotaDaily: number
  downloadCountDaily: number
  lastLoginAt?: string | null
  lastLoginIp?: string | null
  createdAt?: string
  updatedAt?: string
}

export type InboxItem = {
  id: string | number
  title: string
  content: string
  kind: "notification" | "message"
  read: boolean
  createdAt: string
  senderName?: string | null
  actionUrl?: string | null
  summary?: string | null
}

export type UserPermissions = {
  role: string
  membershipLevel: string
  canComment: boolean
  canReply?: boolean
  canSubmitRequest: boolean
  canSign: boolean
  canSelfSign: boolean
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
  siteAnnouncementEnabled?: boolean
  siteAnnouncementTitle?: string
  siteAnnouncementContent?: string
  siteAnnouncementLink?: string
  downloadInterstitialEnabled?: boolean
  downloadInterstitialTitle?: string
  downloadInterstitialDescription?: string
  downloadInterstitialButtonText?: string
  downloadInterstitialBuyUrl?: string
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
  displayMode?: "cover" | "icon"
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
  downloadLinks: Array<{ name: string; url: string; extractionCode?: string }>
  seoTitle?: string | null
  seoDescription?: string | null
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
  icon?: string | null
  displayMode?: "cover" | "icon"
  featured: boolean
  readingTime: string
  dateLabel: string
  publishedAt: string
  status: string
  updatedAt?: string
  seoTitle?: string | null
  seoDescription?: string | null
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
  icon?: string | null
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
  }
  announcements?: Array<{
    id: string | number
    title: string
    content: string
    kind: "system" | "notice" | "activity"
    createdAt: string
    pinned?: boolean
  }>
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
  downloadLinks: Array<{ name: string; url: string; extractionCode?: string }>
  downloadPermission: {
    allowed: boolean
    reason: string
    requiresLogin: boolean
  }
  userPermissions: UserPermissions
}

export type AppRatingPayload = {
  averageRating: number
  reviewCount: number
  userRating: number
}

export type CommentItem = {
  id: string
  contentId: string
  contentType: "app" | "post"
  userId?: number | null
  authorName: string
  authorAvatar?: string | null
  authorRole?: string | null
  authorUsername?: string | null
  authorMembershipLevel?: string | null
  authorMembershipLabel?: string | null
  isAnonymous?: boolean
  isAdminReply?: boolean
  content: string
  parentId?: string | null
  createdAt: string
  likes: number
  dislikes: number
  canDelete?: boolean
  userLiked?: boolean
  userDisliked?: boolean
  replies?: CommentItem[]
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

export type AdSlotData = {
  id: string
  name: string
  type: 'banner' | 'insertion' | 'native' | 'splash'
  position: 'top' | 'bottom' | 'sidebar' | 'infeed'
  width: number
  height: number
  isActive: boolean
  theme: 'light' | 'dark' | 'auto'
  _count?: { adContents: number }
}

export type AdContentData = {
  id: string
  slotId: string
  title: string
  description?: string
  imageUrl: string
  targetUrl: string
  ctaText: string
  advertiser: string
  isActive: boolean
  priority: number
}

export type AdSlotListPayload = {
  list: AdSlotData[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const ADSENSE_SLOT_KEYS = [
  "triangle_home_top",
  "triangle_detail_top",
  "triangle_detail_bottom",
  "triangle_download_interstitial",
] as const

export type AdSenseSlotKey = (typeof ADSENSE_SLOT_KEYS)[number]

export type AdSenseSlotToggles = Record<AdSenseSlotKey, boolean>

export const DEFAULT_ADSENSE_SLOT_TOGGLES: AdSenseSlotToggles = {
  triangle_home_top: true,
  triangle_detail_top: true,
  triangle_detail_bottom: true,
  triangle_download_interstitial: true,
}

export const ADSENSE_SLOT_IDS: Record<AdSenseSlotKey, string> = {
  triangle_home_top: process.env.NEXT_PUBLIC_ADSENSE_HOMEPAGE_SLOT_ID || "6517724385",
  triangle_detail_top: process.env.NEXT_PUBLIC_ADSENSE_DETAIL_SLOT_ID || "9554951266",
  triangle_detail_bottom: process.env.NEXT_PUBLIC_ADSENSE_DETAIL_BOTTOM_SLOT_ID || "5502259258",
  triangle_download_interstitial: process.env.NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT_ID || "3419021394",
}

export type DownloadInfo = {
  slug: string
  name: string
  version: string
  icon: string | null
  heroImage: string | null
  downloadUrl: string
  /** CPS 联盟跳转链接 */
  affiliateLink: string
  downloadLinks?: Array<{ name: string; url: string; extractionCode?: string }>
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
    // 使用 X-Token 而非 Authorization（Next.js 路由可能 strip Authorization）
    headers.set("X-Token", token)
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

export async function fetchAdSlots(params?: {
  page?: number
  pageSize?: number
  type?: string
  position?: string
  isActive?: boolean
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.type) searchParams.set('type', params.type)
  if (params?.position) searchParams.set('position', params.position)
  if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive))
  const query = searchParams.toString()
  return request<AdSlotListPayload>(`/api/ads${query ? `?${query}` : ''}`)
}

export function resolveAdSenseSlotToggles(slots: AdSlotData[] = []): AdSenseSlotToggles {
  const toggles: AdSenseSlotToggles = { ...DEFAULT_ADSENSE_SLOT_TOGGLES }
  const slotMap = new Map(slots.map((item) => [item.name, item]))
  for (const key of ADSENSE_SLOT_KEYS) {
    const slot = slotMap.get(key)
    if (slot) {
      toggles[key] = slot.isActive
    }
  }
  return toggles
}

export async function fetchAdSenseSlotToggles() {
  try {
    const payload = await fetchAdSlots({ page: 1, pageSize: 100 })
    return resolveAdSenseSlotToggles(payload.list)
  } catch {
    return { ...DEFAULT_ADSENSE_SLOT_TOGGLES }
  }
}

export async function fetchAdContent(slotId: string) {
  return request<AdContentData | null>(`/api/ads/content/${slotId}`)
}

export async function trackAdClick(adId: string, slotId?: string) {
  return request<{ tracked: boolean }>('/api/ads/content/click', {
    method: 'POST',
    body: JSON.stringify({ adId, slotId })
  })
}

export async function fetchDownloadInfo(slug: string) {
  return request<DownloadInfo>(`/api/download/${slug}`)
}

export async function fetchAppRating(slug: string, token?: string) {
  return request<AppRatingPayload>(`/api/apps/${slug}/rating`, token ? { token } : {})
}

export async function submitAppRating(slug: string, rating: number, token: string) {
  return request<AppRatingPayload>(`/api/apps/${slug}/rating`, {
    method: "POST",
    token,
    body: JSON.stringify({ rating }),
  })
}

export async function fetchComments(contentType: "app" | "post", contentId: string, token?: string) {
  const query = new URLSearchParams({
    contentType,
    contentId,
  })
  return request<CommentItem[]>(`/api/comments?${query.toString()}`, token ? { token } : {})
}

export async function createComment(
  payload: {
    contentType: "app" | "post"
    contentId: string
    content: string
    parentId?: string | null
    anonymous?: boolean
  },
  token: string
) {
  return request<CommentItem>("/api/comments", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
}

export async function reactComment(id: string, action: "like" | "dislike", token: string) {
  return request<{ likes: number; dislikes: number; userLiked: boolean; userDisliked: boolean }>(
    `/api/comments/${id}/${action}`,
    {
      method: "POST",
      token,
    }
  )
}

export async function removeComment(id: string, token: string) {
  return request<null>(`/api/comments/${id}`, {
    method: "DELETE",
    token,
  })
}
