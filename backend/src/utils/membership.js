export const MEMBERSHIP_LEVELS = ['free', 'sponsor', 'lifetime', 'supreme'];

export const MEMBERSHIP_LEVEL_LABELS = {
  free: '免费会员',
  sponsor: '赞助会员',
  lifetime: '终身会员',
  supreme: '至尊会员'
};

const MEMBERSHIP_LEVEL_ALIASES = {
  member: 'sponsor',
  premium: 'lifetime',
  vip: 'supreme'
};

export function normalizeMembershipLevel(level, fallback = 'free') {
  const value = String(level || '').trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  if (MEMBERSHIP_LEVELS.includes(value)) {
    return value;
  }

  return MEMBERSHIP_LEVEL_ALIASES[value] || fallback;
}

export function getMembershipLevelRank(level) {
  const normalized = normalizeMembershipLevel(level);
  return Math.max(MEMBERSHIP_LEVELS.indexOf(normalized), 0);
}

export function getMembershipLevelLabel(level) {
  const normalized = normalizeMembershipLevel(level);
  return MEMBERSHIP_LEVEL_LABELS[normalized] || MEMBERSHIP_LEVEL_LABELS.free;
}

export function getAllowedMembershipLevels(level) {
  const normalized = normalizeMembershipLevel(level);
  const rank = getMembershipLevelRank(normalized);
  return MEMBERSHIP_LEVELS.slice(0, rank + 1);
}

export function getHighestMembershipLevel(levelA, levelB) {
  return getMembershipLevelRank(levelA) >= getMembershipLevelRank(levelB) ? normalizeMembershipLevel(levelA) : normalizeMembershipLevel(levelB);
}
