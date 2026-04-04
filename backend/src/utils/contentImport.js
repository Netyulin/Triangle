import dns from 'node:dns/promises';
import net from 'node:net';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import createDOMPurify from 'dompurify';

const MAX_HTML_SIZE = 2_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0']);
const ARTICLE_SELECTORS = [
  'article',
  'main article',
  '[role="main"] article',
  '.article-content',
  '.entry-content',
  '.post-content',
  '.rich_media_content',
  '.markdown-body',
  'main',
  '[role="main"]',
  '.content'
];

// Extract article content from Framer sites (they store data in __FRAMER_SHARED_STATE__)
function extractFromFramerState(html, sourceUrl = '') {
  try {
    // Find the __FRAMER_SHARED_STATE__ script
    const stateMatch = html.match(/window\.__FRAMER_SHARED_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i);
    if (!stateMatch) return null;

    let stateJson = stateMatch[1];
    // Fix any trailing issues
    stateJson = stateJson.replace(/;\s*$/, '');

    const framerState = JSON.parse(stateJson);

    // Try to find page content - different structures possible
    let content = null;
    let pageTitle = '';

    // Check for current page content
    if (framerState.currentPage && framerState.currentPage.document) {
      content = extractFramerContent(framerState.currentPage.document);
      pageTitle = framerState.currentPage.name || '';
    } else if (framerState.pages && framerState.currentPageId) {
      const page = framerState.pages[framerState.currentPageId];
      if (page && page.document) {
        content = extractFramerContent(page.document);
        pageTitle = page.name || '';
      }
    }

    if (content && content.html && content.html.length > 100) {
      return {
        title: pageTitle || '',
        contentHtml: content.html,
        excerpt: content.text.substring(0, 200),
        author: '',
        siteName: 'Framer',
      };
    }
  } catch (error) {
    console.error('[Framer extraction error]', error.message);
  }
  return null;
}

// Recursively extract text content from Framer document tree
function extractFramerContent(node) {
  let html = '';
  let text = '';

  function processNode(n) {
    if (!n) return;

    // Text node
    if (n.text && typeof n.text === 'string' && n.text.trim()) {
      text += n.text + ' ';
      // Check if this is a heading
      if (n.role === 'heading') {
        html += `<h1>${escapeHtml(n.text)}</h1>`;
      } else if (n.role === 'subheading') {
        html += `<h2>${escapeHtml(n.text)}</h2>`;
      } else {
        html += `<p>${escapeHtml(n.text)}</p>`;
      }
    }

    // Image
    if (n.src && n.type === 'image') {
      html += `<p><img src="${n.src}" alt="${escapeHtml(n.alt || '')}"></p>`;
    }

    // Link
    if (n.href && n.children && n.children.length) {
      html += `<a href="${escapeHtml(n.href)}" target="_blank">`;
      n.children.forEach(processNode);
      html += `</a>`;
    }

    // Recurse children
    if (n.children && Array.isArray(n.children)) {
      n.children.forEach(processNode);
    }

    // Check for content in different properties
    if (n.document && n.document.children) {
      n.document.children.forEach(processNode);
    }
  }

  if (Array.isArray(node)) {
    node.forEach(processNode);
  } else if (node.children) {
    node.children.forEach(processNode);
  }

  return { html, text };
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Use Readability to extract article content
function extractWithReadability(html, sourceUrl = '') {
  try {
    const dom = new JSDOM(html, { url: sourceUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.content) {
      const DOMPurify = createDOMPurify(dom.window);
      const cleanContent = DOMPurify.sanitize(article.content);

      return {
        title: article.title || '',
        contentHtml: cleanContent,
        excerpt: article.excerpt || article.siteName || '',
        author: article.byline || '',
        siteName: article.siteName || '',
      };
    }
  } catch (error) {
    console.error('[Readability extraction error]', error.message);
  }
  return null;
}

function isTwitterUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'x.com' || u.hostname === 'twitter.com' || u.hostname === 'fixvx.com' || u.hostname === 'vxtwitter.com';
  } catch {
    return false;
  }
}

function extractTweetId(url) {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function fetchTweetViaOEmbed(tweetId, originalUrl) {
  // Use X's official oEmbed API
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(originalUrl)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(oembedUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Twitter oEmbed returned ${response.status}`);
    }

    const data = await response.json();

    // oEmbed returns HTML with blockquote - wrap it for our editor
    // Remove script tags to prevent page reload in editor
    const cleanHtml = data.html.replace(/<script[\s\S]*?<\/script>/gi, '');
    const contentHtml = `<div class="x-tweet-embed">${cleanHtml}</div>`;

    // Try to extract author from the embedded HTML
    const authorMatch = data.html.match(/<a[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                        data.html.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i);
    const author = authorMatch ? authorMatch[1].trim() : '';

    // Extract tweet text for excerpt
    const textMatch = data.html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
    const tweetText = textMatch ? textMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

    // Try to find image in the HTML
    const imgMatch = data.html.match(/<img[^>]+src="([^"]+)"/i);
    const coverImage = imgMatch ? imgMatch[1] : '';

    return {
      title: data.author_name || 'Tweet',
      excerpt: extractTextExcerpt(tweetText || data.html),
      author: author || data.author_name || '',
      coverImage,
      contentHtml,
      readingTime: '1',
      siteName: 'X (Twitter)',
      publishedAt: '',
      warnings: []
    };
  } catch (error) {
    console.error('[fetchTweetViaOEmbed error]', error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractTextExcerpt(text, maxLength = 200) {
  if (!text) return '';
  // Remove HTML tags and normalize whitespace
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

async function assertSafeUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('无效的网址');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('只支持 HTTP 或 HTTPS 链接');
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('不允许抓取该网址');
  }

  // Check DNS to avoid DNS rebinding
  try {
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const blockedIPs = ['127.0.0.1', '::1', '0.0.0.0'];
    for (const addr of addresses) {
      if (blockedIPs.includes(addr)) {
        throw new Error('不允许抓取该网址');
      }
    }
  } catch (error) {
    if (error.message.includes('不允许抓取')) {
      throw error;
    }
    // DNS check failed, try to connect directly
    const socket = new net.Socket();
    return new Promise((resolve, reject) => {
      socket.setTimeout(3000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(urlString);
      });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('无法连接到该网址'));
      });
      socket.on('error', (err) => {
        socket.destroy();
        reject(new Error('无法连接到该网址'));
      });
      socket.connect(url.port || 80, hostname);
    }).catch((err) => {
      throw new Error('无法连接到该网址: ' + err.message);
    });
  }

  return urlString;
}

function extractFromHtml(html, sourceUrl = '') {
  const $ = load(html);
  const warnings = [];

  // Extract OpenGraph / Twitter metadata
  let title = $('meta[property="og:title"]').attr('content')?.trim() ||
              $('meta[name="twitter:title"]').attr('content')?.trim() ||
              $('title').text()?.trim() || '';

  const description = $('meta[property="og:description"]').attr('content')?.trim() ||
                     $('meta[name="twitter:description"]').attr('content')?.trim() ||
                     $('meta[name="description"]').attr('content')?.trim() || '';

  let coverImage = $('meta[property="og:image"]').attr('content')?.trim() ||
                   $('meta[name="twitter:image"]').attr('content')?.trim() || '';

  const siteName = $('meta[property="og:site_name"]').attr('content')?.trim() ||
                   $('meta[property="application-name"]').attr('content')?.trim() || '';

  const author = $('meta[name="author"]').attr('content')?.trim() ||
                $('meta[property="article:author"]').attr('content')?.trim() || '';

  const publishedAt = $('meta[property="article:published_time"]').attr('content')?.trim() || '';

  // Remove unwanted elements
  $('script, style, noscript, iframe, form, input, button, nav, footer, header, aside').remove();

  // Try to find main article content
  let body = '';
  for (const selector of ARTICLE_SELECTORS) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 100) {
      body = el.html() || '';
      break;
    }
  }

  // Fallback to body
  if (!body) {
    body = $('body').html() || '';
  }

  if (!title) {
    title =
      $('article h1').first().text()?.trim() ||
      $('main h1').first().text()?.trim() ||
      $('h1').first().text()?.trim() ||
      '';
  }

  // Clean up the content
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Check for relative URLs and fix them
  const baseUrl = sourceUrl ? new URL(sourceUrl).origin : '';
  if (baseUrl) {
    body = body.replace(/(href|src)=["'](?!http|mailto|#)([^"']+)["']/g, `$1="${baseUrl}$2"`);
    if (coverImage && !coverImage.startsWith('http')) {
      coverImage = new URL(coverImage, baseUrl).href;
    }
  }

  // Extract text for reading time
  const articleText = $('body').text() || '';

  function buildReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return String(minutes);
  }

  // For article pages (detected by URL path), always try Readability first
  // Guizang.ai uses Framer which renders content client-side
  const urlPath = sourceUrl ? new URL(sourceUrl).pathname : '';
  const isArticlePage = urlPath.includes('/%') || urlPath.includes('/article') || urlPath.includes('/post') || urlPath.includes('/news/');

  // Special handling for Framer sites (built with Framer like guizang.ai)
  // They store all content in __FRAMER_SHARED_STATE__ even when static
  const framerResult = extractFromFramerState(html, sourceUrl);

  if (framerResult && framerResult.contentHtml && framerResult.contentHtml.trim().length > 100) {
    // Successfully extracted from Framer state - use this content
    const framerText = framerResult.contentHtml.replace(/<[^>]+>/g, '').trim();

    // Try to find original source link from the original HTML
    let originalLinkHtml = '';
    const $ = load(html);
    // Look for "阅读原文" link or external links
    const originalLink = $('a').filter((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href') || '';
      return text.includes('阅读原文') || (href && (href.includes('arxiv') || href.includes('github.com') || (href.includes('www.') && !href.includes('guizang'))));
    }).first();

    if (originalLink.length) {
      const linkHref = originalLink.attr('href') || '';
      const linkText = originalLink.text().trim() || '阅读原文';
      if (linkHref) {
        originalLinkHtml = `<p><a href="${linkHref}" target="_blank">${linkText}</a></p>`;
      }
    }

    const finalContentHtml = framerResult.contentHtml + originalLinkHtml;
    // Prefer title from Framer over meta title (which is often site name)
    const finalTitle = (framerResult.title && framerResult.title.length > 5 && framerResult.title.length < 100)
      ? framerResult.title
      : (title !== siteName ? title : framerResult.title);

    const finalExcerpt = description?.trim()
      ? description.slice(0, 200)
      : extractTextExcerpt(framerText);

    // Use meta title if Framer title is empty or just site name
    const resolvedTitle = (finalTitle === 'Home' || finalTitle === '首页' || !finalTitle) ? title : finalTitle;

    return {
      title: resolvedTitle || title,
      excerpt: finalExcerpt,
      author: author,
      coverImage: resolveUrl(coverImage, sourceUrl),
      contentHtml: finalContentHtml,
      readingTime: buildReadingTime(framerText),
      siteName: siteName || framerResult.siteName,
      publishedAt,
      warnings: [...warnings, 'Extracted from Framer site data']
    };
  }

  // Fallback to Readability for other sites
  // Extract with Readability for Framer/SPA sites or when content looks like shell
  const readabilityResult = (isArticlePage || body.length < 500)
    ? extractWithReadability(html, sourceUrl)
    : null;

  // Use Readability result if found better content
  if (readabilityResult && readabilityResult.contentHtml) {
    const readabilityText = readabilityResult.contentHtml.replace(/<[^>]+>/g, '').trim();
    // Use Readability if it found meaningful content
    if (readabilityText.length > 200) {
      // Extract article title and first paragraph for excerpt from content
      const $readability = load(readabilityResult.contentHtml);
      const contentTitle = $readability('h1, h2').first().text()?.trim() || '';
      const firstPara = $readability('p').first().text()?.trim() || '';
      // Prefer title from content over Readability's title (which often is site name)
      const finalTitle = (contentTitle && contentTitle.length > 5 && contentTitle.length < 100)
        ? contentTitle
        : (readabilityResult.title !== siteName ? readabilityResult.title : title);
      // Use meta description as excerpt if available, otherwise use first meaningful paragraph
      const finalExcerpt = description?.trim()
        ? description.slice(0, 200)
        : (firstPara && firstPara.length > 20)
          ? firstPara.slice(0, 200)
          : extractTextExcerpt(readabilityText);

      // Try to find original source link from the original HTML
      let originalLinkHtml = '';
      const $ = load(html);
      // Look for "阅读原文" link or external links
      const originalLink = $('a').filter((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        return text.includes('阅读原文') || (href && href.includes('arxiv') || href.includes('github.com') || href.includes('www.') && !href.includes('guizang'));
      }).first();

      if (originalLink.length) {
        const linkHref = originalLink.attr('href') || '';
        const linkText = originalLink.text().trim() || '阅读原文';
        if (linkHref) {
          originalLinkHtml = `<p><a href="${linkHref}" target="_blank">${linkText}</a></p>`;
        }
      }

      const finalContentHtml = readabilityResult.contentHtml + originalLinkHtml;

      return {
        title: finalTitle || title,
        excerpt: finalExcerpt,
        author: readabilityResult.author || author,
        coverImage: resolveUrl(readabilityResult.coverImage || coverImage, sourceUrl),
        contentHtml: finalContentHtml,
        readingTime: buildReadingTime(readabilityText),
        siteName: readabilityResult.siteName || siteName,
        publishedAt,
        warnings: [...warnings, 'Used Readability for content extraction']
      };
    }
  }

  return {
    title,
    excerpt: extractTextExcerpt(description),
    author,
    coverImage: resolveUrl(coverImage, sourceUrl),
    contentHtml: body,
    readingTime: buildReadingTime(articleText),
    siteName,
    publishedAt,
    warnings
  };
}

function extractFromText(text) {
  const warnings = [];
  const normalized = text.trim();

  // Detect if it looks like HTML
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(normalized);

  let contentHtml = normalized;
  let title = '';
  let body = normalized;

  if (looksLikeHtml) {
    const $ = load(normalized);
    title = $('title').text()?.trim() || '';
    body = $('body').html() || normalized;
  } else {
    // Plain text - convert to paragraphs
    const paragraphs = normalized.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      contentHtml = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
      title = paragraphs[0].substring(0, 100);
      body = contentHtml;
    } else {
      contentHtml = `<p>${normalized}</p>`;
      title = normalized.substring(0, 100);
      body = contentHtml;
    }
  }

  function buildReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return String(minutes);
  }

  return {
    title,
    excerpt: extractTextExcerpt(body || title),
    author: '',
    coverImage: '',
    contentHtml,
    readingTime: buildReadingTime(normalized),
    siteName: '手动粘贴',
    publishedAt: '',
    warnings
  };
}

function resolveUrl(href, base) {
  if (!href) return '';
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

export async function importContentFromSource({ url = '', rawContent = '' }) {
  const normalizedUrl = url.trim();
  const normalizedContent = rawContent.trim();

  if (!normalizedUrl && !normalizedContent) {
    throw new Error('请提供网址或粘贴内容');
  }

  if (normalizedUrl) {
    const safeUrl = await assertSafeUrl(normalizedUrl);

    // Special handling for X (Twitter) status pages
    if (isTwitterUrl(safeUrl)) {
      const tweetId = extractTweetId(safeUrl);
      if (tweetId) {
        try {
          const tweetData = await fetchTweetViaOEmbed(tweetId, safeUrl);
          return {
            sourceType: 'url',
            sourceUrl: safeUrl,
            finalUrl: safeUrl,
            ...tweetData
          };
        } catch (error) {
          console.warn('[X import failed, fallback to normal crawl]', error.message);
          // Fall through to normal crawling if fails
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(safeUrl, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`目标地址返回 ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error('目标地址不是可解析的网页内容');
      }

      const html = await response.text();
      if (!html.trim()) {
        throw new Error('目标页面没有可读取内容');
      }
      if (html.length > MAX_HTML_SIZE) {
        throw new Error('目标页面过大，暂不支持导入');
      }

      const parsed = extractFromHtml(html, response.url || safeUrl);
      return {
        sourceType: 'url',
        sourceUrl: safeUrl,
        finalUrl: response.url || safeUrl,
        ...parsed
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('抓取超时，请稍后重试或改用粘贴内容');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(normalizedContent);
  const parsed = looksLikeHtml ? extractFromHtml(normalizedContent) : extractFromText(normalizedContent);

  return {
    sourceType: 'paste',
    sourceUrl: '',
    finalUrl: '',
    ...parsed
  };
}
