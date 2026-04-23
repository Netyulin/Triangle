"use client"

export type Platform = "Windows" | "Macos" | "IOS" | "Android" | "Linux"
export type Compatibility = "PC" | "Apple Silicon" | "Intel芯片" | "移动平台"
export type SizeUnit = "Kb" | "Mb" | "Gb"
export type DownloadLink = { name: string; url: string; extractionCode?: string }
export type DisplayMode = "cover" | "icon"
export type AppMediaField = "heroImage" | "icon"
export type EditorMode = "visual" | "html"

export const pricingOptions = ["免费", "破解版", "买断制", "订阅制"] as const
export const platformOptions: Platform[] = ["Windows", "Macos", "IOS", "Android", "Linux"]
export const sizeUnitOptions: SizeUnit[] = ["Kb", "Mb", "Gb"]
export const compatibilityOptions: Compatibility[] = ["PC", "Apple Silicon", "Intel芯片", "移动平台"]

export const defaultDownloadLinks: DownloadLink[] = [
  { name: "百度网盘", url: "", extractionCode: "" },
  { name: "夸克网盘", url: "", extractionCode: "" },
  { name: "迅雷网盘", url: "", extractionCode: "" },
]

export const initialForm = {
  name: "",
  slug: "",
  subtitle: "",
  category: "",
  sizeUnit: "Mb" as SizeUnit,
  version: "",
  size: "",
  pricing: "免费",
  summary: "<p><br></p>",
  highlights: "",
  review: "",
  icon: "",
  verified: true,
  featured: false,
  heroImage: "",
  status: "published",
  accessLevel: "free",
  platforms: ["Windows"] as Platform[],
  compatibility: ["PC"] as Compatibility[],
  gallery: [] as string[],
  downloadLinks: defaultDownloadLinks,
  displayMode: "icon" as DisplayMode,
}

export type AppEditorForm = typeof initialForm

export function buildSlug(title: string) {
  const base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
  return base
}

export function extractImageFromClipboardData(data: DataTransfer | null) {
  if (!data) return null
  for (const item of Array.from(data.items || [])) {
    if (!item.type.startsWith("image/")) continue
    return item.getAsFile()
  }
  return null
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
    return new File([blob], `clipboard-cover.${extension}`, { type: imageType })
  }
  return null
}

export function splitLines(value: string) {
  return String(value || "")
    .split(/[\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function insertTextAtCursor(textarea: HTMLTextAreaElement, value: string) {
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? textarea.value.length
  return `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`
}

export function normalizeDownloadLinks(items: DownloadLink[]) {
  return items
    .map((item, index) => ({
      name: item.name.trim() || `网盘 ${index + 1}`,
      url: item.url.trim(),
      extractionCode: String(item.extractionCode || "").trim(),
    }))
    .filter((item) => item.name || item.url)
}

export function splitSizeValue(value: string): { size: string; sizeUnit: SizeUnit } {
  const trimmed = String(value || "").trim()
  if (!trimmed) {
    return { size: "", sizeUnit: "Mb" }
  }
  const match = trimmed.match(/^(.+?)\s*(Kb|Mb|Gb)$/i)
  if (!match) {
    return { size: trimmed, sizeUnit: "Mb" }
  }
  const size = match[1].trim()
  const rawUnit = match[2].toLowerCase()
  const sizeUnit = rawUnit === "kb" ? "Kb" : rawUnit === "gb" ? "Gb" : "Mb"
  return { size, sizeUnit }
}

export function combineSizeValue(size: string, sizeUnit: SizeUnit) {
  const trimmed = String(size || "").trim()
  if (!trimmed) {
    return ""
  }
  return `${trimmed}${sizeUnit}`
}

export function togglePlatformValue(list: Platform[], value: Platform) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}

export function toggleCompatibility(list: Compatibility[], value: Compatibility) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}
