# 软件新建和编辑 API 接口说明

更新时间：2026-04-22

本文档基于当前后端代码实现整理（以代码为准）：
- `backend/src/routes/apps.js`
- `backend/src/controllers/appController.js`
- `backend/src/utils/response.js`
- `backend/src/middleware/validate.js`
- `backend/src/middleware/auth.js`

说明：项目约定提到先读 `graphify-out/GRAPH_REPORT.md`，但当前仓库中未找到该文件。

## 1. 新建软件

- 方法：`POST`
- 路径：`/api/apps`
- 权限：必须登录且为管理员（`admin`）
- 鉴权头：
  - `Authorization: Bearer <token>`
  - 或 `X-Token: <token>`

### 1.1 必填字段

- `slug`
- `name`
- `subtitle`
- `category`
- `version`
- `size`
- `pricing`
- `summary`

### 1.2 可选字段

- 字符串：`icon`、`heroImage`、`review`、`downloads`、`updatedAt`、`seoTitle`、`seoDescription`、`downloadUrl`
- 枚举：
  - `displayMode`：`cover | icon`
  - `status`：`published | hidden | archived`
  - `accessLevel`：`free | sponsor | lifetime | supreme | member | premium | vip`
- 数值：
  - `rating`：`0~5`（float）
  - `editorialScore`：`0~100`（int）
- 布尔：`featured`、`verified`、`isDownloadable`
- 数组：`compatibility`、`platforms`、`gallery`、`tags`、`highlights`、`requirements`、`downloadLinks`

### 1.3 服务端规则

- `slug` 必须唯一；重复时返回 `409`，业务码 `20001`（`SLUG_EXISTS`）。
- `status` 不传默认 `hidden`。
- `isDownloadable` 不传默认 `true`。
- `updatedAt` 不传默认当天日期（`YYYY-MM-DD`）。
- `downloadLinks` 优先；若未提供，会尝试使用 `downloadUrl` 生成默认下载项。

### 1.4 请求示例

```json
{
  "slug": "raycast",
  "name": "Raycast",
  "subtitle": "Mac launcher",
  "category": "Productivity",
  "version": "1.0.0",
  "size": "120 MB",
  "pricing": "Free",
  "summary": "Quick launcher",
  "status": "published",
  "platforms": ["macOS"],
  "downloadUrl": "https://example.com/dl"
}
```

### 1.5 成功响应

- HTTP：`201`
- `message`：`created`

```json
{
  "success": true,
  "code": 0,
  "message": "created",
  "data": {
    "...": "应用对象（序列化后）"
  },
  "timestamp": 1710000000000
}
```

## 2. 编辑软件

- 方法：`PUT`
- 路径：`/api/apps/:slug`
- 权限：必须登录且为管理员（`admin`）
- 鉴权头：
  - `Authorization: Bearer <token>`
  - 或 `X-Token: <token>`

### 2.1 参数与更新方式

- 路径参数：`:slug`（必填）
- 请求体：支持部分更新（只传需要修改的字段）
- 字段校验规则与新建一致，但在编辑接口中均为可选

### 2.2 服务端规则

- 若路径中的 `:slug` 不存在，返回 `404`，业务码 `20002`（`APP_NOT_FOUND`）。
- 支持修改 `slug`；若新 `slug` 已存在，返回 `409`，业务码 `20001`（`SLUG_EXISTS`）。
- 未传字段保持原值。

### 2.3 请求示例

```json
{
  "name": "Raycast Pro",
  "status": "published",
  "featured": true,
  "downloadLinks": [
    {
      "name": "官方",
      "url": "https://example.com/new-dl"
    }
  ]
}
```

### 2.4 成功响应

- HTTP：`200`
- `message`：`updated`

```json
{
  "success": true,
  "code": 0,
  "message": "updated",
  "data": {
    "...": "应用对象（序列化后）"
  },
  "timestamp": 1710000000000
}
```

## 3. 统一错误与响应格式

### 3.1 统一响应结构

```json
{
  "success": true,
  "code": 0,
  "message": "ok",
  "data": {},
  "timestamp": 1710000000000
}
```

### 3.2 相关错误码

- `40000`：参数错误（HTTP 400）
- `40100`：未登录（HTTP 401）
- `40300` / `10006`：无权限或非管理员（HTTP 403）
- `20001`：`slug` 冲突（HTTP 409）
- `20002`：软件不存在（HTTP 404）


## 4. 软件详情导入（新增）

- 方法：`POST`
- 路径：`/api/apps/import-from-url`
- 权限：必须登录且为管理员（`admin`）
- 用途：像文章发布一样，支持从网页 URL 抓取，或直接提交 HTML 文本解析后填充软件详情字段。

### 4.1 请求体

- 二选一必填：
  - `url: string`（网页地址）
  - `rawContent: string`（HTML 或纯文本内容）

```json
{
  "url": "https://example.com/post"
}
```

或：

```json
{
  "rawContent": "<html><body><h1>软件标题</h1><p>这里是详情</p></body></html>"
}
```

### 4.2 成功响应

- HTTP：`200`
- `message`：`imported`

```json
{
  "success": true,
  "code": 0,
  "message": "imported",
  "data": {
    "sourceUrl": "https://example.com/post",
    "finalUrl": "https://example.com/post",
    "name": "软件标题",
    "subtitle": "自动提取的摘要",
    "heroImage": "/uploads/images/xxx.png",
    "summary": "<p>自动提取并本地化图片后的 HTML</p>",
    "review": "自动提取的摘要",
    "highlights": ["自动提取的摘要"],
    "readingTime": "3",
    "siteName": "站点名",
    "publishedAt": "",
    "warnings": []
  },
  "timestamp": 1710000000000
}
```
