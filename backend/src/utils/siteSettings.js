import prisma from './prisma.js';
import { executeRaw, queryRaw } from './dbRaw.js';
import { normalizeBoolean, normalizeInteger, normalizeString } from './serializers.js';
import { isPostgresDatabase } from './signTables.js';

const SETTINGS_KEY = 'site';
const UPDATED_AT_COLUMN = isPostgresDatabase() ? '"updatedAt"' : 'updatedAt';
const UPDATED_AT_SELECT = isPostgresDatabase() ? '"updatedAt" AS "updatedAt"' : 'updatedAt';
const EXCLUDED_UPDATED_AT = isPostgresDatabase() ? 'excluded."updatedAt"' : 'excluded.updatedAt';

export const DEFAULT_SITE_SETTINGS = {
  siteName: 'Triangle',
  siteDescription: '为中文用户整理软件、文章和真实需求。',
  homeFeaturedPostCount: 6,
  registrationEnabled: true,
  registrationRequiresInvite: false,
  siteAnnouncementEnabled: true,
  siteAnnouncementTitle: '站点公告',
  siteAnnouncementContent: '欢迎来到 Triangle，这里会持续整理软件、文章与下载资源。',
  siteAnnouncementLink: '',
  downloadInterstitialEnabled: true,
  downloadInterstitialTitle: '下载前确认',
  downloadInterstitialDescription: '基础会员下载前会短暂停留，高等级会员将自动跳过。',
  downloadInterstitialButtonText: '继续下载',
  downloadInterstitialBuyUrl: ''
};

export async function ensureSiteSettingsTable() {
  await executeRaw(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      ${UPDATED_AT_COLUMN} TEXT NOT NULL
    )
  `);

  if (isPostgresDatabase()) {
    const columns = await queryRaw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'site_settings'
    `);

    const hasCamelCase = Array.isArray(columns) && columns.some((item) => item.column_name === 'updatedAt');
    const hasLowerCase = Array.isArray(columns) && columns.some((item) => item.column_name === 'updatedat');

    if (!hasCamelCase && hasLowerCase) {
      await executeRaw('ALTER TABLE site_settings RENAME COLUMN updatedat TO "updatedAt"');
    }
  }
}

export function normalizeSiteSettings(input = {}) {
  return {
    siteName: normalizeString(input.siteName, DEFAULT_SITE_SETTINGS.siteName).trim() || DEFAULT_SITE_SETTINGS.siteName,
    siteDescription:
      normalizeString(input.siteDescription, DEFAULT_SITE_SETTINGS.siteDescription).trim() ||
      DEFAULT_SITE_SETTINGS.siteDescription,
    homeFeaturedPostCount: normalizeInteger(input.homeFeaturedPostCount, DEFAULT_SITE_SETTINGS.homeFeaturedPostCount),
    registrationEnabled: normalizeBoolean(input.registrationEnabled, DEFAULT_SITE_SETTINGS.registrationEnabled),
    registrationRequiresInvite: normalizeBoolean(
      input.registrationRequiresInvite,
      DEFAULT_SITE_SETTINGS.registrationRequiresInvite
    ),
    siteAnnouncementEnabled: normalizeBoolean(
      input.siteAnnouncementEnabled,
      DEFAULT_SITE_SETTINGS.siteAnnouncementEnabled
    ),
    siteAnnouncementTitle:
      normalizeString(input.siteAnnouncementTitle, DEFAULT_SITE_SETTINGS.siteAnnouncementTitle).trim() ||
      DEFAULT_SITE_SETTINGS.siteAnnouncementTitle,
    siteAnnouncementContent:
      normalizeString(input.siteAnnouncementContent, DEFAULT_SITE_SETTINGS.siteAnnouncementContent).trim() ||
      DEFAULT_SITE_SETTINGS.siteAnnouncementContent,
    siteAnnouncementLink: normalizeString(
      input.siteAnnouncementLink,
      DEFAULT_SITE_SETTINGS.siteAnnouncementLink
    ).trim(),
    downloadInterstitialEnabled: normalizeBoolean(
      input.downloadInterstitialEnabled,
      DEFAULT_SITE_SETTINGS.downloadInterstitialEnabled
    ),
    downloadInterstitialTitle:
      normalizeString(input.downloadInterstitialTitle, DEFAULT_SITE_SETTINGS.downloadInterstitialTitle).trim() ||
      DEFAULT_SITE_SETTINGS.downloadInterstitialTitle,
    downloadInterstitialDescription:
      normalizeString(
        input.downloadInterstitialDescription,
        DEFAULT_SITE_SETTINGS.downloadInterstitialDescription
      ).trim() || DEFAULT_SITE_SETTINGS.downloadInterstitialDescription,
    downloadInterstitialButtonText:
      normalizeString(
        input.downloadInterstitialButtonText,
        DEFAULT_SITE_SETTINGS.downloadInterstitialButtonText
      ).trim() || DEFAULT_SITE_SETTINGS.downloadInterstitialButtonText,
    downloadInterstitialBuyUrl: normalizeString(
      input.downloadInterstitialBuyUrl,
      DEFAULT_SITE_SETTINGS.downloadInterstitialBuyUrl
    ).trim()
  };
}

export async function writeSiteSettings(settings) {
  await ensureSiteSettingsTable();
  const normalized = normalizeSiteSettings(settings);
  const updatedAt = new Date().toISOString();

  await executeRaw(
    `
      INSERT INTO site_settings (key, value, ${UPDATED_AT_COLUMN})
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, ${UPDATED_AT_COLUMN} = ${EXCLUDED_UPDATED_AT}
    `,
    SETTINGS_KEY,
    JSON.stringify(normalized),
    updatedAt
  );

  return {
    ...normalized,
    updatedAt
  };
}

export async function readSiteSettings() {
  await ensureSiteSettingsTable();
  const rows = await queryRaw(`SELECT value, ${UPDATED_AT_SELECT} FROM site_settings WHERE key = ?`, SETTINGS_KEY);
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    const defaults = normalizeSiteSettings(DEFAULT_SITE_SETTINGS);
    return writeSiteSettings(defaults);
  }

  let parsed = DEFAULT_SITE_SETTINGS;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    parsed = DEFAULT_SITE_SETTINGS;
  }

  return {
    ...normalizeSiteSettings(parsed),
    updatedAt: row.updatedAt
  };
}
