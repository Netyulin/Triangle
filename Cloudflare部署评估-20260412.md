# Cloudflare 部署评估与落地配置（2026-04-12）

## 当前结论

基于当前项目代码，最稳妥的生产架构仍然是：

- Cloudflare：DNS、反代、缓存、WAF、限流
- 主站前端：可放 Cloudflare 前端托管，或继续放 VPS
- 主后端：保留在 Ubuntu VPS
- 独立签名服务：单独进程或单独机器部署在 VPS
- 数据库：从 SQLite 迁移到 PostgreSQL
- 上传与签名产物：迁移到对象存储，优先兼容 Cloudflare R2

本次代码已补上以下能力：

1. 后端新增 PostgreSQL 兼容运行时
2. Prisma 改为双 schema：
   - `prisma/schema.prisma`：SQLite 开发环境
   - `prisma/schema.postgresql.prisma`：PostgreSQL 生产环境
3. 上传与签名产物支持双存储模式：
   - 本地磁盘
   - S3 兼容对象存储（可用于 Cloudflare R2）
4. 签名执行链路支持远程独立签名服务：
   - 主后端通过 `SIGN_SERVICE_URL` 调独立签名服务
   - 未配置时仍可本机执行，方便开发
5. API / 下载 / 签名接口补充更严格限流
6. 服务端启用 `trust proxy`，适配 Cloudflare 真实来源 IP

---

## 推荐架构

### 方案 A：推荐

- `www.example.com`：前端站点
- `api.example.com`：主后端 API
- `sign.example.com`：独立签名服务
- Cloudflare 放在前面做 DNS、代理、WAF、缓存
- PostgreSQL 放 VPS 本机或独立数据库实例
- R2 用于：
  - 图片上传
  - 用户上传的 IPA
  - 签名产物 `signed.ipa`
  - `manifest.plist`
  - 用户/系统证书与 `mobileprovision`

### 为什么这样拆

1. 签名服务需要 `zsign`、`.p12`、`mobileprovision`、本地子进程，不适合放 Workers
2. 主后端负责登录、后台、业务数据、权限校验
3. 对象存储把本地磁盘依赖降到最低，方便扩容和清理
4. PostgreSQL 比 SQLite 更适合线上并发和后续扩展

---

## Cloudflare 控制台配置

### 一、DNS

至少配置这 3 个记录：

1. `www`
   - 类型：`A` 或 `CNAME`
   - 指向前端服务
   - 代理状态：开启橙云
2. `api`
   - 类型：`A`
   - 指向主后端 VPS
   - 代理状态：开启橙云
3. `sign`
   - 类型：`A`
   - 指向签名服务 VPS
   - 代理状态：建议开启橙云

### 二、SSL/TLS

- 模式：`Full (strict)`
- VPS 上使用有效 HTTPS 证书
- 不建议用 `Flexible`

### 三、缓存

建议的缓存策略：

1. 前端静态资源
   - `/\_next/static/*`
   - 缓存：开启
   - Edge TTL：1 个月
2. 图片资源
   - `/uploads/*` 仅在本地存储模式时使用
   - 若已经迁移到 R2，则由对象存储域名单独缓存
3. API
   - `/api/*` 默认不缓存
4. 签名相关
   - `/api/sign/*` 不缓存
   - `manifest.plist` 可短缓存 1 分钟
   - `signed.ipa` 由对象存储域名缓存，不建议走主 API 路径

### 四、WAF

建议至少开启：

1. Cloudflare Managed Rules
2. Bot Fight Mode 或 Super Bot Fight Mode（有套餐时）
3. 针对 `/api/sign/*` 的额外规则：
   - 限制异常高频访问
   - 对明显的扫描器 / 非浏览器流量提高拦截等级
4. 后台路径：
   - `/admin/*`
   - 建议增加国家/地区限制、挑战页或 Access

### 五、Cloudflare 限流

建议在 Cloudflare 控制台额外配置这些规则：

1. `/api/auth/login`
   - 1 分钟内单 IP 超过 10 次：阻断 10 分钟
2. `/api/auth/register`
   - 10 分钟内单 IP 超过 5 次：阻断 30 分钟
3. `/api/sign/tasks`
   - 10 分钟内单 IP 超过 6 次：阻断 30 分钟
4. `/api/sign/bundles`
   - 10 分钟内单 IP 超过 4 次：阻断 30 分钟
5. `/api/download/*/ad-click`
   - 5 分钟内单 IP 超过 30 次：阻断 10 分钟

说明：

- 代码里已经有应用层限流
- Cloudflare 限流是第一层，后端限流是第二层
- 两层都保留更稳

---

## 当前环境变量设计

### 一、数据库

开发环境：

```env
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./prisma/dev.db"
```

生产环境：

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://triangle_user:strong_password@127.0.0.1:5432/triangle_portal?schema=public"
```

### 二、对象存储

本地模式：

```env
OBJECT_STORAGE_DRIVER=local
```

Cloudflare R2 / S3 兼容模式：

```env
OBJECT_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=triangle-assets
OBJECT_STORAGE_ACCESS_KEY_ID=你的密钥
OBJECT_STORAGE_SECRET_ACCESS_KEY=你的密钥
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_PUBLIC_BASE_URL=https://assets.example.com
```

### 三、独立签名服务

主后端：

```env
SIGN_SERVICE_URL=https://sign.example.com
SIGN_SERVICE_TOKEN=一段足够长的内部令牌
```

签名服务：

```env
SIGN_SERVICE_PORT=58086
SIGN_SERVICE_TOKEN=与主后端一致
SIGN_ZSIGN_BIN=/opt/zsign/zsign
SIGN_P12_PATH=/opt/triangle/secrets/push.p12
SIGN_MOBILEPROVISION_PATH=/opt/triangle/secrets/pushon.mobileprovision
SIGN_P12_PASSWORD=你的密码
SIGN_PUBLIC_BASE_URL=https://api.example.com
```

说明：

- `SIGN_PUBLIC_BASE_URL` 仍然用于生成可下载/安装的公开链接
- 如果签名产物走对象存储公开域名，实际下载链接将指向对象存储

---

## PostgreSQL 迁移步骤

### 一、准备

1. 备份当前 SQLite 文件
2. 准备 PostgreSQL 15+
3. 创建数据库和独立用户

### 二、生成 PostgreSQL Client

```bash
npx prisma generate --schema prisma/schema.postgresql.prisma
```

### 三、切换生产环境变量

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://..."
```

### 四、建表策略

当前项目中：

- 主业务模型由 Prisma schema 管理
- 签名相关表由 `ensureSignTables()` 兼容创建

建议生产切换顺序：

1. 先部署代码
2. 生成 PostgreSQL Prisma Client
3. 启动服务让签名表自动补齐
4. 再导入历史数据

---

## 对象存储迁移说明

### 已经迁移的范围

本次代码已支持以下内容改走对象存储：

1. 后台图片上传
2. 系统/用户 `.p12`
3. 系统/用户 `mobileprovision`
4. 用户上传的 IPA
5. 已签名 IPA
6. `manifest.plist`

### 清理策略

签名产物与临时上传数据 24 小时后清理：

- 任务记录保留
- 下载链接清空
- 对象存储中的：
  - 原始 IPA
  - 已签名 IPA
  - `manifest.plist`
  会被删除

---

## 独立签名服务拆分说明

新增独立进程入口：

- `backend/src/sign-service.ts`

启动命令：

```bash
npm run sign-service
```

主后端在配置 `SIGN_SERVICE_URL` 后，不再本机直接执行 `zsign`，而是把执行请求发给独立签名服务。

### 推荐部署方式

1. 主后端：
   - `pm2 start npm --name triangle-backend -- start`
2. 签名服务：
   - `pm2 start npm --name triangle-sign-service -- run sign-service`

---

## 当前代码侧限流

已经接入：

1. 登录限流
2. 注册限流
3. 下载点击记录限流
4. 签名配置读取限流
5. 签名任务状态轮询限流
6. 签名上传/提交/激活/删除限流
7. 图片上传与远程导入限流

Cloudflare 层建议继续叠加一层规则，不要只依赖应用层。

---

## 当前最推荐的部署顺序

1. 先部署 PostgreSQL
2. 再接入对象存储
3. 然后把签名服务单独跑成第二个进程
4. 最后上 Cloudflare 代理、缓存和 WAF

这样做的好处是：

- 每一步都可回滚
- 不会把数据库、存储、签名执行和网络入口同时改坏
- 最符合当前项目实际复杂度
