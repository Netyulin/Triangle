import { param } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { getMembershipLevelRank, normalizeMembershipLevel } from '../utils/membership.js';

const slugValidation = validate([param('slug').trim().notEmpty().withMessage('slug is required')]);

export { slugValidation };

export async function getDownloadInfo(req, res) {
  const { slug } = req.params;
  const { mirror } = req.query;
  const user = req.user ?? null;

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
      isDownloadable: true,
      accessLevel: true
    }
  });

  if (!app) {
    return sendError(res, ErrorCodes.APP_NOT_FOUND, 'software not found');
  }

  if (!app.isDownloadable || (!app.downloadUrl && !app.downloadLinks)) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'download not available');
  }

  if (!user) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, 'login required');
  }

  if (user.role !== 'admin') {
    const userLevel = normalizeMembershipLevel(user.membershipLevel);
    const requiredLevel = normalizeMembershipLevel(app.accessLevel);
    if (getMembershipLevelRank(userLevel) < getMembershipLevelRank(requiredLevel)) {
      return sendError(res, ErrorCodes.FORBIDDEN, 'membership not enough');
    }

    if (user.downloadQuotaDaily <= user.downloadCountDaily) {
      return sendError(res, ErrorCodes.FORBIDDEN, 'daily quota exhausted');
    }
  }

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || null;

  let finalDownloadUrl = app.downloadUrl;
  let finalAffiliateUrl = app.affiliateLink || app.downloadUrl;

  if (app.downloadLinks && Array.isArray(app.downloadLinks) && app.downloadLinks.length > 0) {
    const mirrorIndex = mirror ? parseInt(mirror, 10) : 0;
    const selectedMirror = app.downloadLinks[mirrorIndex] || app.downloadLinks[0];

    if (selectedMirror.url) {
      finalDownloadUrl = selectedMirror.url;
    }

    if (selectedMirror.affiliateUrl) {
      finalAffiliateUrl = selectedMirror.affiliateUrl;
    } else if (app.affiliateLink) {
      finalAffiliateUrl = app.affiliateLink;
    }
  }

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
