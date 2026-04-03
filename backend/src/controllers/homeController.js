import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeInteger, serializeApp, serializePost, stripHtmlTags } from '../utils/serializers.js';
import { readSiteSettings } from '../utils/siteSettings.js';

function parseDownloads(value) {
  if (typeof value === 'number') {
    return value;
  }

  const raw = String(value ?? '').trim().toUpperCase();
  const matched = raw.match(/^([\d.]+)\s*([KM]?)$/);
  if (!matched) {
    return 0;
  }

  const amount = Number.parseFloat(matched[1]);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  if (matched[2] === 'M') return Math.round(amount * 1_000_000);
  if (matched[2] === 'K') return Math.round(amount * 1_000);
  return Math.round(amount);
}

function buildHeroSlideFromApp(app, index) {
  return {
    id: `app-${app.slug}`,
    type: 'app',
    tag: app.category,
    subtitle: `${app.pricing} / ${app.version}`,
    title: app.name,
    desc: stripHtmlTags(app.summary),
    color: index % 2 === 0 ? 'from-[#1a1a2e] to-[#16213e]' : 'from-[#0f2027] to-[#203a43]',
    coverBg: index % 2 === 0 ? 'bg-[#1d4ed8]' : 'bg-slate-800',
    coverText: String(app.name || 'A').slice(0, 2).toUpperCase(),
    coverColor: 'text-white',
    href: `/software/${app.slug}`,
    downloadHref: `/software/${app.slug}`
  };
}

function buildHeroSlideFromPost(post, index) {
  return {
    id: `post-${post.slug}`,
    type: 'post',
    tag: post.category,
    subtitle: `${post.author} / ${post.readingTime}`,
    title: post.title,
    desc: post.excerpt,
    color: index % 2 === 0 ? 'from-[#16213e] to-[#1a1a2e]' : 'from-[#203a43] to-[#0f2027]',
    coverBg: index % 2 === 0 ? 'bg-[#c0392b]' : 'bg-orange-500',
    coverText: String(post.title || 'P').slice(0, 2).toUpperCase(),
    coverColor: 'text-white',
    href: `/articles/${post.slug}`,
    downloadHref: post.relatedAppSlug ? `/software/${post.relatedAppSlug}` : null
  };
}

export async function summary(req, res) {
  const heroLimit = normalizeInteger(req.query.heroLimit, 4);
  const rankingLimit = normalizeInteger(req.query.rankingLimit, 6);
  const settings = await readSiteSettings();

  const [featuredApps, featuredPosts, recentPosts, rankedApps, hotSearches, appCount, postCount, requestCount, solvedCount] =
    await Promise.all([
      prisma.app.findMany({
        where: { featured: true, status: 'published' },
        take: heroLimit,
        orderBy: [{ editorialScore: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.post.findMany({
        where: { featured: true, status: 'published' },
        take: Math.max(settings.homeFeaturedPostCount, heroLimit),
        orderBy: [{ createdAt: 'desc' }]
      }),
      prisma.post.findMany({
        where: { status: 'published' },
        take: Math.max(settings.homeFeaturedPostCount, rankingLimit),
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.app.findMany({
        where: { status: 'published' },
        take: rankingLimit,
        orderBy: [{ editorialScore: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.hotSearch.findMany({
        orderBy: [{ count: 'desc' }, { keyword: 'asc' }],
        take: 10
      }),
      prisma.app.count({ where: { status: 'published' } }),
      prisma.post.count({ where: { status: 'published' } }),
      prisma.softwareRequest.count(),
      prisma.softwareRequest.count({ where: { status: 'done' } })
    ]);

  const heroSlides = [
    ...featuredApps.slice(0, Math.ceil(heroLimit / 2)).map(buildHeroSlideFromApp),
    ...featuredPosts.slice(0, Math.floor(heroLimit / 2)).map(buildHeroSlideFromPost)
  ].slice(0, heroLimit);

  const softwareRankings = [...rankedApps]
    .sort((left, right) => parseDownloads(right.downloads) - parseDownloads(left.downloads))
    .map((app, index) => ({
      rank: index + 1,
      ...serializeApp(app)
    }));

  return sendSuccess(res, {
    site: {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      defaultLocale: settings.defaultLocale,
      supportedLocales: settings.supportedLocales,
      languageOptions: settings.languageOptions
    },
    stats: {
      publishedApps: appCount,
      publishedPosts: postCount,
      publicRequests: requestCount,
      solvedRequests: solvedCount
    },
    heroSlides,
    featuredPosts: featuredPosts.slice(0, settings.homeFeaturedPostCount).map(serializePost),
    softwareRankings,
    editorPicks: featuredPosts.slice(0, 3).map(serializePost),
    readingRanks: recentPosts.slice(0, rankingLimit).map((post, index) => ({
      rank: index + 1,
      ...serializePost(post)
    })),
    hotSearches
  });
}
