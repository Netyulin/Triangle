# Triangle 项目交接文档

> 小众软件、工具、游戏资讯聚合与下载站

---

## 一、项目业务定位（AI 必须理解）

1.  **网站定位**：小众软件、工具、游戏、资源资讯聚合与下载站
2.  **核心内容**：软件介绍、版本更新、资源盘点、使用教程、下载链接
3.  **目标用户**：极客、工具爱好者、怀旧用户、需要小众资源的用户
4.  **盈利模式**：
    - 广告变现（页面广告、贴片广告、下载页广告）
    - 网盘联盟/下载返利
    - 会员机制（高速下载、无广告、专属资源）
    - 捐赠/赞助
5.  **风格**：简洁、轻量化、加载快、适合长期运营与SEO

---

## 二、AI 接手强制规则

1.  所有修改必须定位到具体文件路径，不虚构不存在的文件。
2.  给出代码必须完整可替换，禁止省略、禁止伪代码、禁止用 `...` 省略。
3.  功能、需求、Bug 必须对应到页面/组件/接口。
4.  Todo 必须标注优先级、难度、涉及文件、是否影响盈利。
5.  输出格式为 Markdown，结构清晰，方便长期维护。
6.  后续对话中，让改代码就直接给完整代码；让加功能就给方案+代码。
7.  页面上所有用户可见文字必须使用简体中文；除非用户明确要求其他语言，否则禁止输出英文、繁体中文或混合语言页面文案。

---

## 三、技术架构

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | Next.js 16.2.0 | React 框架 |
| **React版本** | React 19 | 最新稳定版 |
| **路由方案** | App Router | 基于 `app/` 目录的Next.js新路由 |
| **样式方案** | Tailwind CSS v3.4.0 + PostCSS v8.4 | Utility-first CSS框架，需要`tailwind.config.js`配置文件 |
| **UI组件库** | shadcn/ui + Radix UI | 轻量无样式组件库 |
| **图标库** | Lucide React | 简约SVG图标 |
| **请求方案** | 原生 fetch + 自定义封装 | 轻量级请求封装 |
| **表单处理** | react-hook-form + Zod | 类型安全的表单验证 |
| **富文本编辑** | Tiptap | 现代化富文本编辑器 |
| **状态管理** | React Context + localStorage | 轻量级状态管理 |
| **语言** | TypeScript | 类型安全 |
| **后端框架** | Express.js 5.2.1 | Node.js Web框架 |
| **数据库** | SQLite | 轻量级文件数据库 |
| **ORM** | Prisma 7.6.0 | 现代化数据库ORM |
| **认证** | JWT + bcryptjs | Token认证 + 密码加密 |
| **API文档** | Swagger/OpenAPI | 自动生成API文档 |
| **文件上传** | multer | 多功能文件上传 |
| **构建命令** |
| 安装依赖 | `npm install` | 必须使用npm，避免pnpm虚拟存储路径冲突 |
| 开发前端 | `cd Frontend && npm run dev` | 端口 3004，必须清理环境变量`TURBOPACK=1`，否则与`--webpack`参数冲突 |
| 构建前端 | `npm run build` | 生产构建 |
| 启动前端 | `npm start` | 生产服务，端口 3004 |
| 开发后端 | `npm run dev` | tsx watch 热更新，端口默认58085（自动分配为56197） |
| 启动后端 | `npm start` | 生产启动 |
| 数据库迁移 | `npx prisma migrate dev` | 执行迁移 |
| 生成Prisma客户端 | `npx prisma generate` | 生成客户端代码 |
| 端口占用清理 | Windows: `netstat -ano | findstr :<端口> && taskkill /F /PID <PID>` | 解决端口冲突问题 |
| **部署** | 支持静态导出/Vercel/服务器托管 | 灵活部署 |
| **SEO** | 支持Meta标签、结构化数据、站点地图 | 搜索引擎友好 |
| **环境依赖** | Node.js 20+ + npm 10+ | 不推荐使用pnpm/yarn，避免虚拟路径冲突 |
| **已知问题解决** | 1. 前端启动报错: 模块找不到/PostCSS配置错误 → 先清理`Frontend/.next`缓存再重启<br>2. TURBOPACK与webpack冲突 → 清理环境变量`TURBOPACK=1`<br>3. Tailwind v4与webpack不兼容 → 已降级到v3.4.0<br>4. CORS跨域问题 → 后端`.env`配置`CORS_ORIGIN=http://localhost:3004` | 常见启动问题解决方法 |

---

## 三点五、2026-04-03 本地启动补充记录

1.  **后端依赖修复**：本地 `backend/node_modules` 曾出现缺失 `tsx` 可执行文件的情况，表现为执行 `npm run dev` / `npm start` 时提示 `'tsx' 不是内部或外部命令`。已在 `backend/` 目录重新执行 `npm install` 修复。
    同时 `backend/package-lock.json` 已随本次安装刷新，若后续提交代码请一并关注该文件变更是否保留。
2.  **前后端联调地址同步**：前端环境变量文件 `Frontend/.env.local` 已将 `NEXT_PUBLIC_API_BASE_URL` 从 `http://localhost:56197` 更新为 `http://localhost:58085`，与后端 `.env` 中的 `PORT=58085` 保持一致。
3.  **前端启动副作用**：首次执行 Next.js 开发服务后，框架会自动更新 `Frontend/tsconfig.json` 与 `Frontend/next-env.d.ts`。这不是业务代码调整，但属于运行后产生的本地文件变更。
4.  **当前本地启动结果**：前端开发服务地址为 `http://localhost:3004`，后端服务地址为 `http://localhost:58085`，健康检查地址为 `http://localhost:58085/health`。
5.  **SQLite 路径解析修正**：为避免项目换目录后出现“像是数据丢失”的情况，`backend/prisma.config.ts` 与 `backend/src/utils/prisma.js` 已统一改为基于 `backend/` 目录解析 `DATABASE_URL=file:./prisma/dev.db`。现在无论从哪个工作目录启动，只要项目整体搬迁，都会稳定指向 `backend/prisma/dev.db`。
6.  **前端深色模式修复**：`Frontend/app/software/layout.tsx` 和 `Frontend/app/software/[slug]/layout.tsx` 已移除嵌套的 `html/body`，避免进入软件库时把根布局主题类弄乱。
7.  **分类拖拽修复**：`Frontend/app/admin/app-categories/page.tsx` 的拖拽保存改为同时依赖 `dataTransfer` 和 ref，降低 `dragend`/`drop` 事件顺序导致的丢源问题。
8.  **样式编译修复**：`Frontend/app/globals.css` 的 `.admin-panel` 不再使用 `bg-card/88`，改为显式 `background-color`，避免 Tailwind/PostCSS 编译报错。
9.  **导航分类菜单修复**：`Frontend/components/navbar.tsx` 的软件库/文章分类下拉已改成“当前位于该栏目时默认展开”，避免进入 `/software` 或 `/articles` 后看不到分类子菜单。

---

## 四、项目目录结构 + 用途说明

```
D:\Claudecode\Triangle\
├── Frontend/                      # 前端项目 
│   ├── app/                       # App Router 路由目录 ★入口
│   │   ├── admin/                 # 管理后台路由
│   │   │   ├── account/           # 账户管理
│   │   │   ├── app-categories/   # 软件分类管理
│   │   │   ├── apps/             # 软件管理
│   │   │   ├── invite-codes/     # 邀请码管理
│   │   │   ├── netdisk-reports/  # 网盘报告管理
│   │   │   ├── posts/            # 文章管理
│   │   │   ├── settings/         # 站点设置
│   │   │   ├── submissions/      # 提交审核
│   │   │   ├── topics/           # 专题管理
│   │   │   ├── layout.tsx        # 后台布局
│   │   │   └── page.tsx           # 后台首页
│   │   ├── articles/              # 文章公网路由
│   │   │   ├── [slug]/            # 文章详情页
│   │   │   └── page.tsx           # 文章列表页
│   │   ├── login/                 # 登录页
│   │   ├── profile/               # 用户个人中心
│   │   ├── register/              # 注册页
│   │   ├── requests/              # 需求提交页
│   │   ├── search/                # 搜索页
│   │   ├── software/              # 软件库路由
│   │   │   ├── [slug]/            # 软件详情页
│   │   │   ├── layout.tsx         # 软件库布局
│   │   │   └── page.tsx           # 软件列表页
│   │   ├── layout.tsx             # 根布局 ★入口布局
│   │   └── page.tsx               # 首页 ★入口页面
│   ├── components/                # React 公共组件
│   │   ├── admin/                 # 后台管理组件
│   │   ├── ui/                    # shadcn/ui 基础组件
│   │   ├── app-icon.tsx           # 应用图标
│   │   ├── app-provider.tsx       # 应用全局Provider
│   │   ├── avatar-picker.tsx      # 头像选择器
│   │   ├── footer.tsx             # 页脚组件
│   │   ├── navbar.tsx             # 导航栏组件
│   │   ├── site-logo.tsx          # 站点Logo
│   │   └── theme-provider.tsx     # 主题切换Provider
│   ├── hooks/                     # 自定义 Hooks
│   │   ├── use-mobile.ts          # 移动端检测
│   │   └── use-toast.ts           # Toast提示Hook
│   ├── lib/                       # 工具库
│   │   ├── admin-api.ts           # 后台管理API封装
│   │   ├── api.ts                 # 前端通用API封装
│   │   ├── avatar-presets.ts      # 头像预设
│   │   ├── avatar-random.ts       # 随机头像生成
│   │   ├── i18n.ts                # 国际化工具
│   │   └── utils.ts               # 通用工具函数
│   ├── public/                    # 静态资源 (图片、图标、文件)
│   ├── styles/                    # 全局样式
│   │   └── globals.css            # 全局CSS入口
│   ├── .env.local                 # 前端环境变量
│   ├── next.config.mjs            # Next.js 配置
│   ├── package.json               # 前端依赖声明
│   ├── postcss.config.mjs         # PostCSS 配置（ES模块格式，Tailwind v4要求）
│   ├── tailwind.config.js         # Tailwind CSS 配置
│   └── tsconfig.json              # TypeScript 配置
├── backend/                        # 后端API服务
│   ├── src/
│   │   ├── controllers/            # 控制器 ★业务逻辑
│   │   │   ├── adminController.js
│   │   │   ├── appCategoryController.js
│   │   │   ├── appController.js
│   │   │   ├── assetController.js
│   │   │   ├── authController.js
│   │   │   ├── commentController.js
│   │   │   ├── homeController.js
│   │   │   ├── inviteCodeController.js
│   │   │   ├── netdiskReportController.js
│   │   │   ├── postCategoryController.js
│   │   │   ├── postController.js
│   │   │   ├── requestController.js
│   │   │   ├── searchController.js
│   │   │   ├── settingsController.js
│   │   │   └── topicController.js
│   │   ├── middleware/            # Express 中间件
│   │   │   ├── auth.js            # JWT认证中间件
│   │   │   ├── authRateLimit.js   # 登录限流
│   │   │   ├── errorHandler.js    # 错误处理
│   │   │   └── validate.js        # 数据验证
│   │   ├── routes/                # 路由定义
│   │   │   ├── admin.js
│   │   │   ├── apps.js
│   │   │   ├── assets.js
│   │   │   ├── auth.js
│   │   │   ├── comments.js
│   │   │   ├── home.js
│   │   │   ├── posts.js
│   │   │   ├── requests.js
│   │   │   ├── search.js
│   │   │   ├── settings.js
│   │   │   └── topics.js
│   │   ├── utils/                 # 工具函数
│   │   │   ├── appCategories.js
│   │   │   ├── assetStorage.js
│   │   │   ├── contentImport.js
│   │   │   ├── imageLocalization.js
│   │   │   ├── inviteCodes.js
│   │   │   ├── passwordPolicy.js
│   │   │   ├── postCategories.js
│   │   │   ├── prisma.js
│   │   │   ├── response.js
│   │   │   ├── serializers.js
│   │   │   ├── siteSettings.js
│   │   │   └── userFeatures.js
│   │   ├── prisma/               # Prisma相关
│   │   ├── models/               # 数据模型
│   │   ├── migrations/           # 数据库迁移
│   │   ├── generated/            # 自动生成代码
│   │   └── index.ts              # 后端服务入口 ★
│   ├── prisma/                    # Prisma配置
│   │   └── schema.prisma          # 数据模型定义
│   ├── uploads/                   # 文件上传目录
│   ├── API_DOCS.md               # API文档
│   ├── DEPLOYMENT.md             # 部署文档
│   ├── package.json              # 后端依赖
│   ├── swagger.yaml              # Swagger API规范
│   └── .env                      # 后端环境变量
├── test.png                       # 测试图片
└── PROJECT_HANDOVER.md           # 本文档 (项目交接文档)
```

**关键文件标记：**
- 前端入口：`Frontend/app/page.tsx` + `Frontend/app/layout.tsx`
- 后端入口：`backend/src/index.ts`
- 数据库模型：`backend/prisma/schema.prisma`
- API封装：`Frontend/lib/api.ts` + `Frontend/lib/admin-api.ts`
- 全局样式：`Frontend/styles/globals.css`

---

## 五、页面架构与路由

| 路由 | 页面 | 功能说明 | 访问权限 |
|------|------|----------|----------|
| `/` | 首页 | 英雄轮播、统计卡片、编辑推荐文章、阅读推荐、软件下载排行、快速入口 | 公开 |
| `/articles` | 文章列表页 | 文章列表、分类筛选、分页、搜索 | 公开 |
| `/articles/[slug]` | 文章详情页 | 文章内容展示、作者信息、相关推荐、评论区、广告位 | 公开 |
| `/software` | 软件库列表 | 软件卡片列表、分类筛选、排序(推荐/下载量/更新时间/评分)、搜索 | 公开 |
| `/software/[slug]` | 软件详情页 | 软件介绍、截图展示、版本信息、更新日志、下载区域、相关推荐、评论区、广告位 | 公开 |
| `/requests` | 需求提交页 | 用户提交资源需求表单 | 需要登录 |
| `/search` | 搜索结果页 | 全站搜索、结果分类(文章/软件)、关键词高亮 | 公开 |
| `/login` | 登录页 | 用户登录 | 公开 |
| `/register` | 注册页 | 用户注册（邀请码制） | 公开 |
| `/profile` | 个人中心 | 用户信息、我的收藏、我的需求、我的评论、账户设置 | 需要登录 |
| `/admin` | 后台概览 | 数据统计仪表盘、流量图表、快速操作入口 | 管理员 |
| `/admin/apps` | 软件管理 | 软件列表、CRUD操作 | 管理员 |
| `/admin/apps/new` | 新建软件 | 创建软件表单 | 管理员 |
| `/admin/posts` | 文章管理 | 文章列表、CRUD操作 | 管理员 |
| `/admin/posts/new` | 新建文章 | 创建文章表单 | 管理员 |
| `/admin/topics` | 专题管理 | 专题管理 | 管理员 |
| `/admin/app-categories` | 分类管理 | 软件分类管理 | 管理员 |
| `/admin/comments` | 评论管理 | 评论审核、删除 | 管理员 |
| `/admin/requests` | 需求管理 | 用户需求审核处理 | 管理员 |
| `/admin/submissions` | 提交审核 | 用户投稿审核 | 管理员 |
| `/admin/invite-codes` | 邀请码管理 | 生成/管理邀请码 | 管理员 |
| `/admin/netdisk-reports` | 网盘报告 | 失效链接报告管理 | 管理员 |
| `/admin/settings` | 站点设置 | 网站配置管理 | 管理员 |
| `/admin/account` | 账户管理 | 修改密码、账户设置 | 管理员 |

---

## 六、已实现功能列表

### 前端功能

| 模块名 | 功能点 | 对应文件 | 完成状态 |
|--------|--------|----------|----------|
| **首页展示** | 英雄轮播、统计卡片、编辑推荐、下载排行、快速入口 | `Frontend/app/page.tsx` | 已完成 |
| **文章系统** | 文章列表、分类筛选、分页、搜索、详情展示 | `Frontend/app/articles/` | 已完成 |
| **软件库** | 软件列表、分类筛选、多字段排序、搜索、详情展示 | `Frontend/app/software/` | 已完成 |
| **用户系统** | 登录/注册（邀请码制）、JWT认证、权限控制 | `Frontend/app/login/, register/` + `Frontend/lib/api.ts` | 已完成 |
| **个人中心** | 用户信息展示、收藏管理、需求记录、评论列表 | `Frontend/app/profile/page.tsx` | 已完成 |
| **搜索系统** | 全站搜索、结果分类展示、关键词匹配 | `Frontend/app/search/page.tsx` + `backend/src/controllers/searchController.js` | 已完成 |
| **需求系统** | 用户需求提交、状态查看 | `Frontend/app/requests/page.tsx` | 已完成 |
| **主题切换** | 亮色/深色主题切换、持久化保存 | `Frontend/components/theme-provider.tsx` | 已完成 |
| **响应式设计** | PC/平板/移动端自适应布局 | 全局Tailwind配置 | 已完成 |
| **导航栏** | 主导航、移动端汉堡菜单、登录状态展示 | `Frontend/components/navbar.tsx` | 已完成 |
| **页脚** | 站点信息、友情链接、版权信息 | `Frontend/components/footer.tsx` | 已完成 |
| **管理后台** | 仪表盘、内容管理全CRUD、统计图表 | `Frontend/app/admin/` + `Frontend/components/admin/` | 已完成 |
| **国际化** | 多语言支持框架 | `Frontend/lib/i18n.ts` | 已完成 |

### 后端功能

| 模块名 | 功能点 | 对应文件 | 完成状态 |
|--------|--------|----------|----------|
| **API框架** | RESTful API架构、统一错误处理 | `backend/src/index.ts` + `middleware/errorHandler.js` | 已完成 |
| **用户认证** | JWT生成验证、密码加密、权限中间件 | `controllers/authController.js` + `middleware/auth.js` | 已完成 |
| **邀请码注册** | 邀请码生成、验证、使用记录 | `controllers/inviteCodeController.js` | 已完成 |
| **软件管理** | 软件CRUD、分类管理、排序筛选搜索 | `controllers/appController.js` + `appCategoryController.js` | 已完成 |
| **文章管理** | 文章CRUD、分类管理、标签 | `controllers/postController.js` + `postCategoryController.js` | 已完成 |
| **专题管理** | 专题聚合页面 | `controllers/topicController.js` | 已完成 |
| **评论系统** | 用户评论、点赞/点踩、审核删除 | `controllers/commentController.js` | 已完成 |
| **需求管理** | 用户需求提交、状态流转、处理 | `controllers/requestController.js` | 已完成 |
| **搜索功能** | 全站搜索、关键词搜索、热词统计 | `controllers/searchController.js` | 已完成 |
| **文件上传** | 资源图片、封面图上传存储 | `controllers/assetController.js` + `utils/assetStorage.js` | 已完成 |
| **网盘报告** | 失效链接用户上报、管理 | `controllers/netdiskReportController.js` | 已完成 |
| **站点设置** | 站点配置管理、全局设置 | `controllers/settingsController.js` | 已完成 |
| **首页数据** | 首页聚合数据API、推荐内容 | `controllers/homeController.js` | 已完成 |
| **管理后台** | 管理员权限控制、统计数据 | `controllers/adminController.js` | 已完成 |
| **API文档** | Swagger自动文档 | `swagger.yaml` | 已完成 |
| **限流防护** | 登录接口限流防暴力破解 | `middleware/authRateLimit.js` | 已完成 |
| **数据验证** | 请求参数统一验证 | `middleware/validate.js` | 已完成 |

---

## 七、基础需求基线

| 需求 | 状态 | 说明 |
|------|------|------|
| 内容展示：文章列表、详情、分页、分类、标签、搜索 | ✅ 已完成 | 搜索、分类、分页都已实现 |
| 下载功能：下载链接、网盘跳转、外部链接 | ✅ 已完成 | 软件详情页支持多下载链接 |
| SEO 优化：标题、描述、结构化数据 | 🔄 待完善 | Next.js Metadata API已支持，需补全每个页面 |
| 响应式：PC + 移动端适配 | ✅ 已完成 | Tailwind响应式类全覆盖 |
| 广告位：首页、列表页、详情页、下载按钮附近 | ❌ 未开始 | 预留位置但未实现组件化 |
| 访问统计、PV/UV 埋点 | ❌ 未开始 | 后端有统计但前端埋点未完成 |
| 简单防爬：链接加密、跳转过渡页 | ❌ 未开始 | 下载链接直接暴露，需加密跳转 |

---

## 八、TodoList & 待开发需求

| 需求描述 | 优先级 | 难度 | 涉及文件 | 是否影响盈利 | 预期效果 |
|----------|--------|------|----------|--------------|----------|
| 广告位组件封装（支持开关、自定义广告代码） | 🔥 高 | ⭐ 简单 | `Frontend/components/AdSlot.tsx`，各页面 | 是 ✅ | 可统一配置广告，方便后续更换，提升收益 |
| 下载链接加密与跳转中间页 | 🔥 高 | ⭐⭐ 中等 | Frontend: `app/download/[id]/page.tsx`, Backend: `controllers/downloadController.js`, routes/download.js | 是 ✅ | 提升广告曝光，防止直链盗爬，增加跳转页广告 |
| 无广告会员说明 + 购买页面 | 🔥 高 | ⭐⭐ 中等 | Frontend: `app/membership/page.tsx`, 后端需要会员表扩展 | 是 ✅ | 开通会员盈利渠道，满足用户去除广告需求 |
| 软件版本更新提醒模块 | 中 | ⭐ 简单 | Frontend: components/UpdateBadge.tsx, software/[slug]/page.tsx | 否 | 用户直观看到版本更新信息 |
| 热门/最新/推荐排行榜 | 中 | ⭐ 简单 | Frontend: components/RankingList.tsx, 首页、分类页 | 否 | 提升用户发现内容效率 |
| 相关推荐、相关下载模块 | 中 | ⭐ 简单 | Frontend: `components/RelatedContent.tsx`, 详情页底部 | 否 | 增加PV，提升用户停留时间 |
| 收藏/阅读历史 | 中 | ⭐⭐ 中等 | Backend: 用户表扩展收藏字段，Frontend: profile页面 | 否 | 提升用户体验 |
| 捐赠/赞助展示区 | 中 | ⭐ 简单 | Frontend: footer.tsx, about页 | 是 ✅ | 开拓赞助渠道 |
| 简易后台数据同步（文章/软件列表JSON） | 中 | ⭐⭐ 中等 | 后端: export API，前端: ISR增量更新 | 否 | 静态构建时保持内容更新 |
| 防直链、防盗链、简单反爬 | 🔥 高 | ⭐⭐ 中等 | 后端: 下载链接签名验证、Referer检查 | 是 ✅ | 保护下载链接不被盗爬，保障流量和收益 |
| 网站公告、弹窗公告 | 低 | ⭐ 简单 | Frontend: components/Announcement.tsx, 首页 | 否 | 发布重要通知 |
| 网站地图sitemap生成 | 低 | ⭐⭐ 中等 | 后端或Next.js生成sitemap.xml | 否 | 提升SEO收录 |
| RSS订阅输出 | 低 | ⭐⭐ 中等 | 后端API输出RSS XML | 否 | 方便订阅用户获取更新 |

---

## 九、需求完成状态表

| 需求名称 | 状态 | 完成度 | 备注 |
|----------|------|--------|------|
| 核心框架搭建（Next.js + Express + Prisma） | 已完成 | 100% | 项目骨架可运行 |
| 用户系统（登录/注册/权限） | 已完成 | 100% | 邀请码注册已实现 |
| 文章CRUD（后台+前台） | 已完成 | 100% | |
| 软件CRUD（后台+前台） | 已完成 | 100% | |
| 分类管理 | 已完成 | 100% | |
| 评论系统 | 已完成 | 100% | |
| 需求提交系统 | 已完成 | 100% | |
| 全站搜索 | 已完成 | 100% | |
| 管理后台仪表盘 | 已完成 | 90% | 统计图表基本完成 |
| 主题切换（明暗） | 已完成 | 100% | |
| 响应式适配 | 已完成 | 95% | 少数细节待调 |
| **广告位组件封装** | 未开始 | 0% | 待开发，高优先级影响盈利 |
| **下载跳转中间页** | 未开始 | 0% | 待开发，高优先级影响盈利 |
| **链接加密防爬** | 未开始 | 0% | 待开发，高优先级影响盈利 |
| **会员无广告系统** | 未开始 | 0% | 待开发，高优先级影响盈利 |
| SEO Meta标签完善 | 开发中 | 30% | Next.js Metadata已配置，每个页面需补全 |
| 相关推荐模块 | 未开始 | 0% | |
| 收藏/阅读历史 | 未开始 | 0% | |
| 捐赠/赞助展示 | 未开始 | 0% | |
| 网站公告 | 未开始 | 0% | |
| Sitemap生成 | 未开始 | 0% | |

---

## 十、测试要求与验收标准

### 基础功能测试
1.  **所有页面正常渲染、路由正常跳转** - 开发后需验证访问每个页面都能正常打开，链接跳转正确
2.  **响应式在 PC/手机正常** - 使用浏览器开发者工具切换设备尺寸验证布局
3.  **下载链接、广告位可正常展示** - 盈利相关模块必须稳定可用，链接可点击
4.  **页面加载速度、SEO 友好** - Next.js服务端渲染/静态生成，Lighthouse可接受分数
5.  **异常处理：无数据、加载失败、404** - 空状态、错误状态要有友好提示
6.  **盈利相关页面（详情/下载）必须稳定可用** - 这是核心收益来源，不能出问题
7.  **所有UI交互无明显BUG** - 按钮点击、表单提交、模态框弹关都正常工作

### 环境/部署测试
8.  **依赖安装测试** - 执行`npm install`可正常安装所有依赖，无报错
9.  **启动测试** - 前后端可正常启动，端口监听正常，访问首页成功
10. **缓存兼容性测试** - 清理`.next`缓存后可正常重新启动，无配置冲突

---

## 十一、AI 后续协作固定规则

1.  修改页面 → 给出文件路径 + 完整可替换代码
2.  加功能 → 先给实现方案，再给完整代码
3.  排查问题 → 先定位原因，再给修复代码
4.  涉及盈利模块（广告、下载、会员）优先保证稳定
5.  禁止伪代码，禁止省略关键逻辑
6.  代码风格保持项目统一，符合Next.js+React规范
7.  若无必要，勿增实体，保持简洁
8.  所有回复使用简体中文，代码保持原始语言
9.  所有页面上的显示文字必须使用简体中文；包括标题、导航、按钮、表单标签、占位符、提示文案、空状态、错误提示、弹窗文案与表格表头。除非用户明确要求多语言或其他语言，否则不要输出英文或繁体中文页面文案。

---

## 十二、UI/UX 设计更新记录

### 2026-04-03 UI/UX 重构 - 复古极客极简主义

**设计风格：** 复古极客极简主义，深蓝炭灰基调 + 亮蓝色强调，符合极客审美，保持简洁轻量化。

**重构内容：**

| 文件 | 修改内容 |
|------|----------|
| `Frontend/tailwind.config.js` | 完善颜色系统（极客蓝调配色）、字体配置（Inter + JetBrains Mono）、间距和阴影规范 |
| `Frontend/app/globals.css` | 添加CSS变量、自定义组件类（container-custom, card-custom, badge 等）、网格纹理背景工具类 |
| `Frontend/app/layout.tsx` | 引入Google字体预加载，修复meta描述 |
| `Frontend/components/navbar.tsx` | 重构导航栏，提升视觉层次，优化圆角和阴影，改进下拉菜单 |
| `Frontend/components/footer.tsx` | 重构页脚，优化间距和排版 |
| `Frontend/app/page.tsx` | 重构首页，优化卡片间距、圆角、hover效果，改进轮播和布局，调整空状态说明文字 |
| `Frontend/app/software/[slug]/page.tsx` | 重构软件详情页，提升内容可读性，优化信息分组 |
| `Frontend/postcss.config.js` | 保持Tailwind v3标准配置 |

**设计特点：**
- 配色：深蓝炭灰基调 + 亮青蓝强调色，支持明暗双主题
- 字体：Inter 正文阅读 + JetBrains Mono 代码感点缀，从Google Fonts预加载
- 容器：`container-custom` 限制最大宽度 1200px，自动居中，避免宽屏内容过于分散
- 细节：细微网格背景纹理、干净圆角、细腻阴影层次、hover微动效
- 空间：清晰信息分组、适度留白、符合极客审美内容密度

### 2026-04-03 UI 宽度修复 + 文字优化

**修改内容：**

| 文件 | 修改内容 |
|------|----------|
| `Frontend/app/globals.css` | 添加 `container-custom` 自定义容器类，限制最大宽度 `1200px`，自动居中，解决宽屏显示器内容拉伸问题 |
| `Frontend/app/page.tsx` | 调整空状态说明文字，更贴合小众软件下载站的项目定位 |

**修复问题：**
- 导航栏和首页内容拉伸到全屏宽度，宽屏显示器左右空白过大
- 说明文字不够贴合项目业务定位

---

## 十二、未修复问题


**前端页面** 深色模式下点击导航栏软件库或者软件库下方的任意菜单，就会变成浅色模式，这时候再点击其他导航页同样也是浅色模式。
**管理后台** 分类管理中拖动会报错，不能保存。


## 十三、开发环境与生产环境

**开发环境:**Windows

**生产环境:**Linux

**本行提示存在的情况下就表明现在处于开发环境中**


---

## 2026-04-08 全局设计规划

详见 Obsidian 知识库文档：
**`Triangle项目全景设计文档.md`** — 包含全项目现状诊断、四阶段路线图、文件归属表、立即行动项。

**商业模式已确认：Google AdSense + CPS 联盟**
- 不需要广告管理后台（AdSense 自动管理广告内容）
- 核心任务：AdSense 代码位植入 + CPS 联盟链接跟踪中间页
- 广告收入：Google AdSense 按展示/点击付费
- 下载返利：CPS 联盟跟踪链接，用户下载后结算返利

详细规划见 Obsidian 文档。

---

*文档生成时间：2026-04-03 | 最近更新：2026-04-08（全项目全景设计规划）*

---

## 2026-04-08 �������������¼

### 1. ����ģ����״̬�ھ�

- ������ Prisma Ǩ�ƣ�
  - `backend/prisma/migrations/20260408030157_add_notifications_and_user_controls/`
- �û������ֶΣ�
  - `canReply`
  - `bannedUntil`
  - `banReason`
- ����ģ�ͣ�
  - `Notification`
  - `NotificationTemplate`
- ��Ա�ȼ�ͳһ�ھ���
  - `free`
  - `sponsor`
  - `lifetime`
  - `supreme`
- ��ֵ����ӳ�䣺
  - `member -> sponsor`
  - `premium -> lifetime`
  - `vip -> supreme`
- ����״̬ͳһ�տڣ�
  - `published`
  - `hidden`
  - `archived`
- ����ʧЧ����״̬��
  - `pending`
  - `handled`

### 2. ��������/�����ӿ�

- �û�֪ͨ��
  - `GET /api/notifications`
  - `GET /api/notifications/unread-count`
  - `PATCH /api/notifications/read-all`
  - `PATCH /api/notifications/:id/read`
  - `DELETE /api/notifications/:id`
- ��̨�û�������
  - `GET /api/admin/users`
  - `GET /api/admin/users/levels`
  - `PATCH /api/admin/users/:id`
  - `PATCH /api/admin/users/:id/password`
  - `DELETE /api/admin/users/:id`
- ��̨վ������ģ�壺
  - `GET /api/admin/notification-templates`
  - `PUT /api/admin/notification-templates/:key`
  - `POST /api/admin/notifications/send`
  - `POST /api/admin/notifications/users/:id`
- ר������ѡ������
  - `GET /api/admin/content-picker/apps`
  - `GET /api/admin/content-picker/posts`
- ����ʧЧ���洦����
  - `PATCH /api/admin/netdisk-reports/:id`

### 3. ǰ��������տ�

- ��ҳ `GET /api/home` �����ӣ�
  - `announcements`
  - `heroSlides[].icon`
- վ�������Ѳ��䣺
  - `siteAnnouncementEnabled`
  - `siteAnnouncementTitle`
  - `siteAnnouncementContent`
  - `siteAnnouncementLink`
  - `downloadInterstitialEnabled`
  - `downloadInterstitialTitle`
  - `downloadInterstitialDescription`
  - `downloadInterstitialButtonText`
  - `downloadInterstitialBuyUrl`
- ǰ����Ϣ�����ѴӾɵ� `/api/auth/inbox` �տڵ� `/api/notifications`
- ǰ�˺�̨�û����������е� `/api/admin/users/:id/password`
- ע���������޸�ʱ�����ͷ�񱣴����䵽��
  - `/uploads/avatars/generated/...`

### 4. 2026-04-08 ʵ�ʻز��¼

- ǰ����������ͨ����
  - `Frontend/npm run build`
- ���ݿ�Ǩ����ִ�У�
  - `npx prisma migrate dev --name add_notifications_and_user_controls`
- ���ֶ��ز�ͨ���Ĺ��ܣ�
  - ��ҳ����ӿڷ�������
  - ��ҳ�ֲ�ͼͼ���ֶη�������
  - ע���û�Ĭ��ͷ���ѱ��ػ�
  - �����м�ҳ���÷�������
  - ����Ա����վ���ţ��û��鿴/����Ѷ�/ɾ������
  - ��̨�û���������������Ч
  - ����ʧЧ���洦����״̬����Ϊ�Ѵ���
  - ����ʧЧ���洦�����û����յ�վ��֪ͨ
  - ר������ѡ����Ӧ��/���½ӿڿɷ��ؽ��

### 5. ��������

- �ɵ� `backend/scripts/regression.test.mjs` �Ժ� `draft/member/premium` ����ʷ�ھ��������������ýű�����Ҫ������״̬��ȼ������������ԡ�
- ��������������̨��վ����ģ�����á�ҳ�棬��ֱ��ʹ���µ�֪ͨ�ӿڣ���Ҫ�ٽӾɵ� inbox ·����

### 2026-04-08 �����ű�����

- `Frontend/package.json` �� `dev` �ű��Ѵ� `next dev --webpack -p 3004` ����Ϊ `next dev -p 3004`
- ԭ�򣺵�ǰ���ذ�װ�� Next ��������ٽ��� `--webpack` ������ֱ��ִ�лᱨ `unknown option --webpack`
- ��ǰ������֤�����ǰ�˿�ͨ�� `Frontend/npm run dev` ���������� `http://localhost:3004`
- ������֤��`Frontend/npm run dev` ���� 3004 �˿�ʵ�������
- ������֤��`backend/npm run dev` ���� 58085 �˿�ʵ�������

## 2026-04-08 ·�ɵ�������

- ǰ��������·���Ѵ� `/articles` �л�Ϊ `/news`
- ��������
  - `Frontend/app/news/page.tsx`
  - `Frontend/app/news/[slug]/page.tsx`
- ��ҳ��������ҳ�š�������������������ղء���������������µ��ڲ���ת��ͳһ��Ϊ `/news`
- �����ҳ�ӿ� `GET /api/home` ���ص������ֲ�/�Ƽ�����Ҳ��ͬ����Ϊ `/news/:slug`
- 2026-04-08 ʵ�⣺
  - `Frontend/npm run build` ͨ��
  - `backend/node scripts/run-tests.mjs` ͨ��
## 2026-04-08 ��ҳ�ֲ�ͼ�� 404 �޸�

- ��������
  - ��ҳ�ֲ��Ҳ�ͼ���ֶ��������� emoji������ `??`��`??`��ǰ�˻����ص���ͼƬ��ַ����
  - ���������̨����֣�
    - `GET /%F0%9F%A7%A9 404`
    - `GET /%F0%9F%8E%A8 404`
- �޸����ݣ�
  - `Frontend/app/page.tsx` �Ѹ�Ϊ���ж� `activeSlide.icon` �Ƿ�Ϊ��ʵͼƬ��ַ
  - �����ͼƬ��ַ��������Ⱦ `<img>`
  - �������ͼƬ��ַ�������Ϊ `AppIcon` �ı��� emoji ��Ⱦ�����ٷ����������
- ��֤�����
  - ���� `Frontend/.next` ���������ִ�� `Frontend/npm run build`������ͨ��
  - ֮ǰż���� `<Html> should not be imported outside of pages/_document` ���ڻ���̬���⣬���� `.next` ��δ����
## 2026-04-08 ͷ��ѡ�����̨��������

- ���Ƴ�ǰ��ͷ��ѡ�����еġ��������ͷ����ڣ���ǰ��������ϵͳĬ��ͷ�� + Ĭ��ͷ����ֶ�ѡ�� + �����ϴ���������ȷ·��
- ע��ҳ����Ĭ��Ԥѡ `avatar-01`���û����ֶ�ѡ��ͷ��ʱ���ᱣ��������ɲ����ػ����ϵͳĬ��ͷ��
- �����������̨�˺�����ҳҲ������ `avatar-01` ��Ϊ��ʼ���ף�����δ����ʱ����ʾΪ��һ��Ԥ��ͷ��
- `/admin` ��ҳ��һ��ͳ�ƿ��ĸ���ɫ�ѴӸ߱�������Ƶ���Ϊ�����Ƶ�����ɫ��������۸�
- 2026-04-08 ʵ�⣺`Frontend/npm run build` ͨ��
## 2026-04-08 avatar-gen ���ͷ�����

- �Ѳο� `wave-charts/avatar-gen`��MIT�������µ����ͷ����������Դ�ֿ⣺`https://github.com/wave-charts/avatar-gen`
- �òֿⱾ���Ǵ�ǰ�� SVG ͷ�����������������ⲿͷ����񣻱���Ŀ�ѽ����������زı��ػ�����
  - `Frontend/lib/avatar-gen/`
  - `Frontend/public/avatars/avatar-gen/`
- ��ǰǰ����Ϊ��
  - �û�������������ͷ��ʱ��ǰ�˼�ʱ����һ���µ� SVG ͷ��Ԥ��
  - ͷ���� `data:image/svg+xml;base64,...` ��ʽ�����������ϱ�������
  - �û��������󣬺�˻����ü��б��ػ��߼�����ͷ��д�� `/uploads/avatars/generated/...`
- ͬ��������
  - ע��ҳ����Ĭ��Ԥѡ��һ��Ĭ��ͷ��
  - ���ͷ���ѴӾɵġ�10 ��Ĭ��ͷ��α������л�Ϊ������ SVG ������
- 2026-04-08 ʵ�⣺`Frontend/npm run build` ͨ��
## 2026-04-08 ���Ĭ��ͷ��ͳһΪ avatar-gen

- ��� `buildDefaultAvatar` �ѴӾɵ� avataaars �����߼��л�Ϊ���� `avatar-gen` Ĭ��ͷ��Ŀ¼
- �µ�ϵͳĬ��ͷ��·����ʽ��`/avatars/avatar-gen-defaults/{gender}/avatar-xx.svg`
- ������Ԥ���ɽű���`backend/scripts/generate-avatar-defaults.ts`
- ��ʵ������ 30 ��Ĭ��ͷ���ļ���
  - `Frontend/public/avatars/avatar-gen-defaults/female/`
  - `Frontend/public/avatars/avatar-gen-defaults/male/`
  - `Frontend/public/avatars/avatar-gen-defaults/other/`
- ͬ��������
  - `isGeneratedAvatar` ��ʶ���µı���Ĭ��ͷ��·��
  - `localizeGeneratedAvatar` �����µı���Ĭ��ͷ��·��ʱ��ֱ�ӱ�����������ץȡ
  - `authController` ͷ��У�������� `/avatars/avatar-gen-defaults/` ·��
- 2026-04-08 ʵ�⣺
  - `Frontend/npm run build` ͨ��
  - `buildDefaultAvatar()` �����µı��� SVG Ĭ��ͷ��·��
  - `localizeGeneratedAvatar()` ���µ�Ĭ��ͷ��·������ԭ������
- ����˵����
  - `backend/node scripts/run-tests.mjs` ����ִ�г��ֳ�ʱ��δ�õ���Ч�ع���������������Ų�ű�����

## 2026-04-08 �ɸ��þ������

�ⲿ��ƫͨ�ã���������ĿʱҲ��ֱ�������ã�������ֻ���� Triangle ר�����顣

1.  ��̨�б�ҳ�Ĳ������ʺ�Ĭ������
    - ֻ������չ����������ڣ������Լ��ٿ�Ƭӵ���Ͱ�ť��ѹ���⡣
    - �ʺ��û��б��������б�������б����ࡰ�鿴��Ϣ�ࡢ������ť�ࡱ��ҳ�档
    - չ��״̬�����õ��� `expandedId` ���ƣ�����һҳͬʱչ��̫�������塣

2.  �ȼ�����Ա��Ȩ�������ֶ�Ҫ��ͳһ�ھ���
    - ���ֻ����һ�� canonical ֵ��ǰ��չʾ����������ӳ�䡣
    - ��ֵҪ�� alias ���ݣ���Ҫ��ҳ��ֱ��������ʷ�ַ�����
    - �����򡢻ձꡢͼ�ꡢ��ɫ��ù���һ�� meta ӳ�������������ֻ��һ����

3.  �ȼ� badge �� icon �ʺ����ɹ��������
    - ҳ��ֻ���ȼ�ֵ����Ҫ�ֹ�ƴ�İ���ͼ�����ɫ��
    - �����ĵȼ��������� icon������ɫ������ɢ�䵽ÿ��ҳ���

4.  ��̨����㼶Ҫһ��ͬ����
    - ��ֻ����������`shell / panel / hero / card / input / secondary button` ��Щ������ҲҪһ��ġ�
    - �Ӿ�����ͨ��������ɫ���ˣ�����ĳ�������������ɵ�ɫ��
    - ���������㼶�����ɿɸ��õ���� token��

5.  Next.js ���ؿ������� manifest / segment explorer ���������ȿ� devtools ���úͻ��档
    - �ȹ����ʵ�����ԣ����� `.next`��Ȼ��������������
    - ��Ҫ�ѻ���̬����ֱ�ӵ���ҵ��������

6.  ҳ������Ժ�Ҫ���ܹ�����
    - ֻҪ����ҳ��ṹ��������Ⱦ���ܿر�������̨�б���������Ӧ����һ�� `npm run build`��
    - ����Ķ��������������ʹ��󡢿�ֵ��֧���⡢������©�Ͱ�ɫģʽ���

7.  ��������û��ĺ�̨����վ��ҳ��ɼ��İ�Ĭ��ͳһ�������ġ�
    - ��Ҫ��Ϊ�����ʾ����Ӣ�ģ��ͰѰ�ť��ռλ������ʾ�İ�һ�����Ӣ�ġ�
    - ����Ժ���Ҫ�������ԣ���ð��İ�Դ������������Ҫ��Ӳ����