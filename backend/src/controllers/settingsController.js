import { body } from 'express-validator';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { readSiteSettings, writeSiteSettings } from '../utils/siteSettings.js';

export const updateValidation = validate([
  body('siteName').optional().trim().isLength({ min: 1, max: 80 }).withMessage('siteName is invalid'),
  body('siteDescription').optional().trim().isLength({ min: 1, max: 200 }).withMessage('siteDescription is invalid'),
  body('homeFeaturedPostCount').optional().isInt({ min: 1, max: 20 }).withMessage('homeFeaturedPostCount is invalid'),
  body('registrationEnabled').optional().isBoolean().withMessage('registrationEnabled must be a boolean'),
  body('registrationRequiresInvite').optional().isBoolean().withMessage('registrationRequiresInvite must be a boolean'),
  body('siteAnnouncementEnabled').optional().isBoolean().withMessage('siteAnnouncementEnabled must be a boolean'),
  body('siteAnnouncementTitle').optional().trim().isLength({ min: 1, max: 80 }).withMessage('siteAnnouncementTitle is invalid'),
  body('siteAnnouncementContent').optional().trim().isLength({ min: 1, max: 500 }).withMessage('siteAnnouncementContent is invalid'),
  body('siteAnnouncementLink').optional().trim().isLength({ max: 255 }).withMessage('siteAnnouncementLink is invalid'),
  body('downloadInterstitialEnabled').optional().isBoolean().withMessage('downloadInterstitialEnabled must be a boolean'),
  body('downloadInterstitialTitle').optional().trim().isLength({ min: 1, max: 80 }).withMessage('downloadInterstitialTitle is invalid'),
  body('downloadInterstitialDescription').optional().trim().isLength({ min: 1, max: 500 }).withMessage('downloadInterstitialDescription is invalid'),
  body('downloadInterstitialButtonText').optional().trim().isLength({ min: 1, max: 40 }).withMessage('downloadInterstitialButtonText is invalid'),
  body('downloadInterstitialBuyUrl').optional().trim().isLength({ max: 255 }).withMessage('downloadInterstitialBuyUrl is invalid')
]);

export async function getPublicSettings(_req, res) {
  const settings = await readSiteSettings();
  return sendSuccess(res, settings);
}

export async function getAdminSettings(_req, res) {
  const settings = await readSiteSettings();
  return sendSuccess(res, settings);
}

export async function updateSettings(req, res) {
  const current = await readSiteSettings();
  const next = await writeSiteSettings({
    ...current,
    ...req.body
  });
  return sendSuccess(res, next, 'updated');
}
