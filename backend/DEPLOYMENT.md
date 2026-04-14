# Triangle Backend 部署说明

## 1. 当前部署结论

当前后端建议采用以下结构：

- 前端：Next.js，端口 `3004`
- 主后端：Express + Prisma，端口 `58085`
- 独立签名服务：端口 `58086`
- 数据库：PostgreSQL
- 反向代理：Nginx
- 进程守护：PM2

推荐域名：

- 前端：`www.sanjiaosoft.com`
- API：`api.sanjiaosoft.com`
- 签名服务：`sign.sanjiaosoft.com`

## 2. 本地开发启动

### 安装依赖

```bash
cd backend
npm install
```

### 生成 Prisma Client

```bash
npx prisma generate
```

### 推送数据库结构

```bash
npx prisma db push
```

### 写入种子数据

```bash
npm run seed
```

说明：

- 当前唯一生效的种子脚本是 [seed.ts](E:/Project/Triangle/backend/prisma/seed.ts)
- 种子脚本会读取当前 `.env`，因此本地可以直接对 SSH 隧道后的远程 PostgreSQL 写入演示数据

### 启动开发服务

```bash
npm run dev
```

默认地址：

- `http://localhost:58085`
- 健康检查：`http://localhost:58085/health`

## 3. 数据库配置

### 推荐策略

本项目现在默认以 PostgreSQL 为主，不再把 SQLite 作为默认日常开发数据库。

### 环境变量规则

支持以下变量：

- `DATABASE_PROVIDER`
- `DATABASE_TARGET`
- `DATABASE_URL`
- `DATABASE_URL_LOCAL`
- `DATABASE_URL_PRODUCTION`
- `DATABASE_URL_STAGING`
- `DATABASE_URL_TEST`

连接优先级：

1. `DATABASE_URL`
2. `DATABASE_TARGET` 自动选择对应连接串

签名相关变量也支持同样的切换逻辑，例如：

- `SIGN_SERVICE_URL_LOCAL / SIGN_SERVICE_URL_PRODUCTION`
- `SIGN_PUBLIC_BASE_URL_LOCAL / SIGN_PUBLIC_BASE_URL_PRODUCTION`
- `SIGN_ZSIGN_BIN_LOCAL / SIGN_ZSIGN_BIN_PRODUCTION`
- `SIGN_P12_PATH_LOCAL / SIGN_P12_PATH_PRODUCTION`
- `SIGN_P12_PASSWORD_LOCAL / SIGN_P12_PASSWORD_PRODUCTION`
- `SIGN_MOBILEPROVISION_PATH_LOCAL / SIGN_MOBILEPROVISION_PATH_PRODUCTION`

推荐组合：

- 日常本地开发：`DATABASE_TARGET=local` + `SIGN_RUNTIME_TARGET=local`
- 本地连远程 PostgreSQL 联调：`DATABASE_TARGET=production` + `SIGN_RUNTIME_TARGET=local`
- VPS 正式运行：`DATABASE_TARGET=production` + `SIGN_RUNTIME_TARGET=production`

补充说明：

- 如果使用 `node --env-file=.env` 执行辅助脚本，建议确保 `.env` 为 UTF-8 无 BOM。
- 当前运行时已经增加 PostgreSQL 兜底识别：即使首行 `DATABASE_PROVIDER` 因 BOM 未读到，只要 `DATABASE_URL*` 指向 PostgreSQL，系统也会按 PostgreSQL 处理。

### 典型本地示例

```env
DATABASE_PROVIDER=postgresql
DATABASE_TARGET=local
DATABASE_URL=
DATABASE_URL_LOCAL=postgresql://postgres:你的本地密码@127.0.0.1:5432/triangle_local?schema=public
DATABASE_URL_PRODUCTION=postgresql://triangle_user:线上密码@127.0.0.1:15432/triangle_portal?schema=public
```

### 线上示例

```env
DATABASE_PROVIDER=postgresql
DATABASE_TARGET=production
DATABASE_URL=postgresql://triangle_user:线上密码@127.0.0.1:5432/triangle_portal?schema=public
```

## 4. 关键环境变量

### 基础运行

```env
PORT=58085
JWT_SECRET=请替换为长随机字符串
NODE_ENV=production
CORS_ORIGIN=https://www.sanjiaosoft.com,https://api.sanjiaosoft.com,https://sign.sanjiaosoft.com
PUBLIC_SITE_URL=https://www.sanjiaosoft.com
```

### 签名服务

```env
SIGN_SERVICE_URL=https://sign.sanjiaosoft.com
SIGN_SERVICE_TOKEN=请替换为内部令牌
SIGN_SERVICE_PORT=58086
SIGN_PUBLIC_BASE_URL=https://api.sanjiaosoft.com
SIGN_ZSIGN_BIN=/opt/zsign/zsign
SIGN_P12_PATH=/opt/triangle/secrets/push.p12
SIGN_P12_PASSWORD=证书密码
SIGN_MOBILEPROVISION_PATH=/opt/triangle/secrets/pushon.mobileprovision
SIGN_TIMEOUT_MS=600000
SIGN_MAX_IPA_BYTES=1073741824
SIGN_BUNDLE_IDENTIFIER=com.triangle.signed
SIGN_BUNDLE_VERSION=1.0.0
```

### 对象存储

```env
OBJECT_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://replace-me.r2.cloudflarestorage.com
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=triangle-assets
OBJECT_STORAGE_ACCESS_KEY_ID=replace-me
OBJECT_STORAGE_SECRET_ACCESS_KEY=replace-me
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_PUBLIC_BASE_URL=https://assets.sanjiaosoft.com
```

## 5. Ubuntu 一键部署

项目根目录已经提供：

- [deploy-ubuntu.sh](E:/Project/Triangle/deploy-ubuntu.sh)
- [.deploy.env.example](E:/Project/Triangle/.deploy.env.example)

### 使用方法

```bash
cd /opt/triangle
cp .deploy.env.example .deploy.env
vim .deploy.env
chmod +x deploy-ubuntu.sh
sudo ./deploy-ubuntu.sh
```

### 脚本会完成的事情

1. 安装基础依赖
2. 检查 `zsign`、`.p12`、`mobileprovision`
3. 生成前后端生产环境变量
4. 安装依赖
5. 生成 Prisma Client
6. 构建前端
7. 启动 PM2 进程
8. 写入 Nginx 三域名反代配置

## 6. Ubuntu 服务器要求

至少建议：

- `2 vCPU`
- `4 GB RAM`
- `40 GB SSD`

更推荐：

- `4 vCPU`
- `8 GB RAM`
- `80 GB SSD`

## 7. PostgreSQL 建议

### 推荐做法

- PostgreSQL 与应用部署在同一台 VPS
- 数据库只监听 `127.0.0.1`
- 不开放公网 `5432`
- 如果本地需要访问线上数据库，优先使用 SSH 隧道

### SSH 隧道示例

Windows PowerShell：

```powershell
ssh -N -L 15432:127.0.0.1:5432 -p 你的SSH端口 triangle@你的服务器IP
```

这样本地可通过：

```env
DATABASE_URL_PRODUCTION=postgresql://triangle_user:线上密码@127.0.0.1:15432/triangle_portal?schema=public
```

访问线上 PostgreSQL，而不需要把数据库直接暴露公网。

补充说明：

- 只要代码在本机运行，签名输入和签名产物默认就落在本机 `backend/uploads/sign`
- 只要代码在 VPS 运行，签名输入和签名产物默认就落在 VPS 本地 `backend/uploads/sign`
- 因此本地连线上数据库时，不需要把 VPS 的签名目录映射到本地，真正需要切换的是证书路径、描述文件路径、zsign 路径和公开 URL

## 8. PM2 进程说明

部署完成后通常存在三个进程：

- `triangle-frontend`
- `triangle-backend`
- `triangle-sign-service`

常用命令：

```bash
pm2 status
pm2 logs triangle-backend
pm2 logs triangle-sign-service
pm2 restart triangle-frontend
pm2 restart triangle-backend
pm2 restart triangle-sign-service
```

## 9. Nginx 反代说明

部署脚本会生成三段站点配置：

- `www.sanjiaosoft.com -> 127.0.0.1:3004`
- `api.sanjiaosoft.com -> 127.0.0.1:58085`
- `sign.sanjiaosoft.com -> 127.0.0.1:58086`

检查命令：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 10. 默认数据

执行：

```bash
npm run seed
```

会创建默认用户：

- 管理员：`admin / admin123`
- 普通用户：`reader / reader123`

如果登录异常，先检查：

1. 当前后端到底连的是哪套数据库
2. `seed` 是否写入当前数据库
3. 是否误用了没有加载 `.env` 的脚本

## 11. 当前已知情况

### 已完成

- 主后端与签名服务拆分
- PostgreSQL 已作为统一主数据库方向
- 已修复多处 SQLite 原生 SQL 在 PostgreSQL 下的兼容问题
- 已支持对象存储抽象层

### 仍需继续关注

- 后端仍可能残留少量 SQLite 风格原生 SQL
- 每次修改原生 SQL 后，建议优先在本地 PostgreSQL 复现验证

## 12. 相关文件

- [backend/package.json](E:/Project/Triangle/backend/package.json)
- [backend/prisma/schema.postgresql.prisma](E:/Project/Triangle/backend/prisma/schema.postgresql.prisma)
- [backend/.env.example](E:/Project/Triangle/backend/.env.example)
- [deploy-ubuntu.sh](E:/Project/Triangle/deploy-ubuntu.sh)
- [.deploy.env.example](E:/Project/Triangle/.deploy.env.example)

## 13. 服务器启动与重启命令

### 首次部署

```bash
cd /opt/triangle
cp .deploy.env.example .deploy.env
vim .deploy.env
chmod +x deploy-ubuntu.sh
sudo ./deploy-ubuntu.sh
```

### 后端重新生成 Prisma Client

```bash
cd /opt/triangle/backend
export NVM_DIR="$HOME/.nvm"
. "$HOME/.nvm/nvm.sh"
npx prisma generate
npx prisma generate --schema prisma/schema.postgresql.prisma
```

### 后端服务重启

```bash
pm2 restart triangle-backend
pm2 restart triangle-sign-service
```

### 前端服务重启

```bash
pm2 restart triangle-frontend
```

### 查看运行状态

```bash
pm2 status
pm2 logs triangle-backend
pm2 logs triangle-sign-service
sudo systemctl status nginx
```

### 重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```
## 2026-04-13 补充说明

- 前端签名页相关文件已经恢复可编译状态：
  - [Frontend/app/dashboard/page.tsx](E:/Project/Triangle/Frontend/app/dashboard/page.tsx)
  - [Frontend/components/dashboard/app-signing-card.tsx](E:/Project/Triangle/Frontend/components/dashboard/app-signing-card.tsx)
- AdSense 组件已重写：
  - [Frontend/components/ads/AdSenseSlot.tsx](E:/Project/Triangle/Frontend/components/ads/AdSenseSlot.tsx)
  - 本地开发环境下如果 Google 不返回真实广告，会显示明确提示；生产环境仍需在正式域名上验证真实填充情况。
- Next.js 代理层已修复中文路径参数处理：
  - [Frontend/app/api/[...path]/route.ts](E:/Project/Triangle/Frontend/app/api/[...path]/route.ts)
- 本轮验证通过：
  - `cd Frontend && npm run build`
  - `cd backend && node scripts/smoke.test.mjs`
  - `cd backend && node scripts/regression.test.mjs`
