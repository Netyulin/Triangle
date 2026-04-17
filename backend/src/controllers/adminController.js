import { query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeString } from '../utils/serializers.js';

function isMissingOptionalRelationError(error) {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === 'P2021' ||
    error?.code === 'P2010' ||
    message.includes('does not exist') ||
    message.includes('does not exist in the current database') ||
    message.includes('cannot read properties of undefined') ||
    message.includes('relation') ||
    message.includes('table')
  );
}

async function runOptionalStat(operation, fallbackValue, label) {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingOptionalRelationError(error)) {
      throw error;
    }

    console.warn(`[admin stats] skip optional stat "${label}": ${error.message}`);
    return fallbackValue;
  }
}

const trendsValidation = validate([
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('days must be between 1 and 90')
]);

const recentValidation = validate([
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit must be between 1 and 20')
]);

const activeIpsValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('keyword').optional().isString().withMessage('keyword must be a string')
]);

export { trendsValidation, recentValidation, activeIpsValidation };

let geoIpLiteModulePromise = null;

async function loadGeoIpLite() {
  if (!geoIpLiteModulePromise) {
    geoIpLiteModulePromise = import('geoip-lite').catch(() => null);
  }

  const mod = await geoIpLiteModulePromise;
  if (!mod) return null;
  return mod.default ?? mod;
}

function normalizeIp(rawIp) {
  const source = normalizeString(rawIp).trim();
  if (!source) return 'unknown';
  if (source.startsWith('::ffff:')) {
    return source.slice(7);
  }
  return source;
}

function isPrivateOrLocalIp(ip) {
  if (!ip || ip === 'unknown') return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

function formatRegion(geoRecord) {
  if (!geoRecord) return '未知地区';
  const parts = [geoRecord.country, geoRecord.region, geoRecord.city]
    .map((item) => normalizeString(item).trim())
    .filter(Boolean);
  return parts.length ? parts.join(' / ') : '未知地区';
}

async function resolveIpRegion(ip) {
  if (!ip || ip === 'unknown') return '未知地区';
  if (isPrivateOrLocalIp(ip)) return '内网地址';

  const geoIp = await loadGeoIpLite();
  if (!geoIp) return '未知地区';

  const record = geoIp.lookup(ip);
  return formatRegion(record);
}

export async function stats(req, res) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalApps,
    totalPosts,
    totalTopics,
    totalComments,
    totalRequests,
    pendingRequests,
    processingRequests,
    publishedApps,
    draftApps,
    publishedPosts,
    newAppsThisWeek,
    newPostsThisWeek,
    newRequestsThisWeek,
    totalDownloads,
    todayDownloads,
    todayPageViews,
    pageViewsToday
  ] = await Promise.all([
    prisma.app.count(),
    prisma.post.count(),
    prisma.topic.count(),
    prisma.comment.count(),
    prisma.softwareRequest.count(),
    prisma.softwareRequest.count({ where: { status: 'pending' } }),
    prisma.softwareRequest.count({ where: { status: 'processing' } }),
    prisma.app.count({ where: { status: 'published' } }),
    prisma.app.count({ where: { status: 'draft' } }),
    prisma.post.count({ where: { status: 'published' } }),
    prisma.app.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.post.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.softwareRequest.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.downloadLog.count(),
    prisma.downloadLog.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    runOptionalStat(
      () =>
        prisma.pageView.count({
          where: { createdAt: { gte: today, lt: tomorrow } }
        }),
      0,
      'today page views'
    ),
    runOptionalStat(
      () =>
        prisma.pageView.findMany({
          where: { createdAt: { gte: today, lt: tomorrow } },
          select: { ip: true }
        }),
      [],
      'today page view ips'
    )
  ]);

  const uniqueIPsToday = new Set(pageViewsToday.map((view) => view.ip)).size;

  return sendSuccess(res, {
    totalApps,
    totalPosts,
    totalTopics,
    totalComments,
    totalRequests,
    pendingRequests,
    processingRequests,
    publishedApps,
    draftApps,
    publishedPosts,
    newAppsThisWeek,
    newPostsThisWeek,
    newRequestsThisWeek,
    totalDownloads,
    todayDownloads,
    uniqueIPsToday,
    todayPageViews
  });
}

export async function trends(req, res) {
  const days = normalizeInteger(req.query.days, 30);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const [apps, posts, requests, downloadLogs, pageViews] = await Promise.all([
    prisma.app.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true }
    }),
    prisma.post.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true }
    }),
    prisma.softwareRequest.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true }
    }),
    prisma.downloadLog.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, ip: true }
    }),
    runOptionalStat(
      () =>
        prisma.pageView.findMany({
          where: { createdAt: { gte: start } },
          select: { createdAt: true, ip: true }
        }),
      [],
      'page view trends'
    )
  ]);

  const trendData = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(start);
    dayStart.setDate(start.getDate() + (days - 1 - i));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const countInRange = (items) =>
      items.filter((item) => item.createdAt >= dayStart && item.createdAt < dayEnd).length;

    const dayDownloads = downloadLogs.filter((log) => log.createdAt >= dayStart && log.createdAt < dayEnd);
    const dayPageViews = pageViews.filter((pageView) => pageView.createdAt >= dayStart && pageView.createdAt < dayEnd);
    const uniqueIPs = new Set(dayPageViews.map((pageView) => pageView.ip)).size;

    trendData.push({
      date: dayStart.toISOString().slice(0, 10),
      apps: countInRange(apps),
      posts: countInRange(posts),
      requests: countInRange(requests),
      downloads: dayDownloads.length,
      uniqueIPs,
      pageViews: dayPageViews.length
    });
  }

  return sendSuccess(res, {
    trendData
  });
}

export async function recent(req, res) {
  const limit = normalizeInteger(req.query.limit, 5);

  const [apps, posts, requests, comments] = await Promise.all([
    prisma.app.findMany({
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.post.findMany({
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.softwareRequest.findMany({
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.comment.findMany({
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        contentId: true,
        contentType: true,
        authorName: true,
        createdAt: true
      }
    })
  ]);

  return sendSuccess(res, {
    apps,
    posts,
    requests,
    comments
  });
}

export async function activeIps(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const keyword = normalizeString(req.query.keyword).trim().toLowerCase();
  const ipKeywordLike = /^[0-9a-fA-F:.]+$/.test(keyword);

  const pageViews = await runOptionalStat(
    () =>
      prisma.pageView.findMany({
        select: {
          ip: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
    [],
    'active ips'
  );

  const ipMap = new Map();
  for (const item of pageViews) {
    const ip = normalizeIp(item.ip);
    if (!ipMap.has(ip)) {
      ipMap.set(ip, {
        ip,
        views: 0,
        lastSeenAt: item.createdAt,
        firstSeenAt: item.createdAt
      });
    }

    const row = ipMap.get(ip);
    row.views += 1;
    if (item.createdAt > row.lastSeenAt) row.lastSeenAt = item.createdAt;
    if (item.createdAt < row.firstSeenAt) row.firstSeenAt = item.createdAt;
  }

  let list = Array.from(ipMap.values()).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

  if (keyword) {
    if (ipKeywordLike) {
      list = list.filter((item) => item.ip.toLowerCase().includes(keyword));
    } else {
      const decorated = await Promise.all(
        list.map(async (item) => ({
          ...item,
          region: await resolveIpRegion(item.ip)
        }))
      );
      list = decorated.filter((item) => item.region.toLowerCase().includes(keyword));
    }
  }

  const total = list.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);

  const rows = await Promise.all(
    paged.map(async (item) => ({
      ip: item.ip,
      region: await resolveIpRegion(item.ip),
      views: item.views,
      firstSeenAt: item.firstSeenAt,
      lastSeenAt: item.lastSeenAt
    }))
  );

  return sendSuccess(res, {
    list: rows,
    total,
    page: safePage,
    pageSize,
    totalPages
  });
}
