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
  body('defaultLocale').optional().trim().isLength({ min: 2, max: 10 }).withMessage('defaultLocale is invalid'),
  body('supportedLocales').optional().isArray({ min: 1 }).withMessage('supportedLocales must be a non-empty array'),
  body('supportedLocales.*').optional().isString().trim().isLength({ min: 2, max: 10 }).withMessage('locale is invalid')
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
