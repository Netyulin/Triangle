#!/usr/bin/env node
import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { pushBaiduUrlByPath } from '../src/utils/baiduPush.js';

function parseArgs(argv) {
  const args = {
    delayMs: 200
  };

  for (const token of argv) {
    if (token.startsWith('--delay-ms=')) {
      const value = Number(token.slice('--delay-ms='.length));
      if (Number.isFinite(value) && value >= 0) args.delayMs = value;
    }
  }

  return args;
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const [apps, posts] = await Promise.all([
    prisma.app.findMany({
      where: { status: 'published' },
      select: { slug: true }
    }),
    prisma.post.findMany({
      where: { status: 'published' },
      select: { slug: true }
    })
  ]);

  const tasks = [
    ...apps.map((item) => ({ type: 'app', path: `/software/${item.slug}` })),
    ...posts.map((item) => ({ type: 'post', path: `/articles/${item.slug}` }))
  ];

  if (tasks.length === 0) {
    console.log('[baidu-push] 没有可推送的已发布内容');
    return;
  }

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const task of tasks) {
    const result = await pushBaiduUrlByPath(task.path);
    if (result?.skipped) {
      skippedCount += 1;
      console.log(`[baidu-push][SKIP] ${task.type} ${task.path}: ${result.reason}`);
    } else if (result?.ok) {
      successCount += 1;
      console.log(`[baidu-push][OK] ${task.type} ${task.path}`);
    } else {
      failedCount += 1;
      console.log(`[baidu-push][FAIL] ${task.type} ${task.path}: ${JSON.stringify(result)}`);
    }
    await sleep(args.delayMs);
  }

  console.log(
    `[baidu-push] finished total=${tasks.length} success=${successCount} failed=${failedCount} skipped=${skippedCount}`
  );
}

main()
  .catch((error) => {
    console.error('[baidu-push] 执行失败:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

