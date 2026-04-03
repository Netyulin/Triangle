import { buildDefaultAvatar, normalizeGender } from './userFeatures.js';

function parseMaybeJson(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function ensureArray(value) {
  const parsed = parseMaybeJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function ensureObject(value) {
  const parsed = parseMaybeJson(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

export function stripHtmlTags(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDownloadLinkEntry(entry, index) {
  if (typeof entry === 'string') {
    const url = normalizeString(entry).trim();
    if (!url) {
      return null;
    }
    return {
      name: index === 0 ? '百度网盘' : `网盘 ${index + 1}`,
      url
    };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const name = normalizeString(entry.name || entry.title || '').trim() || (index === 0 ? '百度网盘' : `网盘 ${index + 1}`);
  const url = normalizeString(entry.url || entry.href || '').trim();
  if (!url) {
    return null;
  }

  return {
    name,
    url
  };
}

export function normalizeDownloadLinks(value, fallbackUrl = '') {
  const parsed = parseMaybeJson(value, []);
  const entries = Array.isArray(parsed) ? parsed : [];
  const links = entries.map(normalizeDownloadLinkEntry).filter(Boolean);

  if (links.length > 0) {
    return links;
  }

  const nextFallback = normalizeString(fallbackUrl).trim();
  if (nextFallback) {
    return [{ name: '百度网盘', url: nextFallback }];
  }

  return [];
}

export function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email ?? null,
    name: user.name ?? null,
    avatar: user.avatar ?? buildDefaultAvatar(user.name || user.username, user.gender),
    gender: normalizeGender(user.gender),
    phone: user.phone ?? null,
    role: user.role,
    status: user.status ?? 'active',
    membershipLevel: user.membershipLevel ?? 'free',
    membershipExpireAt: user.membershipExpireAt ?? null,
    downloadQuotaDaily: user.downloadQuotaDaily ?? 0,
    downloadCountDaily: user.downloadCountDaily ?? 0,
    canComment: user.canComment ?? true,
    canSubmitRequest: user.canSubmitRequest ?? true,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function getUserAccessScope(user) {
  if (!user) {
    return {
      allowedLevels: ['free'],
      isAdmin: false
    };
  }

  if (user.role === 'admin') {
    return {
      allowedLevels: ['free', 'member', 'premium'],
      isAdmin: true
    };
  }

  const membershipLevel = user.membershipLevel ?? 'free';
  if (membershipLevel === 'premium') {
    return {
      allowedLevels: ['free', 'member', 'premium'],
      isAdmin: false
    };
  }

  if (membershipLevel === 'plus' || membershipLevel === 'member') {
    return {
      allowedLevels: ['free', 'member'],
      isAdmin: false
    };
  }

  return {
    allowedLevels: ['free'],
    isAdmin: false
  };
}

export function serializeUserPermissions(user) {
  const scope = getUserAccessScope(user);
  const quota = user?.downloadQuotaDaily ?? 0;
  const used = user?.downloadCountDaily ?? 0;

  return {
    role: user?.role ?? 'guest',
    status: user?.status ?? 'guest',
    membershipLevel: user?.membershipLevel ?? 'free',
    canComment: user?.canComment ?? true,
    canSubmitRequest: user?.canSubmitRequest ?? true,
    allowedDownloadLevels: scope.allowedLevels,
    downloadQuotaDaily: quota,
    downloadCountDaily: used,
    remainingDownloads: Math.max(quota - used, 0)
  };
}

export function serializeApp(app) {
  if (!app) {
    return null;
  }

  const downloadLinks = normalizeDownloadLinks(app.downloadLinks, app.downloadUrl);
  const primaryDownloadUrl = downloadLinks[0]?.url ?? app.downloadUrl ?? null;

  return {
    ...app,
    compatibility: ensureArray(app.compatibility),
    platforms: ensureArray(app.platforms),
    gallery: ensureArray(app.gallery),
    tags: ensureArray(app.tags),
    highlights: ensureArray(app.highlights),
    requirements: ensureArray(app.requirements),
    downloadLinks,
    accessLevel: app.accessLevel ?? 'free',
    isDownloadable: app.isDownloadable ?? true,
    summaryText: stripHtmlTags(app.summary),
    downloadUrl: primaryDownloadUrl,
    author: serializeUser(app.author),
    topics: Array.isArray(app.topics) ? app.topics.map((item) => item.topic ?? item) : [],
    posts: Array.isArray(app.posts) ? app.posts.map((item) => item.post ?? item) : []
  };
}

export function serializePost(post) {
  if (!post) {
    return null;
  }

  return {
    ...post,
    author: post.adminAuthor?.name ?? post.author ?? '\u585e\u5c14\u8fbe',
    relatedApp: post.relatedApp
      ? {
          slug: post.relatedApp.slug,
          name: post.relatedApp.name,
          icon: post.relatedApp.icon ?? null,
          subtitle: post.relatedApp.subtitle ?? null
        }
      : null,
    adminAuthor: serializeUser(post.adminAuthor),
    topics: Array.isArray(post.topics) ? post.topics.map((item) => item.topic ?? item) : []
  };
}

export function serializeTopic(topic) {
  if (!topic) {
    return null;
  }

  return {
    ...topic,
    relatedApps: Array.isArray(topic.relatedApps) ? topic.relatedApps.map((item) => serializeApp(item.app ?? item)) : [],
    relatedPosts: Array.isArray(topic.relatedPosts)
      ? topic.relatedPosts.map((item) => serializePost(item.post ?? item))
      : []
  };
}

export function serializeComment(comment) {
  if (!comment) {
    return null;
  }

  return {
    ...comment,
    replies: Array.isArray(comment.replies) ? comment.replies.map(serializeComment) : []
  };
}

export function serializeRequest(request) {
  if (!request) {
    return null;
  }

  return {
    ...request,
    repliedAt: request.repliedAt ?? null
  };
}

export function serializeNetdiskReport(report) {
  if (!report) {
    return null;
  }

  return {
    id: report.id,
    appSlug: report.appSlug,
    app: report.app
      ? {
          slug: report.app.slug,
          name: report.app.name,
          category: report.app.category,
          icon: report.app.icon ?? null
        }
      : null,
    netdiskName: report.netdiskName,
    downloadUrl: report.downloadUrl ?? null,
    reason: report.reason,
    contact: report.contact ?? null,
    status: report.status ?? 'pending',
    adminNote: report.adminNote ?? null,
    createdAt: report.createdAt,
    handledAt: report.handledAt ?? null
  };
}

export function normalizeJsonInput(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (value === null || value === '') {
    return fallback;
  }
  if (Array.isArray(value) || typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return Boolean(value);
}

export function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
}

export function groupBy(array, iteratee) {
  return array.reduce((acc, item) => {
    const key = iteratee(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

export function countBy(array, iteratee) {
  return array.reduce((acc, item) => {
    const key = iteratee(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export { parseMaybeJson, ensureArray, ensureObject };
