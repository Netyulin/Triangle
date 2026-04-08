import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendError, sendSuccess, ErrorCodes } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeString, serializeNetdiskReport } from '../utils/serializers.js';
import { sendTemplateNotificationToUser } from '../utils/notifications.js';

const reportStatuses = ['pending', 'handled'];

export const createValidation = validate([
  param('slug').trim().notEmpty().withMessage('slug is required'),
  body('netdiskName').trim().notEmpty().withMessage('netdiskName is required'),
  body('reason').trim().notEmpty().withMessage('reason is required'),
  body('downloadUrl').optional().isString().withMessage('downloadUrl must be a string'),
  body('contact').optional().isString().withMessage('contact must be a string')
]);

export const adminListValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('status').optional().isIn(reportStatuses).withMessage('status is invalid'),
  query('appSlug').optional().isString().withMessage('appSlug must be a string')
]);

export const adminUpdateValidation = validate([
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('status').optional().isIn(reportStatuses).withMessage('status is invalid'),
  body('adminNote').optional().isString().withMessage('adminNote must be a string')
]);

function buildReportData(body) {
  return {
    netdiskName: normalizeString(body.netdiskName).trim(),
    downloadUrl: body.downloadUrl !== undefined ? normalizeString(body.downloadUrl, '').trim() : '',
    reason: normalizeString(body.reason).trim(),
    contact: body.contact !== undefined ? normalizeString(body.contact, '').trim() : '',
    status: 'pending'
  };
}

function buildReportWhere(queryArgs = {}) {
  const where = {};
  if (queryArgs.status) {
    where.status = normalizeString(queryArgs.status).trim();
  }
  if (queryArgs.appSlug) {
    where.appSlug = normalizeString(queryArgs.appSlug).trim();
  }
  return where;
}

export async function create(req, res) {
  const app = await prisma.app.findUnique({
    where: { slug: req.params.slug },
    select: { slug: true }
  });

  if (!app) {
    return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
  }

  const payload = buildReportData(req.body || {});
  const report = await prisma.netdiskReport.create({
    data: {
      ...payload,
      appSlug: app.slug,
      reporterId: req.user?.id ?? null
    },
    include: {
      app: {
        select: {
          slug: true,
          name: true,
          category: true,
          icon: true
        }
      }
    }
  });

  return sendSuccess(res, serializeNetdiskReport(report), 'created', 201);
}

export async function adminList(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const where = buildReportWhere(req.query);

  const [items, total] = await Promise.all([
    prisma.netdiskReport.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        app: {
          select: {
            slug: true,
            name: true,
            category: true,
            icon: true
          }
        }
      }
    }),
    prisma.netdiskReport.count({ where })
  ]);

  return sendSuccess(res, {
    list: items.map(serializeNetdiskReport),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function adminUpdate(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.netdiskReport.findUnique({
    where: { id },
    include: {
      app: {
        select: {
          slug: true,
          name: true,
          category: true,
          icon: true
        }
      }
    }
  });

  if (!current) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'report not found');
  }

  const nextStatus = req.body.status ? normalizeString(req.body.status).trim() : current.status;
  const nextAdminNote = req.body.adminNote !== undefined ? normalizeString(req.body.adminNote, '').trim() : current.adminNote;
  const handledAt = nextStatus === 'handled' && current.status !== 'handled' ? new Date() : current.handledAt;

  const report = await prisma.netdiskReport.update({
    where: { id },
    data: {
      status: nextStatus,
      adminNote: nextAdminNote || null,
      handledAt,
      handledById: req.user.id
    },
    include: {
      app: {
        select: {
          slug: true,
          name: true,
          category: true,
          icon: true
        }
      }
    }
  });

  if (report.status === 'handled' && report.reporterId) {
    await sendTemplateNotificationToUser(
      report.reporterId,
      'netdisk_report_handled',
      {
        name: report.app?.name || '用户',
        note: report.adminNote || '系统已经完成处理。'
      },
      {
        senderId: req.user.id,
        data: {
          reportId: report.id,
          appSlug: report.appSlug,
          status: report.status
        }
      }
    );
  }

  return sendSuccess(res, serializeNetdiskReport(report), 'updated');
}
