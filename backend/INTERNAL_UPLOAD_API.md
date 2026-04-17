# 内部直传图片接口说明（2026-04-15）

## 目标

提供一个无需登录态、无需 token 的上传接口，供你本机脚本直接上传图片到 VPS。

## 安全机制

- 使用长密码校验（请求头 `x-upload-password`）。
- 密码从环境变量 `INTERNAL_UPLOAD_PASSWORD` 读取。
- 未配置密码时，接口返回 404（默认关闭状态）。

## 接口信息

- 方法：`POST`
- 路径：`/api/assets/images/local-upload`
- Content-Type：`multipart/form-data`
- 文件字段：`image`
- 可选字段：`kind`（`post-cover` 或 `app-cover`）

## 环境变量

在后端 `.env` 增加：

```env
INTERNAL_UPLOAD_PASSWORD=请设置32-64位随机长密码
```

## 调用示例

```bash
curl -X POST "https://api.sanjiaosoft.com/api/assets/images/local-upload" \
  -H "x-upload-password: 替换为你的长密码" \
  -F "image=@/path/to/demo.jpg" \
  -F "kind=post-cover"
```

## 返回

成功时返回结构与后台图片上传一致，包含 `path/mimeType/size`。
