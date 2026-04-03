import { query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeString, serializeRequest } from '../utils/serializers.js';
import { getRequestVoteSummary } from '../utils/userFeatures.js';

const searchValidation = validate([
  query('q').trim().notEmpty().withMessage('q is required'),
  query('type')
    .optional()
    .isIn(['all', 'app', 'post', 'request'])
    .withMessage('type must be all, app, post or request'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).withMessage('pageSize must be between 1 and 50')
]);

function searchAppWhere(keyword) {
  return {
    status: 'published',
    OR: [
      { name: { contains: keyword } },
      { subtitle: { contains: keyword } },
      { summary: { contains: keyword } },
      { category: { contains: keyword } }
    ]
  };
}

function searchPostWhere(keyword) {
  return {
    status: 'published',
    OR: [
      { title: { contains: keyword } },
      { excerpt: { contains: keyword } },
      { content: { contains: keyword } },
      { category: { contains: keyword } },
      { author: { contains: keyword } }
    ]
  };
}

function searchRequestWhere(keyword) {
  return {
    OR: [{ title: { contains: keyword } }, { description: { contains: keyword } }, { authorName: { contains: keyword } }]
  };
}

async function attachVoteSummary(items, userId) {
  if (!items.length) {
    return [];
  }

  const summary = await getRequestVoteSummary(
    items.map((item) => item.id),
    userId
  );

  return items.map((item) => {
    const vote = summary.get(item.id) || { voteCount: 0, userVoted: false };
    return serializeRequest({
      ...item,
      voteCount: vote.voteCount,
      userVoted: vote.userVoted
    });
  });
}

export { searchValidation };

export async function search(req, res) {
  const keyword = normalizeString(req.query.q).trim();
  const type = normalizeString(req.query.type, 'all');
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 10);

  await prisma.hotSearch.upsert({
    where: { keyword },
    update: {
      count: {
        increment: 1
      },
      type
    },
    create: {
      keyword,
      type,
      count: 1
    }
  });

  if (type === 'app') {
    const [apps, total] = await Promise.all([
      prisma.app.findMany({
        where: searchAppWhere(keyword),
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ featured: 'desc' }, { editorialScore: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          subtitle: true,
          icon: true,
          category: true,
          pricing: true,
          rating: true,
          featured: true,
          heroImage: true
        }
      }),
      prisma.app.count({
        where: searchAppWhere(keyword)
      })
    ]);

    return sendSuccess(res, {
      keyword,
      type,
      apps,
      posts: [],
      requests: [],
      totalApps: total,
      totalPosts: 0,
      totalRequests: 0,
      total
    });
  }

  if (type === 'post') {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: searchPostWhere(keyword),
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          category: true,
          author: true,
          readingTime: true,
          dateLabel: true,
          featured: true
        }
      }),
      prisma.post.count({
        where: searchPostWhere(keyword)
      })
    ]);

    return sendSuccess(res, {
      keyword,
      type,
      apps: [],
      posts,
      requests: [],
      totalApps: 0,
      totalPosts: total,
      totalRequests: 0,
      total
    });
  }

  if (type === 'request') {
    const [items, total] = await Promise.all([
      prisma.softwareRequest.findMany({
        where: searchRequestWhere(keyword),
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          authorName: true,
          status: true,
          createdAt: true,
          adminReply: true,
          repliedAt: true
        }
      }),
      prisma.softwareRequest.count({
        where: searchRequestWhere(keyword)
      })
    ]);

    return sendSuccess(res, {
      keyword,
      type,
      apps: [],
      posts: [],
      requests: await attachVoteSummary(items, req.user?.id),
      totalApps: 0,
      totalPosts: 0,
      totalRequests: total,
      total
    });
  }

  const appLimit = Math.max(1, Math.ceil(pageSize / 3));
  const postLimit = Math.max(1, Math.floor(pageSize / 3));
  const requestLimit = Math.max(1, pageSize - appLimit - postLimit);

  const [apps, totalApps, posts, totalPosts, requestItems, totalRequests] = await Promise.all([
    prisma.app.findMany({
      where: searchAppWhere(keyword),
      take: appLimit,
      orderBy: [{ featured: 'desc' }, { editorialScore: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        icon: true,
        category: true,
        pricing: true,
        rating: true,
        featured: true,
        heroImage: true
      }
    }),
    prisma.app.count({
      where: searchAppWhere(keyword)
    }),
    prisma.post.findMany({
      where: searchPostWhere(keyword),
      take: postLimit,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        category: true,
        author: true,
        readingTime: true,
        dateLabel: true,
        featured: true
      }
    }),
    prisma.post.count({
      where: searchPostWhere(keyword)
    }),
    prisma.softwareRequest.findMany({
      where: searchRequestWhere(keyword),
      take: requestLimit,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        authorName: true,
        status: true,
        createdAt: true,
        adminReply: true,
        repliedAt: true
      }
    }),
    prisma.softwareRequest.count({
      where: searchRequestWhere(keyword)
    })
  ]);

  return sendSuccess(res, {
    keyword,
    type,
    apps,
    posts,
    requests: await attachVoteSummary(requestItems, req.user?.id),
    totalApps,
    totalPosts,
    totalRequests,
    total: totalApps + totalPosts + totalRequests
  });
}

export async function hotSearches(req, res) {
  const limit = normalizeInteger(req.query.limit, 10);
  const type = req.query.type ? normalizeString(req.query.type) : null;

  const where = type ? { type } : {};
  const items = await prisma.hotSearch.findMany({
    where,
    orderBy: [{ count: 'desc' }, { keyword: 'asc' }],
    take: limit
  });

  return sendSuccess(res, items);
}
