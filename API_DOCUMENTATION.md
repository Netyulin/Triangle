# Triangle 项目前后端联调API文档
## 基础信息
- **接口前缀**：所有API接口均以 `/api` 为前缀
- **数据格式**：请求和响应均使用 JSON 格式
- **认证方式**：需要登录的接口在请求头中携带 `Authorization: Bearer <token>`
- **响应格式**：
  ```json
  {
    "success": boolean,
    "code": number,
    "message": string,
    "data": any
  }
  ```
- **错误码**：
  - `200`：成功
  - `400`：参数错误
  - `401`：未登录/认证失败
  - `403`：权限不足
  - `404`：资源不存在
  - `500`：服务器内部错误

---

## 1. 认证模块 `/api/auth`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/register` | POST | 无需登录 | 用户注册 |
| `/login` | POST | 无需登录 | 用户登录 |
| `/me` | GET | 需要登录 | 获取当前用户信息 |
| `/permissions` | GET | 需要登录 | 获取当前用户权限 |
| `/profile` | GET | 需要登录 | 获取当前用户资料 |
| `/profile` | PUT | 需要登录 | 更新当前用户资料 |
| `/favorites` | GET | 需要登录 | 获取收藏列表 |
| `/favorites` | POST | 需要登录 | 切换收藏状态 |
| `/recharge` | POST | 需要登录 | 创建充值订单 |

### 请求参数示例
#### 注册 `/register`
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "inviteCode": "string（可选）"
}
```
#### 登录 `/login`
```json
{
  "email": "string",
  "password": "string"
}
```
#### 更新资料 `/profile`
```json
{
  "nickname": "string（可选）",
  "avatar": "string（可选）",
  "bio": "string（可选）"
}
```
#### 切换收藏 `/favorites`
```json
{
  "type": "app | post",
  "targetId": "number"
}
```

---

## 2. 首页模块 `/api/home`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 无需登录 | 获取首页统计数据 |

---

## 3. 软件应用模块 `/api/apps`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 可选登录 | 获取软件列表 |
| `/featured` | GET | 无需登录 | 获取精选软件 |
| `/categories` | GET | 无需登录 | 获取软件分类 |
| `/import-from-url` | POST | 管理员 | 从URL导入软件 |
| `/:slug/access` | GET | 可选登录 | 记录软件访问 |
| `/:slug/netdisk-reports` | POST | 可选登录 | 提交网盘失效报告 |
| `/:slug` | GET | 可选登录 | 获取软件详情 |
| `/` | POST | 管理员 | 创建软件 |
| `/:slug` | PUT | 管理员 | 更新软件 |
| `/:slug` | DELETE | 管理员 | 删除软件 |

### 请求参数示例
#### 获取软件列表 `/`
| 参数 | 类型 | 可选 | 描述 |
|------|------|------|------|
| page | number | 是 | 页码，默认1 |
| limit | number | 是 | 每页数量，默认20 |
| category | string | 是 | 分类名称 |
| search | string | 是 | 搜索关键词 |
| sort | string | 是 | 排序方式：latest, popular, downloads |

#### 创建软件 `/`
```json
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "content": "string",
  "category": "string",
  "cover": "string",
  "downloadUrl": "string",
  "version": "string",
  "size": "string",
  "isFeatured": "boolean（可选）"
}
```

---

## 4. 文章模块 `/api/posts`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 可选登录 | 获取文章列表 |
| `/featured` | GET | 无需登录 | 获取精选文章 |
| `/categories` | GET | 无需登录 | 获取文章分类 |
| `/:slug` | GET | 可选登录 | 获取文章详情 |
| `/` | POST | 管理员 | 创建文章 |
| `/:slug` | PUT | 管理员 | 更新文章 |
| `/:slug` | DELETE | 管理员 | 删除文章 |

### 请求参数示例
#### 获取文章列表 `/`
| 参数 | 类型 | 可选 | 描述 |
|------|------|------|------|
| page | number | 是 | 页码，默认1 |
| limit | number | 是 | 每页数量，默认20 |
| category | string | 是 | 分类名称 |
| search | string | 是 | 搜索关键词 |
| sort | string | 是 | 排序方式：latest, popular |

---

## 5. 搜索模块 `/api/search`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 无需登录 | 全局搜索 |
| `/hot` | GET | 无需登录 | 获取热门搜索词 |
| `/hot-searches` | GET | 无需登录 | 获取热门搜索词（别名） |

### 请求参数示例
#### 搜索 `/`
| 参数 | 类型 | 可选 | 描述 |
|------|------|------|------|
| q | string | 否 | 搜索关键词 |
| type | string | 是 | 搜索类型：all, app, post，默认all |
| page | number | 是 | 页码，默认1 |
| limit | number | 是 | 每页数量，默认20 |

---

## 6. 下载模块 `/api/downloads`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/:slug` | GET | 无需登录 | 获取下载信息 |
| `/:slug/ad-click` | POST | 无需登录 | 记录广告点击 |

---

## 7. 评论模块 `/api/comments`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 可选登录 | 获取评论列表 |
| `/` | POST | 可选登录 | 发表评论 |
| `/:id/like` | POST | 需要登录 | 点赞评论 |
| `/:id/dislike` | POST | 需要登录 | 点踩评论 |
| `/:id` | DELETE | 需要登录 | 删除自己的评论 |

### 请求参数示例
#### 获取评论列表 `/`
| 参数 | 类型 | 可选 | 描述 |
|------|------|------|------|
| targetType | string | 否 | 目标类型：app, post |
| targetId | number | 否 | 目标ID |
| page | number | 是 | 页码，默认1 |
| limit | number | 是 | 每页数量，默认20 |

#### 发表评论 `/`
```json
{
  "targetType": "app | post",
  "targetId": "number",
  "content": "string",
  "parentId": "number（可选，回复评论时传）"
}
```

---

## 8. 反馈模块 `/api/feedback`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 无需登录 | 获取反馈列表 |
| `/` | POST | 无需登录 | 提交反馈 |

### 请求参数示例
#### 提交反馈 `/`
```json
{
  "email": "string",
  "content": "string",
  "type": "bug | feature | other（可选）"
}
```

---

## 9. 话题模块 `/api/topics`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 可选登录 | 获取话题列表 |
| `/all` | GET | 无需登录 | 获取所有话题 |
| `/:slug` | GET | 可选登录 | 获取话题详情 |
| `/` | POST | 管理员 | 创建话题 |
| `/:slug` | PUT | 管理员 | 更新话题 |
| `/:slug` | DELETE | 管理员 | 删除话题 |

---

## 10. 需求请求模块 `/api/requests`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 可选登录 | 获取公开请求列表 |
| `/` | POST | 可选登录 | 提交请求 |
| `/mine` | GET | 需要登录 | 获取自己的请求列表 |
| `/:id` | DELETE | 需要登录 | 删除自己的请求 |
| `/:id/vote` | POST | 需要登录 | 为请求投票 |

### 请求参数示例
#### 提交请求 `/`
```json
{
  "title": "string",
  "description": "string",
  "type": "app | feature | other"
}
```

---

## 11. 广告模块 `/api/ads`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 无需登录 | 获取广告位列表 |
| `/slots/:id` | GET | 无需登录 | 获取广告位详情 |
| `/content/click` | POST | 无需登录 | 记录广告点击 |
| `/content/:slotId` | GET | 无需登录 | 获取广告位内容 |

---

## 12. 通知模块 `/api/notifications`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 需要登录 | 获取通知列表 |
| `/unread-count` | GET | 需要登录 | 获取未读通知数量 |
| `/read-all` | PATCH | 需要登录 | 标记所有通知为已读 |
| `/:id/read` | PATCH | 需要登录 | 标记单条通知为已读 |
| `/:id` | DELETE | 需要登录 | 删除通知 |

---

## 13. 支付模块 `/api/payment`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/create-order` | POST | 需要登录 | 创建支付订单 |
| `/orders` | GET | 需要登录 | 获取订单列表 |
| `/order/:orderNo/cancel` | POST | 需要登录 | 取消订单 |
| `/balance` | GET | 需要登录 | 获取账户余额 |
| `/membership-levels` | GET | 需要登录 | 获取会员等级列表 |
| `/upgrade-membership` | POST | 需要登录 | 升级会员 |
| `/webhook/wechat` | POST | 无需登录 | 微信支付回调 |
| `/webhook/alipay` | POST | 无需登录 | 支付宝支付回调 |

### 请求参数示例
#### 创建订单 `/create-order`
```json
{
  "amount": "number",
  "type": "recharge | membership",
  "levelId": "number（会员升级时需要）"
}
```

#### 升级会员 `/upgrade-membership`
```json
{
  "levelId": "number"
}
```

---

## 14. 设置模块 `/api/settings`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/` | GET | 无需登录 | 获取公共设置 |

---

## 15. 资源上传模块 `/api/assets`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/images/upload` | POST | 管理员 | 上传图片 |
| `/images/import` | POST | 管理员 | 从URL导入图片 |
| `/images/local-upload` | POST | 内部服务 | 内部上传图片 |

### 上传字段要求
#### 图片上传 `/images/upload`
- **请求格式**：multipart/form-data
- **字段**：
  | 字段名 | 类型 | 可选 | 描述 |
  |--------|------|------|------|
  | image | file | 否 | 图片文件 |
  | kind | string | 是 | 图片类型：post-cover（文章封面，默认）、app-cover（软件封面） |
- **限制**：
  - 支持格式：JPG、PNG、WebP、GIF、SVG
  - 大小限制：8MB以内

#### 图片导入 `/images/import`
```json
{
  "url": "string（图片URL）",
  "kind": "string（可选，post-cover/app-cover）"
}
```

---

## 16. 签名模块 `/api/sign`
| 接口地址 | 请求方法 | 权限要求 | 描述 |
|---------|---------|---------|------|
| `/devices` | GET | 需要登录 | 获取我的设备列表 |
| `/devices` | POST | 需要登录 | 添加/更新设备 |
| `/config` | GET | 需要登录 | 获取签名配置 |
| `/certificates` | GET | 需要登录 | 获取我的证书列表 |
| `/bundles` | POST | 需要登录 | 上传签名方案（证书+描述文件） |
| `/certificates` | POST | 需要登录 | 上传证书 |
| `/certificates/:id/activate` | PATCH | 需要登录 | 激活证书 |
| `/certificates/:id` | DELETE | 需要登录 | 删除证书 |
| `/profiles` | GET | 需要登录 | 获取我的描述文件列表 |
| `/profiles` | POST | 需要登录 | 上传描述文件 |
| `/profiles/:id/activate` | PATCH | 需要登录 | 激活描述文件 |
| `/profiles/:id` | PUT | 需要登录 | 更新描述文件 |
| `/profiles/:id` | DELETE | 需要登录 | 删除描述文件 |
| `/tasks` | GET | 需要登录 | 获取我的签名任务列表 |
| `/tasks` | POST | 需要登录 | 创建签名任务 |
| `/tasks/:taskId` | GET | 需要登录 | 获取签名任务详情 |

### 上传字段要求
#### IPA上传（创建签名任务）`/tasks`
- **请求格式**：multipart/form-data
- **字段**：
  | 字段名 | 类型 | 可选 | 描述 |
  |--------|------|------|------|
  | ipa | file | 否 | IPA安装包文件 |
  | name | string | 是 | 任务名称 |
  | certificateId | number | 是 | 证书ID |
  | profileId | number | 是 | 描述文件ID |
- **限制**：
  - 大小限制：默认1GB以内（可通过环境变量调整）

#### 证书上传 `/certificates`
- **请求格式**：multipart/form-data
- **字段**：
  | 字段名 | 类型 | 可选 | 描述 |
  |--------|------|------|------|
  | certificate | file | 否 | p12证书文件 |
  | name | string | 否 | 证书名称（最长120字符） |
  | password | string | 否 | 证书密码（最长200字符） |
  | isActive | boolean | 是 | 是否激活 |
- **限制**：
  - 大小限制：10MB以内

#### 描述文件上传 `/profiles`
- **请求格式**：multipart/form-data
- **字段**：
  | 字段名 | 类型 | 可选 | 描述 |
  |--------|------|------|------|
  | profile | file | 否 | mobileprovision描述文件 |
  | name | string | 否 | 描述文件名称（最长120字符） |
  | note | string | 是 | 备注（最长300字符） |
  | isActive | boolean | 是 | 是否激活 |
- **限制**：
  - 大小限制：5MB以内

#### 签名方案批量上传 `/bundles`
- **请求格式**：multipart/form-data
- **字段**：
  | 字段名 | 类型 | 可选 | 描述 |
  |--------|------|------|------|
  | certificate | file | 否 | p12证书文件 |
  | profile | file | 否 | mobileprovision描述文件 |
  | certName | string | 否 | 证书名称 |
  | certPassword | string | 否 | 证书密码 |
  | profileName | string | 否 | 描述文件名称 |
  | profileNote | string | 是 | 描述文件备注 |

---

## 17. 管理后台模块 `/api/admin`
### 17.1 统计管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/stats` | GET | 获取站点统计数据 |
| `/trends` | GET | 获取趋势统计 |
| `/recent` | GET | 获取最近操作记录 |
| `/active-ips` | GET | 获取活跃IP列表 |

### 17.2 设置管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/settings` | GET | 获取管理后台设置 |
| `/settings` | PUT | 更新管理后台设置 |

### 17.3 邀请码管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/invite-codes` | GET | 获取邀请码列表 |
| `/invite-codes/batch` | POST | 批量生成邀请码 |

### 17.4 用户管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/users` | GET | 获取用户列表 |
| `/users/levels` | GET | 获取用户等级列表 |
| `/users/:id` | PATCH | 更新用户信息 |
| `/users/:id/password` | PATCH | 重置用户密码 |
| `/users/:id` | DELETE | 删除用户 |

### 17.5 等级管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/levels` | GET | 获取等级列表 |
| `/levels` | POST | 创建等级 |
| `/levels/:key` | PUT | 更新等级 |
| `/levels/:key` | DELETE | 删除等级 |

### 17.6 通知管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/notification-templates` | GET | 获取通知模板列表 |
| `/notification-templates/:key` | PUT | 更新通知模板 |
| `/notifications/send` | POST | 发送广播通知 |
| `/notifications/users/:id` | POST | 给指定用户发送通知 |

### 17.7 内容选择器
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/content-picker/apps` | GET | 软件选择器 |
| `/content-picker/posts` | GET | 文章选择器 |

### 17.8 请求管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/requests` | GET | 获取请求列表 |
| `/requests/:id` | PUT | 更新请求 |
| `/requests/:id` | DELETE | 删除请求 |

### 17.9 话题管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/topics` | POST | 创建话题 |
| `/topics/:slug` | PUT | 更新话题 |
| `/topics/:slug` | DELETE | 删除话题 |

### 17.10 分类管理
#### 软件分类
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/app-categories` | GET | 获取软件分类列表 |
| `/app-categories` | POST | 创建软件分类 |
| `/app-categories/order` | PUT | 调整软件分类排序 |
| `/app-categories/:name` | PUT | 更新软件分类 |
| `/app-categories/:name` | DELETE | 删除软件分类 |

#### 文章分类
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/post-categories` | GET | 获取文章分类列表 |
| `/post-categories` | POST | 创建文章分类 |
| `/post-categories/order` | PUT | 调整文章分类排序 |
| `/post-categories/:name` | PUT | 更新文章分类 |
| `/post-categories/:name` | DELETE | 删除文章分类 |

### 17.11 网盘报告管理
| 接口地址 | 请求方法 | 描述 |
|---------|---------|------|
| `/netdisk-reports` | GET | 获取网盘报告列表 |
| `/netdisk-reports/:id` | PATCH | 处理网盘报告 |

---

## 上传字段汇总表
| 上传类型 | 字段名 | 格式要求 | 大小限制 | 额外参数 |
|---------|--------|----------|----------|----------|
| 文章/软件封面 | image | JPG/PNG/WebP/GIF/SVG | 8MB | kind: post-cover/app-cover |
| IPA安装包 | ipa | .ipa | 1GB | name, certificateId, profileId |
| 证书文件 | certificate | .p12 | 10MB | name, password, isActive |
| 描述文件 | profile | .mobileprovision | 5MB | name, note, isActive |
| 签名方案 | certificate + profile | 同上 | 分别限制 | certName, certPassword, profileName, profileNote |

---

**文档版本**：1.0  
**更新日期**：2024-04-16
