import { NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:58085"

// 激活描述文件
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("x-token") || ""
  const { id } = await params

  const response = await fetch(`${API_BASE}/api/sign/profiles/${id}`, {
    method: "PATCH",
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

// 更新描述文件
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("x-token") || ""
  const { id } = await params
  const body = await request.text()

  const response = await fetch(`${API_BASE}/api/sign/profiles/${id}`, {
    method: "PUT",
    headers: {
      ...(token ? { "X-Token": token } : {}),
      "Content-Type": "application/json",
    },
    body,
  })

  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  })
}

// 删除描述文件
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("x-token") || ""
  const { id } = await params

  const response = await fetch(`${API_BASE}/api/sign/profiles/${id}`, {
    method: "DELETE",
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
