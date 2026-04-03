import { API_BASE_URL } from '@/lib/api'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripHtmlTags(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveAssetUrl(value: string | null | undefined) {
  const source = String(value ?? '').trim()
  if (!source) return ''
  if (/^https?:\/\//i.test(source) || source.startsWith('data:image/')) return source
  // /uploads/ is static assets served by front-end (Next.js), not API backend
  if (source.startsWith('/uploads/')) {
    return source
  }
  if (source.startsWith('/')) {
    return `${API_BASE_URL}${source}`
  }
  return source
}

export function looksLikeImageUrl(value: string | null | undefined) {
  const source = String(value ?? '').trim()
  if (!source) return false
  return /^https?:\/\//i.test(source) || source.startsWith('data:image/') || source.startsWith('/')
}
