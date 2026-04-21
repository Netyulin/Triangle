const DEFAULT_ENDPOINT = 'http://data.zz.baidu.com/urls';
const DEFAULT_TIMEOUT_MS = 5000;

function normalizeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function getPushConfig() {
  const enabled = parseBoolean(process.env.BAIDU_PUSH_ENABLED, false);
  const token = normalizeString(process.env.BAIDU_PUSH_TOKEN || '').trim();
  const site = normalizeString(process.env.BAIDU_PUSH_SITE || process.env.PUBLIC_SITE_URL || '').trim();
  const endpoint = normalizeString(process.env.BAIDU_PUSH_ENDPOINT || DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT;
  const timeoutMs = Math.max(Number(process.env.BAIDU_PUSH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS, 1000);
  return { enabled, token, site, endpoint, timeoutMs };
}

function normalizeSite(configSite) {
  const raw = normalizeString(configSite, '').trim();
  if (!raw) return { siteHost: '', siteBase: '' };
  try {
    const url = new URL(raw);
    return { siteHost: url.host, siteBase: `${url.protocol}//${url.host}` };
  } catch {
    const host = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    if (!host) return { siteHost: '', siteBase: '' };
    return { siteHost: host, siteBase: `https://${host}` };
  }
}

function buildPublicUrl(pathname) {
  const config = getPushConfig();
  const { siteBase } = normalizeSite(config.site);
  if (!siteBase) return '';
  try {
    return new URL(pathname, siteBase).toString();
  } catch {
    return '';
  }
}

async function pushUrlToBaidu(url) {
  const config = getPushConfig();
  const { siteHost } = normalizeSite(config.site);
  if (!config.enabled) return { skipped: true, reason: 'disabled' };
  if (!config.token || !siteHost) return { skipped: true, reason: 'missing token or site' };
  if (!url) return { skipped: true, reason: 'empty url' };

  const endpoint = new URL(config.endpoint);
  endpoint.searchParams.set('site', siteHost);
  endpoint.searchParams.set('token', config.token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: `${url}\n`,
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.warn('[baidu push failed]', response.status, data);
      return { skipped: false, ok: false, status: response.status, data };
    }

    return { skipped: false, ok: true, status: response.status, data };
  } catch (error) {
    console.warn('[baidu push error]', error instanceof Error ? error.message : error);
    return { skipped: false, ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export function queueBaiduPush(pathname) {
  const url = buildPublicUrl(pathname);
  if (!url) return;
  setImmediate(() => {
    void pushUrlToBaidu(url);
  });
}

export async function pushBaiduUrlByPath(pathname) {
  const url = buildPublicUrl(pathname);
  if (!url) return { skipped: true, reason: 'invalid public site url' };
  return pushUrlToBaidu(url);
}

export function queueBaiduPushForPost(slug) {
  const cleanSlug = normalizeString(slug).trim();
  if (!cleanSlug) return;
  queueBaiduPush(`/articles/${cleanSlug}`);
}

export function queueBaiduPushForApp(slug) {
  const cleanSlug = normalizeString(slug).trim();
  if (!cleanSlug) return;
  queueBaiduPush(`/software/${cleanSlug}`);
}
