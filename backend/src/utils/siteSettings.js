import prisma from './prisma.js';
import { normalizeBoolean, normalizeInteger, normalizeString } from './serializers.js';

const SETTINGS_KEY = 'site';

export const LANGUAGE_OPTIONS = {
  'zh-CN': {
    code: 'zh-CN',
    label: '简体中文'
  },
  'zh-TW': {
    code: 'zh-TW',
    label: '繁體中文'
  },
  en: {
    code: 'en',
    label: 'English'
  }
};

export const DEFAULT_SITE_SETTINGS = {
  siteName: 'Triangle',
  siteDescription: '为 Mac 用户整理软件、文章和真实需求。',
  homeFeaturedPostCount: 6,
  registrationEnabled: true,
  registrationRequiresInvite: false,
  siteAnnouncementEnabled: true,
  siteAnnouncementTitle: '站点公告',
  siteAnnouncementContent: '欢迎来到 Triangle，这里会持续整理软件、文章与下载资源。',
  siteAnnouncementLink: '',
  downloadInterstitialEnabled: true,
  downloadInterstitialTitle: '下载前确认',
  downloadInterstitialDescription: '基础会员进入下载前会短暂停留，高等级会员将自动跳过。',
  downloadInterstitialButtonText: '继续下载',
  downloadInterstitialBuyUrl: '',
  defaultLocale: 'zh-CN',
  supportedLocales: ['zh-CN', 'zh-TW', 'en']
};

export async function ensureSiteSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
}

function normalizeSupportedLocales(input) {
  const raw = Array.isArray(input) ? input : DEFAULT_SITE_SETTINGS.supportedLocales;
  const locales = raw
    .map((item) => normalizeString(item).trim())
    .filter((item) => Boolean(item) && LANGUAGE_OPTIONS[item]);

  const uniqueLocales = [...new Set(locales)];
  return uniqueLocales.length > 0 ? uniqueLocales : [...DEFAULT_SITE_SETTINGS.supportedLocales];
}

export function normalizeSiteSettings(input = {}) {
  const supportedLocales = normalizeSupportedLocales(input.supportedLocales);
  const defaultLocaleCandidate = normalizeString(input.defaultLocale, DEFAULT_SITE_SETTINGS.defaultLocale).trim();
  const defaultLocale = supportedLocales.includes(defaultLocaleCandidate) ? defaultLocaleCandidate : supportedLocales[0];

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
    ).trim(),
    defaultLocale,
    supportedLocales,
    languageOptions: supportedLocales.map((code) => LANGUAGE_OPTIONS[code])
  };
}

export async function writeSiteSettings(settings) {
  await ensureSiteSettingsTable();
  const normalized = normalizeSiteSettings(settings);
  const updatedAt = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO site_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
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
  const rows = await prisma.$queryRawUnsafe(`SELECT value, updatedAt FROM site_settings WHERE key = ?`, SETTINGS_KEY);
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
