"use client"

export const DEFAULT_AUTHOR = "Triangle 编辑部"

export type EditorMode = "visual" | "html"
export type DisplayMode = "cover" | "icon"
export type PostStatus = "published" | "hidden" | "archived"

export const POST_STATUS_VALUES: PostStatus[] = ["published", "hidden", "archived"]

export function normalizePostStatus(value: string | null | undefined): PostStatus {
  const candidate = String(value || "").trim() as PostStatus
  return POST_STATUS_VALUES.includes(candidate) ? candidate : "published"
}

export const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  author: DEFAULT_AUTHOR,
  readingTime: "",
  relatedAppSlug: "",
  content: "",
  featured: false,
  coverImage: "",
  icon: "",
  displayMode: "icon" as DisplayMode,
  status: "published" as PostStatus,
}

export type PostEditorForm = typeof initialForm

export function buildSlug(title: string, sourceUrl: string) {
  const base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

  if (base) return base

  try {
    const url = new URL(sourceUrl)
    return `${url.hostname.replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`.slice(0, 64)
  } catch {
    return `post-${Date.now()}`
  }
}

export function extractImageFiles(data: DataTransfer | null) {
  if (!data) return []

  const files: File[] = []
  for (const item of Array.from(data.items || [])) {
    if (!item.type.startsWith("image/")) continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

export function getInitial(text: string) {
  return text.trim().slice(0, 2).toUpperCase() || "TR"
}

export async function readClipboardImageFile() {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
    return null
  }

  const items = await navigator.clipboard.read()
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"))
    if (!imageType) continue

    const blob = await item.getType(imageType)
    const extension = imageType.split("/")[1] || "png"
    return new File([blob], `clipboard.${extension}`, { type: imageType })
  }

  return null
}

export function insertTextAtCursor(textarea: HTMLTextAreaElement, value: string) {
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? textarea.value.length
  return `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`
}
