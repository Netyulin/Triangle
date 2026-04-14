# iOS App 自助签名与分发模块交接文档

更新时间：2026-04-11

## 1. 本次新增文件

### 前端

- `Frontend/app/dashboard/page.tsx`
- `Frontend/components/dashboard/app-signing-card.tsx`
- `Frontend/lib/sign-api.ts`
- `Frontend/app/api/sign/udid/session/route.ts`
- `Frontend/app/api/sign/udid/profile/route.ts`
- `Frontend/app/api/sign/udid/route.ts`
- `Frontend/app/api/sign/tasks/route.ts`
- `Frontend/components/navbar.tsx`（增加“应用签名”入口）

### 后端

- `backend/src/routes/sign.js`
- `backend/src/controllers/signController.js`
- `backend/src/utils/signTables.js`
- `backend/src/utils/signStorage.js`
- `backend/src/utils/signSecrets.js`
- `backend/src/utils/signService.js`
- `backend/src/index.ts`（注册 `/api/sign` 路由）

## 2. 功能说明

新增 `/dashboard` 页面，给登录用户使用“iOS App 自助签名与分发”功能。

流程如下：

1. 点击“获取 UDID”
2. Next.js 生成描述文件并引导 iOS 安装
3. Apple 回调 `/api/sign/udid`
4. UDID 与当前登录用户绑定
5. 上传 IPA
6. 后端异步调用 `zsign`
7. 前端通过 SWR 轮询任务状态
8. 输出安装链接与已签名 IPA 下载链接

## 3. 前端实现要点

- UI 统一复用现有：
  - `Button`
  - `Card`
  - `Dialog`
  - `Progress`
- 页面入口放在：
  - 顶部用户菜单
  - 移动端导航入口
- 数据请求分两类：
  - JSON 接口：继续走现有 `request()` + `/api/[...path]` 代理
  - 文件上传：新建 `Frontend/app/api/sign/tasks/route.ts` 专门转发 `FormData`

## 4. 后端实现要点

### 新增业务表

运行时自动创建两张表：

- `sign_devices`
- `sign_tasks`

不依赖本轮 Prisma schema 迁移，避免为这次功能强行改动已有数据库结构链路。

### 新增接口

- `GET /api/sign/devices`
- `POST /api/sign/devices`
- `GET /api/sign/tasks`
- `POST /api/sign/tasks`
- `GET /api/sign/tasks/:taskId`

### 异步签名逻辑

- 上传 IPA 后仅创建任务，不阻塞请求
- `queueSignTask(taskId)` 在后台执行：
  - 读取证书
  - 读取 mobileprovision
  - 调用 `zsign`
  - 生成 `manifest.plist`
  - 回写 `installUrl` / `downloadUrl`

### 产物目录

签名任务文件落在：

- `backend/uploads/sign/task-{id}/`

包含：

- 原始 IPA
- 已签名 IPA
- `manifest.plist`

## 5. UDID 获取链路

使用 Next.js 三段式中转，避免 Apple 回调时拿不到前端 localStorage token：

- `/api/sign/udid/session`
  - 读取 `X-Token`
  - 调用后端 `/api/auth/me`
  - 写入短时 `httpOnly cookie`
- `/api/sign/udid/profile`
  - 动态生成 `.mobileconfig`
- `/api/sign/udid`
  - 接收 Apple GET / POST 回调
  - 从 cookie 里拿登录态
  - 转发到后端 `/api/sign/devices`
  - 最后重定向回 `/dashboard`

## 6. 环境变量

### 后端

- `SIGN_ZSIGN_BIN`
- `SIGN_P12_PATH`
- `SIGN_P12_BASE64`
- `SIGN_P12_PASSWORD`
- `SIGN_MOBILEPROVISION_PATH`
- `SIGN_MOBILEPROVISION_BASE64`
- `SIGN_TIMEOUT_MS`
- `SIGN_MAX_IPA_BYTES`
- `SIGN_PUBLIC_BASE_URL`
- `SIGN_BUNDLE_IDENTIFIER`
- `SIGN_BUNDLE_VERSION`

### 当前已接入的本地签名文件

- `SIGN_P12_PATH=E:\iCloudDrive\Downloads\cerfabu\push.p12`
- `SIGN_MOBILEPROVISION_PATH=E:\iCloudDrive\Downloads\cerfabu\pushon.mobileprovision`
- `SIGN_P12_PASSWORD` 已配置

说明：

- 当前已填写 `SIGN_ZSIGN_BIN=E:\iCloudDrive\Downloads\certwo\zsign.exe`
- 已确认 `zsign.exe -h` 可正常输出帮助信息

### 使用规则

- `SIGN_P12_PATH` / `SIGN_P12_BASE64` 二选一
- `SIGN_MOBILEPROVISION_PATH` / `SIGN_MOBILEPROVISION_BASE64` 二选一
- 如果使用 Base64，服务端会落地到缓存目录后交给 `zsign`

## 7. 错误处理策略

- 描述文件安装失败
  - 提示重新获取 UDID，并确认在 iPhone / iPad Safari 中完成
- 账号名额满
  - 当签名日志包含设备名额关键字时，转为友好提示
- 签名超时
  - 提示 IPA 过大或签名环境异常
- 证书 / 描述文件 / `zsign` 未配置
  - 统一提示签名环境未准备完成

## 8. 已完成验证

- `cd Frontend && npm.cmd install swr`
- `cd Frontend && npm.cmd run build`：通过
- `cd backend && npm.cmd rebuild better-sqlite3`：完成
- `cd backend && npm.cmd run test`：通过
- `cd backend && npm.cmd run smoke`：通过
- 本地开发服务已验证启动：
  - 前端：`http://localhost:3004`
  - 后端：`http://localhost:58085`
- 联调验证已通过：
  - 登录后 `POST /api/sign/devices` 可成功写入设备 UDID
  - `GET /api/sign/devices` 可返回当前用户设备列表
  - `POST /api/sign/udid/session` 可返回描述文件安装地址
- `POST /api/sign/tasks` 可成功创建异步签名任务

### 2026-04-12 补充

- 已确认本地签名文件目录：
  - `E:\iCloudDrive\Downloads\cerfabu\push.p12`
  - `E:\iCloudDrive\Downloads\cerfabu\pushon.mobileprovision`
- 已将以上路径与密码写入 `backend/.env`
- 已将 `zsign.exe` 路径写入 `backend/.env`
- 说明：`cerfabu` 目录当前仅保留 `.p12` 与 `.mobileprovision`，实际可执行文件位于 `certwo\zsign.exe`
- 已确认 `zsign` 实际路径：
  - `E:\iCloudDrive\Downloads\certwo\zsign.exe`
- 已使用真实 IPA 验证签名成功：
  - 源文件：`C:\Users\Administrator\Downloads\caiyun.ipa`
  - 后台任务编号：`5`
  - 结果：`completed`
  - 已签名下载地址：`http://localhost:58085/uploads/sign/task-5/signed.ipa`
  - 安装地址：`itms-services://?action=download-manifest&url=http%3A%2F%2Flocalhost%3A58085%2Fuploads%2Fsign%2Ftask-5%2Fmanifest.plist`

## 8.1 当前环境下的预期失败表现

当前仓库尚未配置真实签名证书和描述文件，因此：

- 上传 IPA 后任务会进入队列
- 随后状态会变为 `failed`
- 返回更明确的错误码与文案：
  - `CERT_NOT_CONFIGURED`
  - `签名证书未配置，请先设置 SIGN_P12_PATH 或 SIGN_P12_BASE64。`

这说明：

- 任务队列链路是通的
- 错误处理链路是通的
- 目前缺的是签名环境，不是页面或接口本身不可用

## 9. 外部设计文档

已同步到：

- `E:\iCloudDrive\iCloud~md~obsidian\obi\Triangle项目\iOS App自助签名与分发模块设计-20260411.md`

## 10. 当前限制

这次接入的是“签名与分发链路”，不是完整的 Apple 开发者后台自动设备注册系统。

也就是说：

- UDID 采集已经接通
- 签名任务已经接通
- 但如果你希望“采集 UDID 后自动把设备注册进 Apple 开发者后台，再自动重签 mobileprovision”，那还需要后续再接 Apple 开发者平台自动化能力

目前版本更适合：

- 你已经准备好可用的 `.p12`
- 你已经准备好包含目标设备的 `mobileprovision`
- 系统负责把 IPA 自动签好并发给用户安装

## 11. 额外修正

- `backend/scripts/test-helpers.mjs`
  - `smoke` 默认地址已从 `http://127.0.0.1:3001` 改为 `http://127.0.0.1:58085`
  - 目的：和当前项目统一端口保持一致，避免脚本误报失败
