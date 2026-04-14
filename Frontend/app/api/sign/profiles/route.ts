import { NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:58085"

// 获取描述文件列表
export async function GET(request: Request) {
  const token = request.headers.get("x-token") || ""

  const response = await fetch(`${API_BASE}/api/sign/profiles`, {
    headers: token ? { "X-Token": token } : undefined,
  })

  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  })
}

// 上传描述文件
export async function POST(request: Request) {
  const formData = await request.formData()
  const token = request.headers.get("x-token") || ""

  const response = await fetch(`${API_BASE}/api/sign/profiles`, {
    method: "POST",
    headers: token ? { "X-Token": token } : undefined,
    body: formData,
  })

  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  })
}
