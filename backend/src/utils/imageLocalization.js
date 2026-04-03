import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { load } from 'cheerio';
import { saveBufferToUploads } from './assetStorage.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

function isPrivateIp(ip) {
  if (!net.isIP(ip)) return true;

  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;

  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

async function assertSafeRemoteUrl(rawUrl) {
  let parsed;
  try {
    const normalizedRawUrl = String(rawUrl || '').trim().startsWith('//') ? `https:${String(rawUrl || '').trim()}` : rawUrl;
    parsed = new URL(normalizedRawUrl);
  } catch {
    throw new Error('图片地址无效');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只支持转存 http 或 https 图片');
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('不允许抓取这个图片地址');
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('不允许抓取内网图片地址');
  }

  const records = await dns.lookup(hostname, { all: true }).catch(() => []);
  if (!records.length) {
    throw new Error('图片地址无法解析');
  }

  if (records.some((record) => isPrivateIp(record.address))) {
    throw new Error('不允许抓取内网图片地址');
  }

  return parsed.toString();
}

function extensionFromMime(mimeType) {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/svg+xml':
      return '.svg';
    default:
      return path.extname(mimeType) || '.bin';
  }
}

function folderFromKind(kind) {
  return kind === 'app-cover' ? 'app-covers' : 'post-covers';
}

function shouldSkipUrl(value) {
  const url = String(value || '').trim();
  return !url || url.startsWith('/uploads/') || url.startsWith('data:');
}

export async function localizeRemoteImage(url, kind = 'post-cover') {
  if (shouldSkipUrl(url)) {
    return String(url || '').trim();
  }

  // Add timeout to avoid hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const safeUrl = await assertSafeRemoteUrl(url);
    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': 'TrianglePortalImageLocalizer/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`图片抓取失败，目标返回 ${response.status}`);
    }

    const mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error('目标地址不是受支持的图片格式');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      throw new Error('目标图片内容为空');
    }
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error('目标图片过大，请换一张 8MB 以内的图片');
    }

    const stored = await saveBufferToUploads(buffer, {
      folder: folderFromKind(kind),
      extension: extensionFromMime(mimeType)
    });

    return stored.relativePath;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function localizeHtmlImages(html, kind = 'post-cover') {
  const content = String(html || '').trim();
  if (!content || !/<img[\s\S]*?>/i.test(content)) {
    return content;
  }

  // Quick check: if all images are already localized (start with /uploads/), skip processing
  // This saves a lot of time when no external images need to be downloaded
  const imgSrcRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let hasExternalImages = false;
  let match;
  while ((match = imgSrcRegex.exec(content)) !== null) {
    const src = (match[1] || '').trim();
    if (!shouldSkipUrl(src)) {
      hasExternalImages = true;
      break;
    }
  }
  // Also check data-src for lazy loaded images
  if (!hasExternalImages) {
    const dataSrcRegex = /<img[^>]+data-src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    while ((match = dataSrcRegex.exec(content)) !== null) {
      const src = (match[1] || '').trim();
      if (!shouldSkipUrl(src)) {
        hasExternalImages = true;
        break;
      }
    }
  }
  if (!hasExternalImages) {
    // No external images need to be localized - return original content immediately
    return content;
  }

  const $ = load(content);
  const images = $('img').toArray();

  for (const image of images) {
    const rawSrc = $(image).attr('src')?.trim() || '';
    const dataSrc = $(image).attr('data-src')?.trim() || '';
    const rawLower = rawSrc.toLowerCase();
    const dataLower = dataSrc.toLowerCase();

    const rawLooksPlaceholder =
      !rawSrc ||
      rawLower.includes('placeholder') ||
      rawLower.includes('loading') ||
      rawLower.includes('lazy') ||
      rawLower.includes('/theme/') ||
      rawLower.endsWith('.svg');

    const dataLooksRealAsset =
      Boolean(dataSrc) &&
      (dataLower.includes('/wp-content/uploads/') ||
        dataLower.includes('/uploads/') ||
        dataLower.endsWith('.jpg') ||
        dataLower.endsWith('.jpeg') ||
        dataLower.endsWith('.png') ||
        dataLower.endsWith('.webp') ||
        dataLower.endsWith('.gif'));

    const src = dataSrc && dataSrc !== rawSrc && (rawLooksPlaceholder || dataLooksRealAsset) ? dataSrc : rawSrc || dataSrc;
    if (shouldSkipUrl(src)) {
      continue;
    }

    try {
      const localizedPath = await localizeRemoteImage(src, kind);
      $(image).attr('src', localizedPath);
      if (dataSrc) {
        $(image).attr('data-src', localizedPath);
      }
    } catch (error) {
      console.warn('[localize html image skipped]', src, error instanceof Error ? error.message : error);
    }
  }

  return $.root().html() || content;
}
