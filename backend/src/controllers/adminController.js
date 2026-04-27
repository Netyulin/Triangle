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
  query('keyword').optional().isString().withMessage('keyword must be a string'),
  query('view').optional().isIn(['recent', 'date', 'region', 'cumulative']).withMessage('view is invalid'),
  query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format')
]);

export { trendsValidation, recentValidation, activeIpsValidation };

let geoIpLiteModulePromise = null;
let zhCountryNames = null;

async function loadGeoIpLite() {
  if (!geoIpLiteModulePromise) {
    geoIpLiteModulePromise = import('geoip-lite').catch(() => null);
  }

  const mod = await geoIpLiteModulePromise;
  if (!mod) return null;
  return mod.default ?? mod;
}

function getChineseCountryName(countryCode) {
  const code = normalizeString(countryCode).trim().toUpperCase();
  if (!code) return '';

  if (!zhCountryNames && typeof Intl?.DisplayNames === 'function') {
    zhCountryNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
  }

  try {
    return zhCountryNames?.of(code) || code;
  } catch {
    return code;
  }
}

const CHINA_REGION_MAP = {
  BJ: '北京',
  TJ: '天津',
  HE: '河北',
  SX: '山西',
  NM: '内蒙古',
  LN: '辽宁',
  JL: '吉林',
  HL: '黑龙江',
  SH: '上海',
  JS: '江苏',
  ZJ: '浙江',
  AH: '安徽',
  FJ: '福建',
  JX: '江西',
  SD: '山东',
  HA: '河南',
  HB: '湖北',
  HN: '湖南',
  GD: '广东',
  GX: '广西',
  HI: '海南',
  CQ: '重庆',
  SC: '四川',
  GZ: '贵州',
  YN: '云南',
  XZ: '西藏',
  SN: '陕西',
  GS: '甘肃',
  QH: '青海',
  NX: '宁夏',
  XJ: '新疆',
  HK: '香港',
  MO: '澳门',
  TW: '台湾',
};

function localizeRegion(countryCode, regionCode) {
  const country = normalizeString(countryCode).trim().toUpperCase();
  const region = normalizeString(regionCode).trim();
  if (!region) return '';

  if (country === 'CN') {
    return CHINA_REGION_MAP[region.toUpperCase()] || region;
  }

  return region;
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

  const country = getChineseCountryName(geoRecord.country);
  const region = localizeRegion(geoRecord.country, geoRecord.region);
  const city = normalizeString(geoRecord.city).trim();
  const parts = [country, region, city].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
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

function parseSelectedDate(rawDate) {
  const source = normalizeString(rawDate).trim();
  if (!source) return null;

  const date = new Date(`${source}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getDateRange(selectedDate) {
  if (!selectedDate) return null;

  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHourKey(date) {
  return `${String(date.getHours()).padStart(2, '0')}:00`;
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
  const view = normalizeString(req.query.view, 'recent').trim().toLowerCase() || 'recent';
  const selectedDateText = normalizeString(req.query.date).trim();
  const selectedDate = parseSelectedDate(selectedDateText);
  const selectedRange = getDateRange(selectedDate);
  const ipKeywordLike = /^[0-9a-fA-F:.]+$/.test(keyword);

  const pageViews = await runOptionalStat(
    () =>
      prisma.pageView.findMany({
        ...(selectedRange
          ? {
              where: {
                createdAt: {
                  gte: selectedRange.start,
                  lt: selectedRange.end
                }
              }
            }
          : {}),
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

  const decoratedIpRows = await Promise.all(
    list.map(async (item) => ({
      ...item,
      region: await resolveIpRegion(item.ip)
    }))
  );

  const filteredIpRows = keyword
    ? decoratedIpRows.filter((item) => {
        if (ipKeywordLike) {
          return item.ip.toLowerCase().includes(keyword);
        }
        return item.region.toLowerCase().includes(keyword);
      })
    : decoratedIpRows;

  const summary = {
    totalViews: pageViews.length,
    uniqueIpCount: filteredIpRows.length,
    selectedDate: selectedDateText || null
  };

  let rows = [];
  if (view === 'region') {
    const regionMap = new Map();
    for (const item of filteredIpRows) {
      const region = item.region || '未知地区';
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          region,
          views: 0,
          uniqueIps: 0,
          lastSeenAt: item.lastSeenAt
        });
      }

      const row = regionMap.get(region);
      row.views += item.views;
      row.uniqueIps += 1;
      if (item.lastSeenAt > row.lastSeenAt) row.lastSeenAt = item.lastSeenAt;
    }

    rows = Array.from(regionMap.values()).sort((a, b) => {
      if (b.views !== a.views) return b.views - a.views;
      return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
    });
  } else if (view === 'date') {
    const bucketMap = new Map();
    for (const item of pageViews) {
      const bucket = selectedDate ? formatHourKey(item.createdAt) : formatDayKey(item.createdAt);
      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, {
          label: bucket,
          views: 0,
          ipSet: new Set(),
          firstSeenAt: item.createdAt,
          lastSeenAt: item.createdAt
        });
      }

      const row = bucketMap.get(bucket);
      const ip = normalizeIp(item.ip);
      row.views += 1;
      row.ipSet.add(ip);
      if (item.createdAt < row.firstSeenAt) row.firstSeenAt = item.createdAt;
      if (item.createdAt > row.lastSeenAt) row.lastSeenAt = item.createdAt;
    }

    rows = Array.from(bucketMap.values())
      .map((item) => ({
        label: item.label,
        views: item.views,
        uniqueIps: item.ipSet.size,
        firstSeenAt: item.firstSeenAt,
        lastSeenAt: item.lastSeenAt
      }))
      .sort((a, b) => (selectedDate ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)));

    if (keyword) {
      rows = rows.filter((item) => item.label.toLowerCase().includes(keyword));
    }
  } else if (view === 'cumulative') {
    rows = [...filteredIpRows].sort((a, b) => {
      if (b.views !== a.views) return b.views - a.views;
      return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
    });
  } else {
    rows = [...filteredIpRows].sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  }

  const total = rows.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return sendSuccess(res, {
    view,
    list: paged,
    total,
    page: safePage,
    pageSize,
    totalPages,
    summary
  });
}
