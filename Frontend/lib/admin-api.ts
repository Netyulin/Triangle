import { API_BASE_URL, clearToken, formatDateLabel, getToken, type AppSummary, type InboxItem, type NetdiskReportListPayload, type PostSummary, type ProfilePayload, type RequestItem, type SiteSettings, type User } from "@/lib/api"

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
  status: "hidden" | "published" | "archived"
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
  hiddenApps: number
  publishedPosts: number
  hiddenPosts: number
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

export type AdminUserItem = User & {
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string | null
  banUntil?: string | null
  canReply?: boolean
  canSign?: boolean
  canSelfSign?: boolean
}

export type AdminUserDevice = {
  id: number
  udid: string
  product: string | null
  version: string | null
  deviceName: string | null
  source: string
  createdAt: string
  updatedAt: string
}

export type AdminInboxTemplate = {
  id: number | string
  title: string
  content: string
  kind: "notification" | "message"
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export type AdminAdSlot = {
  id: string
  name: string
  type: "banner" | "insertion" | "native" | "splash"
  position: "top" | "bottom" | "sidebar" | "infeed"
  width: number
  height: number
  isActive: boolean
  theme: "light" | "dark" | "auto"
  createdAt: string
  updatedAt: string
  _count?: { adContents: number }
}

export type AdminAdContent = {
  id: string
  slotId: string
  title: string
  description?: string | null
  imageUrl: string
  targetUrl: string
  ctaText: string
  advertiser: string
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
  slot?: {
    id: string
    name: string
    type: string
    position: string
    isActive: boolean
  }
}

export type AdminAdSlotListPayload = {
  list: AdminAdSlot[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AdminAdContentListPayload = {
  list: AdminAdContent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AdminAdsStatsPayload = {
  summary: {
    totalSlots: number
    activeSlots: number
    totalContents: number
    activeContents: number
    totalDownloadLogs: number
    totalCpsClicks: number
  }
  slots: Array<{
    id: string
    name: string
    type: string
    position: string
    isActive: boolean
    _count: { adContents: number }
  }>
  trend: Array<{
    date: string
    count: number
  }>
}

export type AdminSignCertificate = {
  id: number
  name: string
  fileName: string
  filePath: string
  subjectCn: string | null
  teamId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AdminSignProfile = {
  id: number
  name: string
  fileName: string
  filePath: string
  note: string | null
  appId: string | null
  teamId: string | null
  profileUuid: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AdminSignConfigSummary = {
  activeCertificate: AdminSignCertificate | null
  activeProfile: AdminSignProfile | null
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
    headers.set("X-Token", token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ?? null,
    cache: "no-store",
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !payload.success) {
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
  return adminRequest<AdminRequestListPayload>(`/api/admin/requests?${query.toString()}`)
}

export async function updateAdminRequest(id: number | string, payload: { status?: string; adminReply?: string }) {
  return adminRequest<RequestItem>(`/api/admin/requests/${id}`, {
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

export async function fetchAdminUsers() {
  return adminRequest<{ list: AdminUserItem[] }>("/api/admin/users")
}

export async function updateAdminUser(userId: number, payload: Record<string, unknown>) {
  return adminRequest<AdminUserItem>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminUserPassword(userId: number, password: string) {
  return adminRequest<AdminUserItem>(`/api/admin/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  })
}

export async function deleteAdminUser(userId: number) {
  return adminRequest<null>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  })
}

export async function fetchAdminUserDevices(userId: number) {
  return adminRequest<AdminUserDevice[]>(`/api/sign/admin/users/${userId}/devices`)
}

export async function saveAdminUserDevice(
  userId: number,
  payload: {
    deviceId?: number
    udid: string
    product?: string
    version?: string
    deviceName?: string
  },
) {
  return adminRequest<AdminUserDevice>(`/api/sign/admin/users/${userId}/devices`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminUserDevice(userId: number, deviceId: number) {
  return adminRequest<AdminUserDevice>(`/api/sign/admin/users/${userId}/devices/${deviceId}`, {
    method: "DELETE",
  })
}

export async function fetchAdminInboxTemplates() {
  return adminRequest<AdminInboxTemplate[]>("/api/admin/notification-templates")
}

export async function saveAdminInboxTemplate(templateId: number | string | null, payload: Record<string, unknown>) {
  if (!templateId) {
    throw new Error("缺少模板标识")
  }
  return adminRequest<AdminInboxTemplate>(`/api/admin/notification-templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function sendAdminInboxMessage(payload: Record<string, unknown>) {
  return adminRequest<{ count: number }>("/api/admin/notifications/send", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function fetchAdminAdSlots(params?: {
  page?: number
  pageSize?: number
  type?: string
  position?: string
  isActive?: boolean
}) {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  if (params?.type) query.set("type", params.type)
  if (params?.position) query.set("position", params.position)
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive))
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return adminRequest<AdminAdSlotListPayload>(`/api/ads/admin/slots${suffix}`)
}

export async function createAdminAdSlot(payload: {
  name: string
  type: string
  position: string
  width: number
  height: number
  theme?: string
  isActive?: boolean
}) {
  return adminRequest<AdminAdSlot>("/api/ads", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminAdSlot(id: string, payload: Record<string, unknown>) {
  return adminRequest<AdminAdSlot>(`/api/ads/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminAdSlot(id: string) {
  return adminRequest<null>(`/api/ads/${id}`, {
    method: "DELETE",
  })
}

export async function fetchAdminAdContents(params?: {
  page?: number
  pageSize?: number
  slotId?: string
  isActive?: boolean
  search?: string
}) {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  if (params?.slotId) query.set("slotId", params.slotId)
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive))
  if (params?.search) query.set("search", params.search)
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return adminRequest<AdminAdContentListPayload>(`/api/ads/admin/contents${suffix}`)
}

export async function fetchAdminAdContentDetail(id: string) {
  return adminRequest<AdminAdContent>(`/api/ads/admin/contents/${id}`)
}

export async function createAdminAdContent(payload: {
  slotId: string
  title: string
  description?: string
  imageUrl: string
  targetUrl: string
  ctaText?: string
  advertiser: string
  isActive?: boolean
  priority?: number
}) {
  return adminRequest<AdminAdContent>("/api/ads/admin/contents", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminAdContent(id: string, payload: Record<string, unknown>) {
  return adminRequest<AdminAdContent>(`/api/ads/admin/contents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminAdContent(id: string) {
  return adminRequest<null>(`/api/ads/admin/contents/${id}`, {
    method: "DELETE",
  })
}

export async function fetchAdminAdsStats() {
  return adminRequest<AdminAdsStatsPayload>("/api/ads/admin/stats")
}

export async function fetchAdminSignConfig() {
  return adminRequest<AdminSignConfigSummary>("/api/sign/admin/config")
}

export async function fetchAdminSignCertificates() {
  return adminRequest<AdminSignCertificate[]>("/api/sign/admin/certificates")
}

export async function uploadAdminSignCertificate(formData: FormData) {
  return adminRequest<AdminSignCertificate>("/api/sign/admin/certificates", {
    method: "POST",
    body: formData,
  })
}

export async function activateAdminSignCertificate(id: number) {
  return adminRequest<{ id: number }>(`/api/sign/admin/certificates/${id}/activate`, {
    method: "PATCH",
    body: JSON.stringify({}),
  })
}

export async function updateAdminSignCertificatePassword(id: number, password: string) {
  return adminRequest<{ id: number }>(`/api/sign/admin/certificates/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  })
}

export async function deleteAdminSignCertificate(id: number) {
  return adminRequest<null>(`/api/sign/admin/certificates/${id}`, {
    method: "DELETE",
  })
}

export async function fetchAdminSignProfiles() {
  return adminRequest<AdminSignProfile[]>("/api/sign/admin/profiles")
}

export async function uploadAdminSignProfile(formData: FormData) {
  return adminRequest<AdminSignProfile>("/api/sign/admin/profiles", {
    method: "POST",
    body: formData,
  })
}

export async function activateAdminSignProfile(id: number) {
  return adminRequest<{ id: number }>(`/api/sign/admin/profiles/${id}/activate`, {
    method: "PATCH",
    body: JSON.stringify({}),
  })
}

export async function updateAdminSignProfile(id: number, payload: { name: string; note: string }) {
  return adminRequest<{ id: number }>(`/api/sign/admin/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminSignProfile(id: number) {
  return adminRequest<null>(`/api/sign/admin/profiles/${id}`, {
    method: "DELETE",
  })
}

export async function fetchUserInbox() {
  const data = await adminRequest<{ list: Array<Record<string, unknown>>; unreadCount: number }>("/api/notifications")
  return {
    unreadCount: data.unreadCount,
    list: (data.list ?? []).map((item): InboxItem => {
      const kind: InboxItem["kind"] = String(item.type ?? "notification") === "message" ? "message" : "notification"
      return {
        id: Number(item.id ?? 0),
        title: String(item.title ?? ""),
        content: String(item.content ?? ""),
        kind,
        read: Boolean(item.isRead),
        createdAt: String(item.createdAt ?? ""),
        senderName: null,
        actionUrl: item.link ? String(item.link) : null,
        summary: null,
      }
    }),
  }
}

export async function markUserInboxRead(messageId: string | number) {
  return adminRequest<null>(`/api/notifications/${messageId}/read`, {
    method: "PATCH",
  })
}

export async function deleteUserInbox(messageId: string | number) {
  return adminRequest<null>(`/api/notifications/${messageId}`, {
    method: "DELETE",
  })
}
