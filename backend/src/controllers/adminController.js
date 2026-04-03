import { query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger } from '../utils/serializers.js';

const trendsValidation = validate([
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('days must be between 1 and 90')
]);

const recentValidation = validate([
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit must be between 1 and 20')
]);

export { trendsValidation, recentValidation };

export async function stats(req, res) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

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
    newRequestsThisWeek
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
    prisma.softwareRequest.count({ where: { createdAt: { gte: oneWeekAgo } } })
  ]);

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
    newRequestsThisWeek
  });
}

export async function trends(req, res) {
  const days = normalizeInteger(req.query.days, 30);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const [apps, posts, requests] = await Promise.all([
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
    })
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

    trendData.push({
      date: dayStart.toISOString().slice(0, 10),
      apps: countInRange(apps),
      posts: countInRange(posts),
      requests: countInRange(requests)
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
