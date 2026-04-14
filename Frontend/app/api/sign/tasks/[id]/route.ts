import { NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:58085"

// 获取单个签名任务详情（用于 SWR 单任务轮询）
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("x-token") || ""
  const { id } = await params

  const response = await fetch(`${API_BASE}/api/sign/tasks/${id}`, {
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
