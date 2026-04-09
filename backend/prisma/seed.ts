import bcrypt from 'bcryptjs'
import prisma from '../src/utils/prisma.js'

async function main() {
  console.log('Seeding database...')

  // 1. Admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@triangle-portal.com',
      password: adminPassword,
      name: '系统管理员',
      role: 'admin',
      status: 'active',
      membershipLevel: 'free',
      avatar: '/avatars/defaults/avatar-02.png',
      gender: 'other',
    },
  })
  console.log('Created admin user:', admin.username)

  // 2. Sample apps (software)
  const apps = [
    {
      slug: 'chrome',
      name: 'Google Chrome',
      subtitle: '快速、安全的网络浏览器',
      category: '浏览器',
      icon: 'https://placehold.co/128x128/f59e0b/ffffff?text=CH',
      version: '134.0.6998.88',
      size: '112 MB',
      rating: 4.8,
      downloads: '10,000,000+',
      updatedAt: '2026-03-15',
      compatibility: ['Windows 10+', 'macOS 10.15+', 'Linux'],
      platforms: ['Windows', 'macOS', 'Linux'],
      heroImage: 'https://placehold.co/1200x630/111827/ffffff?text=Chrome',
      displayMode: 'cover',
      gallery: [],
      tags: ['浏览器', 'Google', '网络'],
      verified: true,
      pricing: '免费',
      summary: 'Google Chrome 是全球最受欢迎的网络浏览器，以其速度、安全性和简洁的界面著称。',
      highlights: ['超快页面加载速度', '强大的安全保护', '丰富的扩展生态'],
      requirements: ['系统：Windows 10 及以上', '内存：至少 2GB RAM', '硬盘：至少 500MB 可用空间'],
      featured: true,
      status: 'published',
      accessLevel: 'free',
      isDownloadable: true,
      downloadUrl: 'https://dl.google.com/chrome/install/standalone/chrome_installer.exe',
      downloadLinks: [
        { name: '官方下载', url: 'https://dl.google.com/chrome/install/standalone/chrome_installer.exe', platform: 'Windows' },
        { name: 'macOS 版', url: 'https://dl.google.com/chrome/mac/stable/GGRO/googlechrome.dmg', platform: 'macOS' },
      ],
      affiliateLink: 'https://www.example.com/chrome-affiliate',
    },
    {
      slug: 'vscode',
      name: 'Visual Studio Code',
      subtitle: '代码编辑器的标杆',
      category: '开发工具',
      icon: 'https://placehold.co/128x128/2563eb/ffffff?text=VS',
      version: '1.96.0',
      size: '95 MB',
      rating: 4.9,
      downloads: '5,000,000+',
      updatedAt: '2026-03-20',
      compatibility: ['Windows 10+', 'macOS 10.15+', 'Linux'],
      platforms: ['Windows', 'macOS', 'Linux'],
      displayMode: 'cover',
      gallery: [],
      tags: ['IDE', '代码编辑器', 'Microsoft'],
      verified: true,
      pricing: '免费',
      summary: 'VS Code 是一款由微软开发的轻量级但功能强大的源代码编辑器，支持智能提示和调试。',
      highlights: ['智能代码补全', '内置 Git 集成', '支持千种扩展'],
      requirements: ['系统：Windows 10 及以上', '内存：至少 1GB RAM'],
      featured: true,
      status: 'published',
      accessLevel: 'free',
      isDownloadable: true,
      downloadUrl: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64',
      downloadLinks: [
        { name: 'Windows 用户安装包', url: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64', platform: 'Windows' },
        { name: 'macOS 版', url: 'https://code.visualstudio.com/sha/download?build=stable&os=darwin', platform: 'macOS' },
        { name: 'Linux 版', url: 'https://code.visualstudio.com/sha/download?build=stable&os=linux-x64', platform: 'Linux' },
      ],
    },
    {
      slug: 'notion',
      name: 'Notion',
      subtitle: 'All-in-one 工作空间',
      category: '效率工具',
      icon: 'https://placehold.co/128x128/111827/ffffff?text=NO',
      version: '4.0.0',
      size: '68 MB',
      rating: 4.7,
      downloads: '3,000,000+',
      updatedAt: '2026-02-28',
      compatibility: ['Windows 10+', 'macOS 10.15+', 'Web', 'iOS', 'Android'],
      platforms: ['Windows', 'macOS', 'Web', 'iOS', 'Android'],
      displayMode: 'cover',
      gallery: [],
      tags: ['笔记', '协作', '知识管理'],
      verified: true,
      pricing: '免费/付费',
      summary: 'Notion 将笔记、任务、数据库和协作工具整合在一个简洁的界面中，是个人和团队效率的利器。',
      highlights: ['灵活的模板系统', '强大的数据库功能', '实时协作'],
      requirements: ['系统：Windows 10 及以上', '内存：至少 2GB RAM'],
      featured: false,
      status: 'published',
      accessLevel: 'free',
      isDownloadable: true,
      downloadUrl: 'https://www.notion.so/desktop',
      downloadLinks: [
        { name: 'Windows 版', url: 'https://www.notion.so/desktop/windows', platform: 'Windows' },
        { name: 'macOS 版', url: 'https://www.notion.so/desktop/mac', platform: 'macOS' },
      ],
    },
    {
      slug: 'figma',
      name: 'Figma',
      subtitle: '协作界面设计工具',
      category: '设计工具',
      icon: 'https://placehold.co/128x128/ec4899/ffffff?text=FI',
      version: '2026.001',
      size: '120 MB',
      rating: 4.8,
      downloads: '2,000,000+',
      updatedAt: '2026-03-01',
      compatibility: ['Web', 'Windows 10+', 'macOS 11+'],
      platforms: ['Web', 'Windows', 'macOS'],
      displayMode: 'cover',
      gallery: [],
      tags: ['UI设计', '原型', '协作'],
      verified: true,
      pricing: '免费/付费',
      summary: 'Figma 是一款基于云端的协作界面设计工具，团队成员可以实时共同编辑同一份设计稿。',
      highlights: ['实时协作', '跨平台支持', '丰富的设计资源'],
      requirements: ['系统：Windows 10 及以上', '内存：至少 4GB RAM'],
      featured: true,
      status: 'published',
      accessLevel: 'free',
      isDownloadable: true,
      downloadUrl: 'https://www.figma.com/download/desktop/win',
      downloadLinks: [
        { name: 'Windows 版', url: 'https://www.figma.com/download/desktop/win', platform: 'Windows' },
        { name: 'macOS 版', url: 'https://www.figma.com/download/desktop/mac', platform: 'macOS' },
      ],
    },
    {
      slug: 'obsidian',
      name: 'Obsidian',
      subtitle: '知识图谱笔记应用',
      category: '效率工具',
      icon: 'https://placehold.co/128x128/7c3aed/ffffff?text=OB',
      version: '1.8.0',
      size: '115 MB',
      rating: 4.9,
      downloads: '1,500,000+',
      updatedAt: '2026-03-10',
      compatibility: ['Windows 10+', 'macOS 10.15+', 'Linux'],
      platforms: ['Windows', 'macOS', 'Linux'],
      displayMode: 'cover',
      gallery: [],
      tags: ['笔记', '知识管理', 'Markdown'],
      verified: true,
      pricing: '免费/付费',
      summary: 'Obsidian 是一款本地优先的笔记应用，以 Markdown 为基础，支持双向链接和知识图谱。',
      highlights: ['本地存储保护隐私', '双向链接构建知识网络', '高度可定制'],
      requirements: ['系统：Windows 10 及以上', '内存：至少 4GB RAM', '硬盘：至少 300MB 可用空间'],
      featured: false,
      status: 'published',
      accessLevel: 'free',
      isDownloadable: true,
      downloadUrl: 'https://obsidian.md/download',
      downloadLinks: [
        { name: 'Windows 安装包', url: 'https://obsidian.md/download?platform=windows', platform: 'Windows' },
        { name: 'macOS 版', url: 'https://obsidian.md/download?platform=macos', platform: 'macOS' },
        { name: 'Linux 版', url: 'https://obsidian.md/download?platform=linux', platform: 'Linux' },
      ],
    },
  ]

  for (const appData of apps) {
    const app = await prisma.app.upsert({
      where: { slug: appData.slug },
      update: {},
      create: {
        ...appData,
        compatibility: JSON.stringify(appData.compatibility),
        platforms: JSON.stringify(appData.platforms),
        gallery: JSON.stringify(appData.gallery),
        tags: JSON.stringify(appData.tags),
        highlights: JSON.stringify(appData.highlights),
        requirements: JSON.stringify(appData.requirements),
        downloadLinks: appData.downloadLinks ? JSON.stringify(appData.downloadLinks) : undefined,
        authorId: admin.id,
      },
    })
    console.log('Created app:', app.name)
  }

  // 3. Sample posts (articles)
  const posts = [
    {
      slug: 'best-free-software-2026',
      title: '2026年最佳免费软件推荐清单',
      excerpt: '精心挑选了一批高质量免费软件，覆盖日常使用、开发和设计需求。',
      content: '## 浏览器Chrome 依然是最佳选择。...',
      category: '软件推荐',
      author: 'Triangle 编辑组',
      coverImage: 'https://placehold.co/1200x630/0f172a/ffffff?text=Best+Free+Software',
      displayMode: 'cover',
      featured: true,
      readingTime: '8 分钟',
      dateLabel: '2026-03-20',
      publishedAt: '2026-03-20',
      status: 'published',
    },
    {
      slug: 'vscode-extensions-guide',
      title: 'VS Code 必装扩展推荐',
      excerpt: '这 10 个扩展能让你的 VS Code 使用体验提升一个档次。',
      content: '## 扩展推荐...',
      category: '开发工具',
      author: 'Triangle 编辑组',
      coverImage: 'https://placehold.co/1200x630/1d4ed8/ffffff?text=VSCode+Extensions',
      displayMode: 'cover',
      featured: false,
      readingTime: '6 分钟',
      dateLabel: '2026-03-15',
      publishedAt: '2026-03-15',
      status: 'published',
    },
    {
      slug: 'knowledge-management-tools',
      title: '知识管理工具横评：Notion vs Obsidian',
      excerpt: '两大主流知识管理工具全方位对比，帮助你选择最适合的那一款。',
      content: '## Notion vs Obsidian...',
      category: '效率工具',
      author: 'Triangle 编辑组',
      coverImage: 'https://placehold.co/1200x630/16a34a/ffffff?text=Knowledge+Tools',
      displayMode: 'cover',
      featured: true,
      readingTime: '12 分钟',
      dateLabel: '2026-03-10',
      publishedAt: '2026-03-10',
      status: 'published',
    },
    {
      slug: 'figma-for-beginners',
      title: 'Figma 入门指南：从小白到上手',
      excerpt: '手把手教你快速掌握 Figma 的核心操作，开始你的 UI 设计之旅。',
      content: '## Figma 入门...',
      category: '设计工具',
      author: 'Triangle 编辑组',
      coverImage: 'https://placehold.co/1200x630/f97316/ffffff?text=Figma+Beginners',
      displayMode: 'cover',
      featured: false,
      readingTime: '10 分钟',
      dateLabel: '2026-03-05',
      publishedAt: '2026-03-05',
      status: 'published',
    },
    {
      slug: 'chrome-tips-tricks',
      title: 'Chrome 进阶使用技巧',
      excerpt: '这些 Chrome 隐藏功能，大多数人可能都不知道。',
      content: '## Chrome 技巧...',
      category: '软件教程',
      author: 'Triangle 编辑组',
      coverImage: 'https://placehold.co/1200x630/334155/ffffff?text=Chrome+Tips',
      displayMode: 'cover',
      featured: false,
      readingTime: '5 分钟',
      dateLabel: '2026-02-28',
      publishedAt: '2026-02-28',
      status: 'published',
    },
  ]

  for (const postData of posts) {
    const post = await prisma.post.upsert({
      where: { slug: postData.slug },
      update: {},
      create: {
        ...postData,
        authorId: admin.id,
      },
    })
    console.log('Created post:', post.title)
  }

  // 4. Hot searches
  const hotSearches = [
    { keyword: 'chrome', type: 'app', count: 128 },
    { keyword: 'vscode', type: 'app', count: 105 },
    { keyword: 'notion', type: 'app', count: 98 },
    { keyword: 'figma', type: 'app', count: 87 },
    { keyword: '设计', type: 'all', count: 86 },
    { keyword: '效率工具', type: 'all', count: 75 },
    { keyword: 'obsidian', type: 'app', count: 65 },
    { keyword: '浏览器', type: 'app', count: 58 },
    { keyword: '开发工具', type: 'app', count: 52 },
    { keyword: '笔记', type: 'all', count: 48 },
  ]

  for (const search of hotSearches) {
    await prisma.hotSearch.upsert({
      where: { keyword: search.keyword },
      update: { count: search.count },
      create: search,
    })
  }
  console.log('Created hot searches')

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
