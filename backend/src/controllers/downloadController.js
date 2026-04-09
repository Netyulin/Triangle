import { param } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';

const slugValidation = validate([param('slug').trim().notEmpty().withMessage('slug is required')]);

export { slugValidation };

export async function getDownloadInfo(req, res) {
  const { slug } = req.params;
  const { mirror } = req.query; // 可选：指定镜像索引

  const app = await prisma.app.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      version: true,
      icon: true,
      heroImage: true,
      downloadUrl: true,
      downloadLinks: true,
      affiliateLink: true,
      isDownloadable: true
    }
  });

  if (!app) {
    return sendError(res, ErrorCodes.APP_NOT_FOUND, 'software not found');
  }

  if (!app.isDownloadable || (!app.downloadUrl && !app.downloadLinks)) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'download not available');
  }

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || null;

  // 确定最终下载 URL 和 CPS 跳转 URL
  let finalDownloadUrl = app.downloadUrl;
  let finalAffiliateUrl = app.affiliateLink || app.downloadUrl;

  if (app.downloadLinks && Array.isArray(app.downloadLinks) && app.downloadLinks.length > 0) {
    const mirrorIndex = mirror ? parseInt(mirror, 10) : 0;
    const selectedMirror = app.downloadLinks[mirrorIndex] || app.downloadLinks[0];

    if (selectedMirror.url) {
      finalDownloadUrl = selectedMirror.url;
    }
    // per-mirror CPS 链接优先，否则用全局 affiliateLink
    if (selectedMirror.affiliateUrl) {
      finalAffiliateUrl = selectedMirror.affiliateUrl;
    } else if (app.affiliateLink) {
      finalAffiliateUrl = app.affiliateLink;
    }
  }

  // 创建 CPS 下载记录
  await prisma.cpsDownload.create({
    data: {
      softwareSlug: slug,
      downloadUrl: finalDownloadUrl,
      affiliateUrl: finalAffiliateUrl,
      ipAddress: ip,
      userAgent
    }
  });

  return sendSuccess(res, {
    slug: app.slug,
    name: app.name,
    version: app.version,
    icon: app.icon,
    heroImage: app.heroImage,
    downloadUrl: finalDownloadUrl,
    affiliateLink: finalAffiliateUrl
  });
}

export async function recordAdClick(req, res) {
  const { slug } = req.params;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  await prisma.downloadLog.updateMany({
    where: {
      softwareSlug: slug,
      ip,
      createdAt: { gte: new Date(Date.now() - 60000) }
    },
    data: { adClicked: true }
  });

  return sendSuccess(res, { recorded: true });
}
