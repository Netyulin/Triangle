import { API_BASE_URL, clearToken, formatDateLabel, getToken, type AppSummary, type NetdiskReportListPayload, type PostSummary, type ProfilePayload, type RequestItem, type SiteSettings, type User } from "@/lib/api"

type ApiEnvelope<T> = {
  success: boolean
  code: number
  message: string
  data: T
  timestamp: number
}

export type TopicItem = {
  id?: number
  slug: string
  title: string
  description: string
  coverImage: string | null
  status: "draft" | "published" | "archived"
  relatedAppSlugs: string[]
  relatedPostSlugs: string[]
  createdAt?: string
}

export type AppCategoryItem = {
  name: string
  sortOrder?: number
  count: number
  createdAt?: string
  updatedAt?: string
}

export type PostCategoryItem = {
  name: string
  sortOrder?: number
  count: number
  createdAt?: string
  updatedAt?: string
}

export type InviteCodeItem = {
  code: string
  note: string
  status: "used" | "unused"
  batchId?: string | null
  createdAt: string
  usedAt?: string | null
  usedByUserId?: number | null
  usedByUsername?: string | null
}

export type AdminStats = {
  totalApps: number
  totalPosts: number
  totalTopics: number
  totalComments: number
  totalRequests: number
  pendingRequests: number
  processingRequests: number
  publishedApps: number
  draftApps: number
  publishedPosts: number
  newAppsThisWeek: number
  newPostsThisWeek: number
  newRequestsThisWeek: number
}

export type TrendPayload = {
  trendData: Array<{ date: string; apps: number; posts: number; requests: number }>
}

export type AdminRequestListPayload = {
  list: RequestItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stats?: {
    pending: number
    processing: number
    done: number
    rejected: number
    total: number
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  token?: string
  body?: BodyInit | null
}

async function adminRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers ?? {})
  const token = options.token ?? getToken()
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ?? null,
    cache: "no-store",
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !payload.success) {
    if (response.status === 401) {
      clearToken()
    }
    throw new Error(payload.message || "请求失败")
  }

  return payload.data
}

export function resolveAssetUrl(value: string | null | undefined) {
  const source = String(value || "").trim()
  if (!source) return ""
  if (/^https?:\/\//i.test(source) || source.startsWith("data:image/")) return source
  // /uploads/ is static assets served by front-end (Next.js), not API backend
  if (source.startsWith('/uploads/')) {
    return source
  }
  if (source.startsWith("/")) {
    return `${API_BASE_URL}${source}`
  }
  return source
}

export function formatDateTime(value: string | null | undefined) {
  const source = String(value || "").trim()
  if (!source) return "-"
  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return source
  return date.toLocaleString("zh-CN")
}

export function formatDate(value: string | null | undefined) {
  return formatDateLabel(String(value || ""))
}

export async function fetchAdminMe() {
  return adminRequest<{ user: User; permissions: unknown }>("/api/auth/me")
}

export async function fetchAdminStats() {
  return adminRequest<AdminStats>("/api/admin/stats")
}

export async function fetchAdminTrends(days = 7) {
  return adminRequest<TrendPayload>(`/api/admin/trends?days=${days}`)
}

export async function fetchAdminApps() {
  const data = await adminRequest<{ list: AppSummary[] }>("/api/apps?pageSize=100")
  return data.list
}

export async function fetchAdminAppDetail(slug: string) {
  return adminRequest<AppSummary>(`/api/apps/${slug}`)
}

export async function saveAdminApp(slug: string | null, payload: Record<string, unknown>) {
  return adminRequest<AppSummary>(slug ? `/api/apps/${slug}` : "/api/apps", {
    method: slug ? "PUT" : "POST",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminApp(slug: string) {
  return adminRequest<null>(`/api/apps/${slug}`, { method: "DELETE" })
}

export async function fetchAdminPosts() {
  const data = await adminRequest<{ list: PostSummary[] }>("/api/posts?pageSize=100")
  return data.list
}

export async function fetchAdminPostDetail(slug: string) {
  return adminRequest<PostSummary>(`/api/posts/${slug}`)
}

export async function saveAdminPost(slug: string | null, payload: Record<string, unknown>) {
  return adminRequest<PostSummary>(slug ? `/api/posts/${slug}` : "/api/posts", {
    method: slug ? "PUT" : "POST",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminPost(slug: string) {
  return adminRequest<null>(`/api/posts/${slug}`, { method: "DELETE" })
}

export async function importAdminPostFromUrl(url: string) {
  return adminRequest<{
    sourceUrl: string
    finalUrl: string
    title: string
    excerpt: string
    author: string
    coverImage: string
    contentHtml: string
    readingTime: string
    siteName: string
    publishedAt: string
    warnings: string[]
  }>("/api/posts/import-from-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

export async function fetchAdminSettings() {
  return adminRequest<SiteSettings>("/api/admin/settings")
}

export async function updateAdminSettings(payload: SiteSettings) {
  return adminRequest<SiteSettings>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function fetchAdminRequests(status = "") {
  const query = new URLSearchParams({ pageSize: "100" })
  if (status) query.set("status", status)
  return adminRequest<AdminRequestListPayload>(`/api/requests/admin/list?${query.toString()}`)
}

export async function updateAdminRequest(id: number | string, payload: { status?: string; adminReply?: string }) {
  return adminRequest<RequestItem>(`/api/requests/admin/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function fetchAdminTopics() {
  return adminRequest<TopicItem[]>("/api/topics")
}

export async function fetchAdminNetdiskReports(pageSize = 100) {
  return adminRequest<NetdiskReportListPayload>(`/api/admin/netdisk-reports?page=1&pageSize=${pageSize}`)
}

export async function fetchAdminAppCategories() {
  return adminRequest<AppCategoryItem[]>("/api/admin/app-categories")
}

export async function createAdminAppCategory(payload: { name: string }) {
  return adminRequest<AppCategoryItem>("/api/admin/app-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminAppCategory(name: string, payload: { name: string }) {
  return adminRequest<AppCategoryItem>(`/api/admin/app-categories/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminAppCategory(name: string) {
  return adminRequest<null>(`/api/admin/app-categories/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}

export async function reorderAdminAppCategories(names: string[]) {
  return adminRequest<AppCategoryItem[]>("/api/admin/app-categories/order", {
    method: "PUT",
    body: JSON.stringify({ names }),
  })
}

export async function fetchAdminPostCategories() {
  return adminRequest<PostCategoryItem[]>("/api/admin/post-categories")
}

export async function createAdminPostCategory(payload: { name: string }) {
  return adminRequest<PostCategoryItem>("/api/admin/post-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminPostCategory(name: string, payload: { name: string }) {
  return adminRequest<PostCategoryItem>(`/api/admin/post-categories/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminPostCategory(name: string) {
  return adminRequest<null>(`/api/admin/post-categories/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}

export async function reorderAdminPostCategories(names: string[]) {
  return adminRequest<PostCategoryItem[]>("/api/admin/post-categories/order", {
    method: "PUT",
    body: JSON.stringify({ names }),
  })
}

export async function createAdminTopic(payload: Record<string, unknown>) {
  return adminRequest<TopicItem>("/api/admin/topics", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminTopic(slug: string, payload: Record<string, unknown>) {
  return adminRequest<TopicItem>(`/api/admin/topics/${slug}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminTopic(slug: string) {
  return adminRequest<null>(`/api/admin/topics/${slug}`, {
    method: "DELETE",
  })
}

export async function fetchAdminInviteCodes(limit = 100) {
  return adminRequest<InviteCodeItem[]>(`/api/admin/invite-codes?limit=${limit}`)
}

export async function createAdminInviteCodeBatch(count: number, note: string) {
  return adminRequest<{ batchId: string; codes: string[] }>("/api/admin/invite-codes/batch", {
    method: "POST",
    body: JSON.stringify({ count, note }),
  })
}

export async function fetchAdminProfile() {
  return adminRequest<ProfilePayload>("/api/auth/profile")
}

export async function updateAdminProfile(payload: Record<string, unknown>) {
  return adminRequest<{ user: User }>("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function uploadAdminImage(file: File, kind: "post-cover" | "app-cover") {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("kind", kind)

  return adminRequest<{ path: string; mimeType: string; size: number }>("/api/assets/images/upload", {
    method: "POST",
    body: formData,
  })
}

export async function importAdminRemoteImage(url: string, kind: "post-cover" | "app-cover") {
  return adminRequest<{ path: string; sourceUrl: string; mimeType: string; size: number }>("/api/assets/images/import", {
    method: "POST",
    body: JSON.stringify({ url, kind }),
  })
}
