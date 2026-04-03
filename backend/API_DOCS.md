# Triangle Portal Backend API Guide

Base URL: `http://localhost:3001`

## Unified response format

All APIs return the same envelope:

```json
{
  "success": true,
  "code": 0,
  "message": "ok",
  "data": {},
  "timestamp": 1710000000000
}
```

Error responses keep the same structure with `success: false`.

## Error codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `40000` | Invalid request parameters |
| `40100` | Login required |
| `40300` | Permission denied |
| `40400` | Resource not found |
| `40500` | Method not allowed |
| `50000` | Internal server error |
| `10001` | User already exists |
| `10002` | User not found |
| `10003` | Wrong password |
| `10004` | Invalid token |
| `10005` | Expired token |
| `20001` | Duplicate slug |
| `20002` | App not found |
| `20003` | Post not found |
| `20004` | Topic not found |
| `20005` | Comment not found |
| `20006` | Request not found |

## Auth

### `POST /api/auth/login`

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### `GET /api/auth/me`

Header:

```http
Authorization: Bearer <token>
```

## System

### `GET /health`

Checks service status and database connectivity.

## Apps

### `GET /api/apps`

Query params:

- `page`
- `pageSize`
- `category`
- `status`
- `featured`
- `search`
- `sort`
- `order`

### `POST /api/apps`

Admin only.

```json
{
  "slug": "raycast",
  "name": "Raycast",
  "subtitle": "Launcher for macOS",
  "category": "Productivity",
  "version": "1.0.0",
  "size": "120 MB",
  "pricing": "Free",
  "summary": "Quick launcher and workflow tool",
  "compatibility": ["Apple Silicon"],
  "platforms": ["macOS"],
  "gallery": [],
  "tags": ["launcher"],
  "highlights": ["Fast search"],
  "requirements": ["macOS 13+"]
}
```

### `PUT /api/apps/:slug`

Admin only. Supports partial update.

### `DELETE /api/apps/:slug`

Admin only.

## Posts

### `GET /api/posts`

Supports `page`, `pageSize`, `category`, `status`, `featured`, `search`.

### `POST /api/posts`

Admin only.

```json
{
  "slug": "best-mac-tools",
  "title": "Best Mac Tools",
  "excerpt": "A short summary",
  "content": "<p>Full article</p>",
  "category": "Guides",
  "author": "Triangle Team",
  "coverImage": "https://example.com/cover.png",
  "readingTime": "5 min",
  "dateLabel": "March 2026",
  "publishedAt": "2026-03-29",
  "status": "published"
}
```

### `PUT /api/posts/:slug`

Admin only. Supports partial update.

### `DELETE /api/posts/:slug`

Admin only.

## Topics

### `GET /api/topics`

Admin list with optional `status`.

### `GET /api/topics/all`

Public published topics list.

### `POST /api/topics`

Admin only.

```json
{
  "slug": "mac-workflow",
  "title": "Mac Workflow",
  "description": "Topic landing content",
  "status": "published",
  "relatedAppSlugs": ["raycast"],
  "relatedPostSlugs": ["best-mac-tools"]
}
```

## Comments

### `GET /api/comments`

Required query:

- `contentId`
- `contentType` or `type`, value `app` or `post`

### `POST /api/comments`

```json
{
  "contentId": "raycast",
  "contentType": "app",
  "authorName": "Visitor",
  "content": "Useful app"
}
```

### `POST /api/comments/:id/like`

Like a comment.

### `POST /api/comments/:id/dislike`

Dislike a comment.

## Requests

### `GET /api/requests`

Public board with pagination.

### `POST /api/requests`

```json
{
  "title": "Add Affinity Photo",
  "description": "Please add a photo editor",
  "authorName": "Visitor",
  "authorEmail": "visitor@example.com"
}
```

### `GET /api/requests/admin/list`

Admin only.

### `PUT /api/requests/admin/:id`

Admin only.

```json
{
  "status": "done",
  "adminReply": "Scheduled for review"
}
```

### `DELETE /api/requests/admin/:id`

Admin only.

## Search

### `GET /api/search`

Query:

- `q` required
- `type` optional: `all`, `app`, `post`
- `page`
- `pageSize`

### `GET /api/search/hot`

Returns hot keywords.

## Admin

### `GET /api/admin/stats`

Admin only.

### `GET /api/admin/trends`

Admin only. Supports `days=1..90`.

### `GET /api/admin/recent`

Admin only. Supports `limit=1..20`.

### `GET /api/admin/requests`

Admin only. Same data as `/api/requests/admin/list`.

## Test account

- Username: `admin`
- Password: `admin123`

## Verification commands

```bash
npm run seed
npm run start
npm run smoke
npm run regression
```
