import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { ensureAppCategoriesTable, syncAppCategoriesFromApps } from '../utils/appCategories.js';
import { writeSiteSettings } from '../utils/siteSettings.js';

async function resetDatabase() {
  await prisma.comment.deleteMany();
  await prisma.topicApp.deleteMany();
  await prisma.topicPost.deleteMany();
  await prisma.netdiskReport.deleteMany();
  await prisma.downloadLog.deleteMany();
  await prisma.cpsDownload.deleteMany();
  await prisma.post.deleteMany();
  await prisma.adContent.deleteMany();
  await prisma.adSlot.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.app.deleteMany();
  await prisma.softwareRequest.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.hotSearch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS app_categories');
}

async function main() {
  console.log('开始初始化种子数据...');

  await resetDatabase();
  await writeSiteSettings({
    siteName: 'Triangle',
    siteDescription: 'Software, articles, and real requests for Mac users.',
    homeFeaturedPostCount: 6,
    registrationEnabled: true,
    registrationRequiresInvite: true
  });

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@triangle-portal.com',
      password: await bcrypt.hash('admin123', 10),
      name: '系统管理员',
      role: 'admin',
      status: 'active',
      avatar: 'https://placehold.co/128x128/111827/ffffff?text=A'
    }
  });

  const reader = await prisma.user.create({
    data: {
      username: 'reader',
      email: 'reader@triangle-portal.com',
      password: await bcrypt.hash('reader123', 10),
      name: '普通读者',
      role: 'reader',
      status: 'active',
      membershipLevel: 'member',
      downloadQuotaDaily: 5,
      downloadCountDaily: 0,
      canComment: true,
      canSubmitRequest: true,
      avatar: 'https://placehold.co/128x128/2563eb/ffffff?text=R'
    }
  });

  const [vscode, figma, notion] = await Promise.all([
    prisma.app.create({
      data: {
        slug: 'visual-studio-code',
        name: 'Visual Studio Code',
        subtitle: '适合开发者的主力编辑器',
        category: '开发',
        icon: '🧩',
        version: '1.88.0',
        size: '180 MB',
        rating: 4.9,
        downloads: '2.3M',
        updatedAt: '2026-03-20',
        compatibility: ['Apple Silicon', 'Intel'],
        platforms: ['macOS', 'Windows', 'Linux'],
        heroImage: 'https://placehold.co/1200x800/1d4ed8/ffffff?text=VS+Code',
        gallery: [
          'https://placehold.co/1200x800/1d4ed8/ffffff?text=VSCode+1',
          'https://placehold.co/1200x800/1d4ed8/ffffff?text=VSCode+2'
        ],
        tags: ['开发', '编辑器', '免费'],
        verified: true,
        editorialScore: 98,
        pricing: '免费',
        summary: '面向开发者的主力编辑器，插件生态成熟，适合日常编码和团队协作。',
        highlights: ['插件丰富', 'Git 集成', '调试能力强', '跨平台'],
        requirements: ['macOS 13+'],
        review: '稳定、成熟、上手快，适合大多数开发场景。',
        featured: true,
        status: 'published',
        accessLevel: 'free',
        isDownloadable: true,
        downloadUrl: 'https://example.com/download/vscode',
        downloadLinks: [
          { name: '百度网盘', url: 'https://example.com/download/vscode/baidu' },
          { name: '夸克网盘', url: 'https://example.com/download/vscode/kuaike' },
          { name: '迅雷网盘', url: 'https://example.com/download/vscode/xunlei' }
        ],
        seoTitle: 'Visual Studio Code 下载与评测',
        seoDescription: 'Visual Studio Code 的下载、评测、版本和使用建议。',
        authorId: admin.id
      }
    }),
    prisma.app.create({
      data: {
        slug: 'figma',
        name: 'Figma',
        subtitle: '在线协作设计工具',
        category: '设计',
        icon: '🎨',
        version: 'Web',
        size: 'Cloud',
        rating: 4.8,
        downloads: '1.8M',
        updatedAt: '2026-03-18',
        compatibility: ['All Platforms'],
        platforms: ['macOS', 'Web'],
        heroImage: 'https://placehold.co/1200x800/f59e0b/ffffff?text=Figma',
        gallery: ['https://placehold.co/1200x800/f59e0b/ffffff?text=Design+1'],
        tags: ['设计', '协作', '界面'],
        verified: true,
        editorialScore: 95,
        pricing: '免费/Pro',
        summary: '以协作为核心的界面设计工具，适合产品、设计和开发团队一起使用。',
        highlights: ['实时协作', '组件系统', '原型预览', '浏览器可用'],
        requirements: ['现代浏览器'],
        review: '团队协作体验非常强，是设计流程里很稳的一环。',
        featured: true,
        status: 'published',
        accessLevel: 'member',
        isDownloadable: true,
        downloadUrl: 'https://example.com/download/figma',
        downloadLinks: [
          { name: '百度网盘', url: 'https://example.com/download/figma/baidu' },
          { name: '夸克网盘', url: 'https://example.com/download/figma/kuaike' },
          { name: '迅雷网盘', url: 'https://example.com/download/figma/xunlei' }
        ],
        seoTitle: 'Figma 下载与评测',
        seoDescription: 'Figma 的下载、评测、版本和使用建议。',
        authorId: admin.id
      }
    }),
    prisma.app.create({
      data: {
        slug: 'notion',
        name: 'Notion',
        subtitle: '知识和任务管理空间',
        category: '效率',
        icon: '🗂️',
        version: '2.40.0',
        size: '120 MB',
        rating: 4.7,
        downloads: '1.5M',
        updatedAt: '2026-03-15',
        compatibility: ['Apple Silicon', 'Intel'],
        platforms: ['macOS', 'iOS', 'Web'],
        heroImage: 'https://placehold.co/1200x800/16a34a/ffffff?text=Notion',
        gallery: ['https://placehold.co/1200x800/16a34a/ffffff?text=Workspace'],
        tags: ['笔记', '任务', 'wiki'],
        verified: true,
        editorialScore: 92,
        pricing: '免费/订阅',
        summary: '把笔记、数据库、任务和团队协作整合到一起的工作空间。',
        highlights: ['模块灵活', '模板丰富', '多端同步', '适合知识库'],
        requirements: ['macOS 12+'],
        review: '适合需要把信息和任务放在一起管理的人。',
        featured: true,
        status: 'published',
        accessLevel: 'premium',
        isDownloadable: true,
        downloadUrl: 'https://example.com/download/notion',
        downloadLinks: [
          { name: '百度网盘', url: 'https://example.com/download/notion/baidu' },
          { name: '夸克网盘', url: 'https://example.com/download/notion/kuaike' },
          { name: '迅雷网盘', url: 'https://example.com/download/notion/xunlei' }
        ],
        seoTitle: 'Notion 下载与评测',
        seoDescription: 'Notion 的下载、评测、版本和使用建议。',
        authorId: admin.id
      }
    })
  ]);

  const [vscodePost, figmaPost, notionPost] = await Promise.all([
    prisma.post.create({
      data: {
        slug: 'best-development-apps-for-mac-2026',
        title: '2026 年开发者最值得装的 Mac 应用',
        excerpt: '这份清单覆盖编辑器、效率工具和协作工具，适合新机初始化。',
        content: '<h1>2026 年开发者最值得装的 Mac 应用</h1><p>这是一份可以直接落地的实用清单。</p>',
        category: '技术分享',
        author: '系统管理员',
        coverImage: 'https://placehold.co/1200x800/1d4ed8/ffffff?text=Dev+Apps',
        relatedAppSlug: vscode.slug,
        featured: true,
        readingTime: '8 分钟',
        dateLabel: '2026 年 3 月',
        publishedAt: '2026-03-20',
        status: 'published',
        seoTitle: '2026 开发者 Mac 应用推荐',
        seoDescription: '开发者常用 Mac 应用清单。',
        authorId: admin.id
      }
    }),
    prisma.post.create({
      data: {
        slug: 'figma-beginner-guide',
        title: 'Figma 入门完全指南',
        excerpt: '从零开始认识 Figma 的核心用法和团队协作方式。',
        content: '<h1>Figma 入门完全指南</h1><p>适合刚接触设计工具的人。</p>',
        category: '使用教程',
        author: '系统管理员',
        coverImage: 'https://placehold.co/1200x800/f59e0b/ffffff?text=Figma+Guide',
        relatedAppSlug: figma.slug,
        featured: true,
        readingTime: '10 分钟',
        dateLabel: '2026 年 3 月',
        publishedAt: '2026-03-18',
        status: 'published',
        seoTitle: 'Figma 入门指南',
        seoDescription: 'Figma 的入门和协作基础。',
        authorId: admin.id
      }
    }),
    prisma.post.create({
      data: {
        slug: 'notion-organization-workflow',
        title: 'Notion 适合怎样的工作流',
        excerpt: '把知识库、任务和项目放在一起后，工作会更清晰。',
        content: '<h1>Notion 适合怎样的工作流</h1><p>适合信息密度高的团队和个人。</p>',
        category: '效率方法',
        author: '系统管理员',
        coverImage: 'https://placehold.co/1200x800/16a34a/ffffff?text=Notion+Workflow',
        relatedAppSlug: notion.slug,
        featured: false,
        readingTime: '7 分钟',
        dateLabel: '2026 年 3 月',
        publishedAt: '2026-03-16',
        status: 'published',
        seoTitle: 'Notion 工作流',
        seoDescription: 'Notion 的实用工作流建议。',
        authorId: admin.id
      }
    })
  ]);

  await ensureAppCategoriesTable();
  await syncAppCategoriesFromApps();

  await Promise.all([
    prisma.topic.create({
      data: {
        slug: 'productivity-stack',
        title: '效率工具合集',
        description: '把最常用的效率工具放在一起，方便统一查看。',
        coverImage: 'https://placehold.co/1200x800/0f172a/ffffff?text=Productivity',
        status: 'published',
        relatedApps: {
          create: [{ appSlug: notion.slug }]
        },
        relatedPosts: {
          create: [{ postSlug: notionPost.slug }]
        }
      }
    }),
    prisma.topic.create({
      data: {
        slug: 'design-workflow',
        title: '设计工作流',
        description: '设计、协作、交付的常见流程。',
        coverImage: 'https://placehold.co/1200x800/f59e0b/ffffff?text=Design',
        status: 'published',
        relatedApps: {
          create: [{ appSlug: figma.slug }]
        },
        relatedPosts: {
          create: [{ postSlug: figmaPost.slug }]
        }
      }
    })
  ]);

  await Promise.all([
    prisma.comment.create({
      data: {
        contentId: vscode.slug,
        contentType: 'app',
        authorName: '普通读者',
        authorAvatar: reader.avatar,
        content: '这个编辑器还是最稳的主力工具。',
        likes: 12,
        dislikes: 1,
        userId: reader.id,
        appSlug: vscode.slug
      }
    }),
    prisma.comment.create({
      data: {
        contentId: figmaPost.slug,
        contentType: 'post',
        authorName: '普通读者',
        authorAvatar: reader.avatar,
        content: '讲得很清楚，适合新手看。',
        likes: 8,
        dislikes: 0,
        userId: reader.id,
        postSlug: figmaPost.slug
      }
    }),
    prisma.comment.create({
      data: {
        contentId: notion.slug,
        contentType: 'app',
        authorName: '普通读者',
        authorAvatar: reader.avatar,
        content: '这个更适合做知识整理。',
        likes: 5,
        dislikes: 0,
        userId: reader.id,
        appSlug: notion.slug
      }
    })
  ]);

  await Promise.all([
    prisma.softwareRequest.create({
      data: {
        title: '希望补充 Affinity Photo',
        description: '希望站点里可以增加一款轻量但专业的图片编辑工具。',
        authorName: reader.name,
        authorEmail: reader.email,
        status: 'pending',
        userId: reader.id
      }
    }),
    prisma.softwareRequest.create({
      data: {
        title: '建议增加 Raycast 教程',
        description: '希望后续可以补一篇更完整的 Raycast 使用说明。',
        authorName: reader.name,
        authorEmail: reader.email,
        status: 'processing',
        adminReply: '已加入后续内容计划。',
        repliedAt: new Date(),
        userId: reader.id
      }
    })
  ]);

  await Promise.all([
    prisma.hotSearch.create({ data: { keyword: 'figma', type: 'app', count: 128 } }),
    prisma.hotSearch.create({ data: { keyword: 'vscode', type: 'app', count: 105 } }),
    prisma.hotSearch.create({ data: { keyword: 'notion', type: 'app', count: 98 } }),
    prisma.hotSearch.create({ data: { keyword: '设计', type: 'all', count: 86 } }),
    prisma.hotSearch.create({ data: { keyword: '效率工具', type: 'all', count: 75 } })
  ]);

  console.log('种子数据初始化完成');
  console.log('默认管理员: admin / admin123');
  console.log('默认读者: reader / reader123');
}

main()
  .catch((error) => {
    console.error('初始化失败', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
