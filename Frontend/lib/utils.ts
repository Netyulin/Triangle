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
  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source)
      const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
      if (isLocalHost && url.pathname.startsWith('/uploads/')) {
        return `${url.pathname}${url.search}${url.hash}`
      }
    } catch {
      // 保持原样
    }

    return source
  }
  if (source.startsWith('data:image/')) return source
  // /uploads/ 由同域名反向代理到后端静态目录，保持同源访问
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

export function getSafeRedirectTarget(redirect: string | null | undefined, fallback = '/profile') {
  const source = String(redirect ?? '').trim()
  if (!source) return fallback
  if (!source.startsWith('/') || source.startsWith('//')) return fallback

  try {
    const parsed = new URL(source, 'http://localhost')
    if (parsed.origin !== 'http://localhost') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function buildAuthUrl(path: '/login' | '/register', redirect: string | null | undefined) {
  const target = getSafeRedirectTarget(redirect, '')
  if (!target) return path
  if (target.startsWith('/login') || target.startsWith('/register')) return path
  return `${path}?redirect=${encodeURIComponent(target)}`
}
