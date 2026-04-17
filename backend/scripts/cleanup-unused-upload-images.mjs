#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/utils/prisma.js';
import { getUploadsRoot, isObjectStorageEnabled } from '../src/utils/objectStorage.js';

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.avif',
  '.bmp',
  '.ico',
  '.jfif',
]);

function parseArgs(argv) {
  const args = {
    apply: false,
    verbose: false,
    includeNonImage: false,
    pruneEmptyDirs: false,
    dir: '',
  };

  for (const token of argv) {
    if (token === '--apply') {
      args.apply = true;
      continue;
    }
    if (token === '--verbose') {
      args.verbose = true;
      continue;
    }
    if (token === '--include-non-image') {
      args.includeNonImage = true;
      continue;
    }
    if (token === '--prune-empty-dirs') {
      args.pruneEmptyDirs = true;
      continue;
    }
    if (token.startsWith('--dir=')) {
      args.dir = token.slice('--dir='.length).trim();
      continue;
    }
  }

  return args;
}

function decodeSafely(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function stripQueryAndHash(value) {
  const noHash = String(value || '').split('#')[0];
  return noHash.split('?')[0];
}

function normalizeUploadRelative(candidate, uploadsRootPosix) {
  let value = String(candidate || '').trim();
  if (!value) return '';

  value = decodeSafely(value);
  value = stripQueryAndHash(value);

  if (value.startsWith('local:')) {
    value = value.slice('local:'.length);
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      value = decodeSafely(url.pathname || '');
    } catch {
      return '';
    }
  }

  value = toPosix(value);
  if (!value) return '';

  const marker = '/uploads/';
  const markerIndex = value.toLowerCase().indexOf(marker);
  if (markerIndex >= 0) {
    value = value.slice(markerIndex + marker.length);
  } else {
    const uploadsRootIndex = value.toLowerCase().indexOf(uploadsRootPosix.toLowerCase());
    if (uploadsRootIndex >= 0) {
      value = value.slice(uploadsRootIndex + uploadsRootPosix.length);
    } else if (value.startsWith('uploads/')) {
      value = value.slice('uploads/'.length);
    }
  }

  value = value.replace(/^\/+/, '').replace(/^\.\/+/, '');
  if (!value || value === '.' || value === '..') return '';
  if (value.split('/').includes('..')) return '';
  return value;
}

function extractUploadCandidatesFromString(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const results = new Set();
  results.add(raw);

  const regex = /(?:https?:\/\/[^\s"'`<>()]+)?\/uploads\/[^\s"'`<>()]+/gi;
  let match = null;
  while ((match = regex.exec(raw)) !== null) {
    if (match[0]) {
      results.add(match[0]);
    }
  }

  return [...results];
}

function visitUnknown(value, onString) {
  if (value == null) return;
  if (typeof value === 'string') {
    onString(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      visitUnknown(item, onString);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value)) {
      visitUnknown(nested, onString);
    }
  }
}

async function listFilesRecursively(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        files.push(abs);
      }
    }
  }

  return files;
}

async function pruneEmptyDirectories(rootDir) {
  async function recurse(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let hasFile = false;
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const childHasFile = await recurse(abs);
        hasFile = hasFile || childHasFile;
      } else {
        hasFile = true;
      }
    }

    if (!hasFile && dir !== rootDir) {
      await fs.rmdir(dir).catch(() => {});
    }

    return hasFile;
  }

  await recurse(rootDir);
}

async function loadDatabaseImageReferences(uploadsRootPosix) {
  const used = new Set();

  function collectFrom(value) {
    visitUnknown(value, (text) => {
      for (const candidate of extractUploadCandidatesFromString(text)) {
        const normalized = normalizeUploadRelative(candidate, uploadsRootPosix);
        if (normalized) used.add(normalized);
      }
    });
  }

  const [users, apps, posts, topics, comments, adContents] = await Promise.all([
    prisma.user.findMany({ select: { avatar: true } }),
    prisma.app.findMany({ select: { icon: true, heroImage: true, gallery: true, summary: true } }),
    prisma.post.findMany({ select: { coverImage: true, icon: true, content: true, excerpt: true } }),
    prisma.topic.findMany({ select: { coverImage: true, description: true } }),
    prisma.comment.findMany({ select: { authorAvatar: true } }),
    prisma.adContent.findMany({ select: { imageUrl: true } }),
  ]);

  for (const row of users) collectFrom(row.avatar);
  for (const row of apps) {
    collectFrom(row.icon);
    collectFrom(row.heroImage);
    collectFrom(row.gallery);
    collectFrom(row.summary);
  }
  for (const row of posts) {
    collectFrom(row.coverImage);
    collectFrom(row.icon);
    collectFrom(row.content);
    collectFrom(row.excerpt);
  }
  for (const row of topics) {
    collectFrom(row.coverImage);
    collectFrom(row.description);
  }
  for (const row of comments) collectFrom(row.authorAvatar);
  for (const row of adContents) collectFrom(row.imageUrl);

  try {
    const siteSettings = await prisma.$queryRawUnsafe('SELECT value FROM site_settings');
    for (const row of siteSettings || []) {
      collectFrom(row?.value);
    }
  } catch {
    // 某些环境可能还没初始化 site_settings 表，忽略即可
  }

  return used;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const uploadsRoot = args.dir ? path.resolve(args.dir) : getUploadsRoot();
  const uploadsRootPosix = toPosix(uploadsRoot);

  if (isObjectStorageEnabled()) {
    console.warn('[警告] 当前 OBJECT_STORAGE_DRIVER 不是 local。本脚本只会清理本地 uploads 目录。');
  }

  const stat = await fs.stat(uploadsRoot).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`上传目录不存在或不可访问：${uploadsRoot}`);
  }

  const dbUsedSet = await loadDatabaseImageReferences(uploadsRootPosix);
  const dbUsedSetLower = new Set([...dbUsedSet].map((item) => item.toLowerCase()));

  const allFiles = await listFilesRecursively(uploadsRoot);
  const scopedFiles = allFiles.filter((absPath) => {
    if (args.includeNonImage) return true;
    const ext = path.extname(absPath).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });

  const fileMetas = await Promise.all(
    scopedFiles.map(async (absPath) => {
      const relative = toPosix(path.relative(uploadsRoot, absPath)).replace(/^\/+/, '');
      const st = await fs.stat(absPath);
      return {
        absolute: absPath,
        relative,
        size: st.size,
      };
    }),
  );

  const unused = [];
  const usedOnDisk = [];
  for (const file of fileMetas) {
    const isUsed = dbUsedSet.has(file.relative) || dbUsedSetLower.has(file.relative.toLowerCase());
    if (isUsed) {
      usedOnDisk.push(file);
    } else {
      unused.push(file);
    }
  }

  const missingFromDisk = [...dbUsedSet].filter((rel) => !fileMetas.some((file) => file.relative === rel));

  console.log(`上传目录: ${uploadsRoot}`);
  console.log(`数据库引用数: ${dbUsedSet.size}`);
  console.log(`目录文件数: ${fileMetas.length}`);
  console.log(`在用文件数: ${usedOnDisk.length}`);
  console.log(`疑似未使用文件数: ${unused.length}`);
  console.log(`数据库引用但磁盘缺失: ${missingFromDisk.length}`);
  console.log(`模式: ${args.apply ? '删除模式 (--apply)' : '预览模式 (dry-run)'}`);

  if (unused.length > 0) {
    console.log('\n[待清理文件预览，最多显示 200 条]');
    for (const item of unused.slice(0, 200)) {
      console.log(`- ${item.relative} (${item.size} bytes)`);
    }
    if (unused.length > 200) {
      console.log(`... 还有 ${unused.length - 200} 条未显示`);
    }
  }

  if (args.verbose && missingFromDisk.length > 0) {
    console.log('\n[数据库有引用但磁盘缺失，最多显示 100 条]');
    for (const rel of missingFromDisk.slice(0, 100)) {
      console.log(`- ${rel}`);
    }
    if (missingFromDisk.length > 100) {
      console.log(`... 还有 ${missingFromDisk.length - 100} 条未显示`);
    }
  }

  if (!args.apply) {
    console.log('\n未执行删除。如需实际删除，请追加 --apply 参数。');
    return;
  }

  let deletedCount = 0;
  let deletedBytes = 0;
  for (const item of unused) {
    await fs.rm(item.absolute, { force: true });
    deletedCount += 1;
    deletedBytes += item.size;
  }

  if (args.pruneEmptyDirs) {
    await pruneEmptyDirectories(uploadsRoot);
  }

  console.log('\n删除完成。');
  console.log(`已删除文件数: ${deletedCount}`);
  console.log(`释放空间: ${deletedBytes} bytes`);
}

main()
  .catch((error) => {
    console.error('[失败]', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

