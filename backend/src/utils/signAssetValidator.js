import forge from 'node-forge';
import plist from 'plist';

function extractPlistXml(buffer) {
  const content = buffer.toString('utf8');
  const start = content.indexOf('<?xml');
  const end = content.lastIndexOf('</plist>');

  if (start < 0 || end < 0) {
    throw new Error('描述文件解析失败，未找到有效的 plist 内容。');
  }

  return content.slice(start, end + '</plist>'.length);
}

function normalizeTeamId(value) {
  return String(value || '').trim().toUpperCase();
}

function extractCertificateTeamIdFromP12(buffer, password) {
  try {
    const der = forge.util.createBuffer(buffer.toString('binary'));
    const asn1 = forge.asn1.fromDer(der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, String(password || ''));
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBags = bags[forge.pki.oids.certBag] || [];

    for (const bag of certBags) {
      const cert = bag.cert;
      if (!cert) continue;
      const ouField = cert.subject.attributes.find((item) => item.shortName === 'OU' || item.name === 'organizationalUnitName');
      if (ouField?.value) {
        return normalizeTeamId(ouField.value);
      }
    }
  } catch (error) {
    throw new Error(`证书解析失败：${error instanceof Error ? error.message : '无法读取 .p12 文件'}`);
  }

  throw new Error('证书解析失败，未能从 .p12 中识别团队标识。');
}

function extractProfileMeta(buffer) {
  try {
    const xml = extractPlistXml(buffer);
    const parsed = plist.parse(xml);
    const teamIdentifier = Array.isArray(parsed.TeamIdentifier) ? parsed.TeamIdentifier.map((item) => normalizeTeamId(item)) : [];
    const appIdPrefixes = Array.isArray(parsed.ApplicationIdentifierPrefix)
      ? parsed.ApplicationIdentifierPrefix.map((item) => normalizeTeamId(item))
      : [];

    return {
      teamIdentifier,
      appIdPrefixes,
      appId: parsed.Entitlements?.['application-identifier'] || null,
      profileUuid: parsed.UUID || null,
      profileName: parsed.Name || null,
    };
  } catch (error) {
    throw new Error(`描述文件解析失败：${error instanceof Error ? error.message : '无法读取 mobileprovision 文件'}`);
  }
}

export function validateCertificateProfilePair({ certificateBuffer, certificatePassword, profileBuffer }) {
  const certificateTeamId = extractCertificateTeamIdFromP12(certificateBuffer, certificatePassword);
  const profileMeta = extractProfileMeta(profileBuffer);

  const allProfileTeamIds = [...profileMeta.teamIdentifier, ...profileMeta.appIdPrefixes].filter(Boolean);
  const matched = allProfileTeamIds.includes(certificateTeamId);

  if (!matched) {
    throw new Error(`证书与描述文件不匹配：证书团队标识为 ${certificateTeamId}，描述文件团队标识为 ${allProfileTeamIds.join(' / ') || '未识别'}`);
  }

  return {
    certificateTeamId,
    profileTeamId: profileMeta.teamIdentifier[0] || profileMeta.appIdPrefixes[0] || certificateTeamId,
    appId: profileMeta.appId,
    profileUuid: profileMeta.profileUuid,
    profileName: profileMeta.profileName,
  };
}
