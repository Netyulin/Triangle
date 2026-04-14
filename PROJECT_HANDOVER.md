# Triangle 项目交接文档

最后更新：2026-04-13

## 项目概况

- 项目名称：Triangle
- 站点定位：简体中文软件、工具、文章、下载与广告运营平台
- 域名规划：
  - 前端：`www.sanjiaosoft.com`
  - API：`api.sanjiaosoft.com`
  - 签名服务：`sign.sanjiaosoft.com`

## 当前技术栈

### 前端

- Next.js 16（App Router）
- React 19
- Tailwind CSS
- Radix UI + 自定义组件
- 本地开发端口：`3004`

### 后端

- Express 5
- Prisma 7
- PostgreSQL
- API 端口：`58085`
- 独立签名服务端口：`58086`

### 其他能力

- Google AdSense 广告位
- 自营广告后台
- 用户、会员、邀请码、通知、需求墙
- iOS 自助签名与分发
- Cloudflare + VPS 部署

## 目录结构

### 根目录

- [deploy-ubuntu.sh](E:/Project/Triangle/deploy-ubuntu.sh)
- [.deploy.env.example](E:/Project/Triangle/.deploy.env.example)
- [PROJECT_HANDOVER.md](E:/Project/Triangle/PROJECT_HANDOVER.md)

### 前端

- [Frontend/app](E:/Project/Triangle/Frontend/app)
- [Frontend/components](E:/Project/Triangle/Frontend/components)
- [Frontend/lib](E:/Project/Triangle/Frontend/lib)
- [Frontend/package.json](E:/Project/Triangle/Frontend/package.json)

### 后端

- [backend/src](E:/Project/Triangle/backend/src)
- [backend/prisma](E:/Project/Triangle/backend/prisma)
- [backend/.env.example](E:/Project/Triangle/backend/.env.example)
- [backend/DEPLOYMENT.md](E:/Project/Triangle/backend/DEPLOYMENT.md)
- [backend/package.json](E:/Project/Triangle/backend/package.json)

## 数据库策略

- 项目已统一切到 PostgreSQL
- SQLite 不再作为默认开发数据库
- 本地和线上通过环境变量切换连接目标

### 规则

数据库连接优先级：

1. `DATABASE_URL`
2. `DATABASE_TARGET` 对应的分环境连接串

签名运行目标独立控制：

- `DATABASE_TARGET`
- `SIGN_RUNTIME_TARGET`

推荐组合：

- 本地日常开发：
  - `DATABASE_TARGET=local`
  - `SIGN_RUNTIME_TARGET=local`
- 本地通过 SSH 隧道连远程 PostgreSQL 联调：
  - `DATABASE_TARGET=production`
  - `SIGN_RUNTIME_TARGET=local`
- VPS 正式运行：
  - `DATABASE_TARGET=production`
  - `SIGN_RUNTIME_TARGET=production`

## 本地开发说明

### 前端

```bash
cd Frontend
npm install
npm run dev
```

地址：

- `http://localhost:3004`

### 后端

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

地址：

- `http://localhost:58085`
- 健康检查：`http://localhost:58085/health`

### 远程 PostgreSQL 联调

推荐用 SSH 隧道，不建议把数据库直接暴露到公网。

示例：

```powershell
ssh -N -L 15432:127.0.0.1:5432 -p 你的SSH端口 triangle@你的服务器IP
```

然后本地 `.env` 使用：

```env
DATABASE_TARGET=production
DATABASE_URL_PRODUCTION=postgresql://triangle_user:你的密码@127.0.0.1:15432/triangle_portal?schema=public
SIGN_RUNTIME_TARGET=local
```

## VPS 部署现状

- Ubuntu + Nginx + PM2 方案已跑通
- `zsign` 已在 Ubuntu 上验证可执行
- 前端、主后端、独立签名服务已拆分
- PostgreSQL 已纳入正式部署结构

## 默认种子数据

当前有效种子文件：

- [seed.ts](E:/Project/Triangle/backend/prisma/seed.ts)

默认管理员：

- 用户名：`admin`
- 密码：`admin123`

## iOS 签名模块现状

- `/dashboard` 已有完整签名流程页
- 后台已有证书管理、描述文件管理、签名任务基础能力
- 本地开发支持 Windows 路径下的：
  - `.p12`
  - `mobileprovision`
  - `zsign.exe`
- VPS 正式环境支持 Ubuntu 路径下的：
  - `/opt/zsign/zsign`
  - `/opt/triangle/secrets/*.p12`
  - `/opt/triangle/secrets/*.mobileprovision`

## 广告模块现状

- 首页、详情页、下载页已接入 `AdSenseSlot`
- 后台广告位管理、自营广告内容管理、广告统计页已接通
- 前端广告组件已修正，不再因为遮罩或状态逻辑导致广告位长期空白

## 2026-04-13 广告排查结论

### 已确认事实

1. 正式站 [www.sanjiaosoft.com](https://www.sanjiaosoft.com) 已正确渲染首页广告容器
2. 当前首页广告位 `publisher id` 为 `ca-pub-7143421934912272`
3. 当前首页广告位 `slot id` 为 `6517724385`
4. VPS 可以正常下载 `adsbygoogle.js`
5. 当前本地异常网络环境中，以下域名会被解析到 `198.18.x.x`
   - `pagead2.googlesyndication.com`
   - `googleads.g.doubleclick.net`
6. 在该异常环境中，浏览器请求广告脚本时会报：
   - `net::ERR_CONNECTION_CLOSED`

### 结论

- 不是 `slot id` 配错
- 不是前端广告组件未渲染
- 不是 VPS 无法访问 Google AdSense
- 当前问题更接近“部分终端网络环境无法稳定访问 Google 广告链路”

## 正式站广告位真验证标准

只有同时满足下面几项，才算 Google 真正开始投放：

1. `adsbygoogle.js` 成功加载
2. 页面发出了后续广告请求
3. `ins.adsbygoogle` 内出现了 `iframe`
4. 页面肉眼可见广告素材
5. AdSense 后台后续能看到展示量增长

如果只有占位框、没有 iframe、没有后续请求，不能算真正投放。

详见：

- [广告管理后台使用说明.md](E:/Project/Triangle/广告管理后台使用说明.md)

## 2026-04-13 数据清理结论

- 已对当前远程 PostgreSQL 做全表文本列扫描
- 扫描目标：所有包含 `localhost:3004/uploads/` 的脏链接
- 本轮只发现 1 条测试数据：
  - 表：`Post`
  - 标题：`Temp Post`
  - 字段：`coverImage`
- 该测试文章已从当前远程 PostgreSQL 删除
- 删除后再次全表扫描，结果为 `0` 条命中

当前结论：

- 当前线上联调库内已无 `localhost:3004/uploads/...` 残留

## 最近一轮关键修复

- 重写 `/dashboard` 页面和签名主组件，修复 JSX 编译错误
- 重写 AdSense 组件，修复广告位遮罩与加载状态问题
- 修复中文路径代理编码问题
- 清理多处 PostgreSQL 兼容问题：
  - 驼峰字段引用
  - SQLite 的 `PRAGMA`
  - SQLite 的 `AUTOINCREMENT`
  - `INSERT OR IGNORE`
  - 分类、权限、个人中心相关原生 SQL
- 统一本地 / 远程 PostgreSQL 联调方式

## 当前仍需关注的问题

1. 广告组件代码已正常，但终端用户网络环境能否稳定加载 Google 广告脚本仍需按正式验证方案继续复核
2. 项目中其他历史文档仍有少量旧编码污染，后续建议逐步重写
3. 新增原生 SQL 时应继续优先写成 PostgreSQL 兼容实现

## 推荐下一步

1. 在正常网络环境或 VPS 浏览器环境里，继续按广告验证标准复核一次
2. 继续用当前远程 PostgreSQL 做浏览器级联调，确认后台、搜索、详情页、签名流程完整通过
3. 本地联调无误后，再整体上传项目到 VPS 做最终部署
