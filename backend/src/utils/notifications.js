import prisma from './prisma.js';
import { normalizeInteger, normalizeJsonInput, normalizeString } from './serializers.js';

export const NOTIFICATION_USAGE_CONDITIONS = [
  'register',
  'ban',
  'sign_disabled',
  'new_feature',
  'manual',
  'general'
];

export const DEFAULT_NOTIFICATION_TEMPLATES = {
  register_welcome: {
    key: 'register_welcome',
    title: '欢迎来到 Triangle',
    content: '你好，{{name}}，你的账号已经创建成功，欢迎开始使用。',
    usageCondition: 'register'
  },
  invite_code_assigned: {
    key: 'invite_code_assigned',
    title: '邀请码已发放',
    content: '你好，{{name}}，你的邀请码已准备好：{{codes}}',
    usageCondition: 'manual'
  },
  netdisk_report_handled: {
    key: 'netdisk_report_handled',
    title: '网盘失效报告已处理',
    content: '你好，你提交的失效报告已经处理完成。{{note}}',
    usageCondition: 'general'
  },
  admin_broadcast: {
    key: 'admin_broadcast',
    title: '站内通知',
    content: '{{content}}',
    usageCondition: 'manual'
  },
  user_banned: {
    key: 'user_banned',
    title: '账号已被禁言',
    content: '你的账号已被禁言。{{reason}}',
    usageCondition: 'ban'
  },
  sign_disabled: {
    key: 'sign_disabled',
    title: '签名权限已关闭',
    content: '你的签名权限已被关闭，如有疑问请联系管理员。',
    usageCondition: 'sign_disabled'
  },
  new_feature_release: {
    key: 'new_feature_release',
    title: '新功能上线',
    content: '{{feature}} 已上线，欢迎体验。',
    usageCondition: 'new_feature'
  }
};

function normalizeUsageCondition(value, fallback = 'general') {
  const normalized = normalizeString(value).trim().toLowerCase();
  if (NOTIFICATION_USAGE_CONDITIONS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function renderString(template, values = {}) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = values[key];
    if (value === undefined || value === null) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.join('，');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  });
}

function normalizeTemplatePayload(template = {}, values = {}) {
  const base = DEFAULT_NOTIFICATION_TEMPLATES[template.key] || {};
  const title = renderString(template.title || base.title || '站内通知', values).trim() || '站内通知';

  return {
    key: normalizeString(template.key || base.key).trim(),
    title,
    content: renderString(template.content || base.content || '', values).trim(),
    description: normalizeString(template.description || base.description || '').trim() || null,
    usageCondition: normalizeUsageCondition(template.usageCondition || base.usageCondition || 'general'),
    enabled: template.enabled !== undefined ? Boolean(template.enabled) : base.enabled !== undefined ? Boolean(base.enabled) : true
  };
}

export function ensureNotificationTemplateSeed(key, values = {}) {
  const template = DEFAULT_NOTIFICATION_TEMPLATES[key];
  if (!template) {
    return null;
  }

  return normalizeTemplatePayload(template, values);
}

export async function listNotificationTemplates() {
  const rows = await prisma.notificationTemplate.findMany({
    orderBy: [{ key: 'asc' }]
  });

  const merged = rows.map((row) => ({
    key: row.key,
    title: row.title,
    content: row.content,
    kind: 'notification',
    usageCondition: normalizeUsageCondition(row.usageCondition, 'general'),
    description: row.description ?? null,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));

  for (const template of Object.values(DEFAULT_NOTIFICATION_TEMPLATES)) {
    if (!merged.some((row) => row.key === template.key)) {
      merged.push({
        key: template.key,
        title: template.title,
        content: template.content,
        kind: 'notification',
        usageCondition: normalizeUsageCondition(template.usageCondition, 'general'),
        description: null,
        enabled: true,
        createdAt: null,
        updatedAt: null
      });
    }
  }

  return merged.sort((left, right) => left.key.localeCompare(right.key, 'zh-Hans-CN'));
}

export async function upsertNotificationTemplate(key, payload = {}) {
  const normalizedKey = normalizeString(key).trim();
  const template = normalizeTemplatePayload({ key: normalizedKey, ...payload }, payload.variables || {});

  if (!template.key) {
    return null;
  }

  const data = {
    title: template.title,
    content: template.content,
    description: template.description,
    usageCondition: template.usageCondition,
    enabled: template.enabled
  };

  const row = await prisma.notificationTemplate.upsert({
    where: { key: template.key },
    create: {
      key: template.key,
      ...data
    },
    update: data
  });

  return {
    ...row,
    kind: 'notification',
    usageCondition: normalizeUsageCondition(row.usageCondition, 'general')
  };
}

export async function getNotificationTemplate(key) {
  const normalizedKey = normalizeString(key).trim();
  if (!normalizedKey) {
    return null;
  }

  const row = await prisma.notificationTemplate.findUnique({
    where: { key: normalizedKey }
  });

  if (row) {
    return {
      ...row,
      usageCondition: normalizeUsageCondition(row.usageCondition, 'general')
    };
  }

  const fallback = DEFAULT_NOTIFICATION_TEMPLATES[normalizedKey];
  if (!fallback) {
    return null;
  }

  return {
    key: fallback.key,
    title: fallback.title,
    content: fallback.content,
    description: null,
    usageCondition: normalizeUsageCondition(fallback.usageCondition, 'general'),
    enabled: true
  };
}

export async function createNotification(data) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      senderId: data.senderId ?? null,
      type: normalizeString(data.type, 'system').trim() || 'system',
      templateKey: data.templateKey ? normalizeString(data.templateKey).trim() : null,
      title: normalizeString(data.title, '站内通知').trim() || '站内通知',
      content: normalizeString(data.content).trim(),
      data: data.data !== undefined ? normalizeJsonInput(data.data, null) : null,
      link: data.link ? normalizeString(data.link).trim() : null
    }
  });
}

export async function createNotificationsForUsers(userIds, data) {
  const uniqueUserIds = [...new Set((Array.isArray(userIds) ? userIds : []).map((value) => normalizeInteger(value, 0)).filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return { count: 0 };
  }

  await prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      senderId: data.senderId ?? null,
      type: normalizeString(data.type, 'system').trim() || 'system',
      templateKey: data.templateKey ? normalizeString(data.templateKey).trim() : null,
      title: normalizeString(data.title, '站内通知').trim() || '站内通知',
      content: normalizeString(data.content).trim(),
      data: data.data !== undefined ? normalizeJsonInput(data.data, null) : null,
      link: data.link ? normalizeString(data.link).trim() : null
    }))
  });

  return { count: uniqueUserIds.length };
}

export async function createNotificationForAllUsers(data) {
  const users = await prisma.user.findMany({
    select: { id: true }
  });

  return createNotificationsForUsers(
    users.map((item) => item.id),
    data
  );
}

export async function sendTemplateNotificationToUser(userId, templateKey, values = {}, extras = {}) {
  const template = await getNotificationTemplate(templateKey);
  if (!template || template.enabled === false) {
    return null;
  }

  const normalized = normalizeTemplatePayload(template, values);

  return createNotification({
    userId,
    senderId: extras.senderId ?? null,
    type: extras.type || 'system',
    templateKey: normalized.key,
    title: extras.title ? normalizeString(extras.title).trim() : normalized.title,
    content: extras.content ? normalizeString(extras.content).trim() : normalized.content,
    data: extras.data ?? values,
    link: extras.link ?? null
  });
}

export async function listNotificationsForUser(userId, options = {}) {
  const page = normalizeInteger(options.page, 1);
  const pageSize = normalizeInteger(options.pageSize, 20);
  const unreadOnly = Boolean(options.unreadOnly);
  const where = {
    userId,
    deletedAt: null,
    ...(unreadOnly ? { isRead: false } : {})
  };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.notification.count({ where })
  ]);

  return {
    list: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

export async function getUnreadNotificationCount(userId) {
  return prisma.notification.count({
    where: {
      userId,
      deletedAt: null,
      isRead: false
    }
  });
}

export async function markNotificationRead(notificationId, userId) {
  const id = normalizeInteger(notificationId, 0);
  if (!id) {
    return null;
  }

  return prisma.notification.updateMany({
    where: {
      id,
      userId,
      deletedAt: null
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead(userId) {
  return prisma.notification.updateMany({
    where: {
      userId,
      deletedAt: null,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
}

export async function softDeleteNotification(notificationId, userId) {
  const id = normalizeInteger(notificationId, 0);
  if (!id) {
    return null;
  }

  return prisma.notification.updateMany({
    where: {
      id,
      userId,
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });
}
