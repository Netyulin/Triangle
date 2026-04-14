import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:58085"
const SIGN_UDID_COOKIE = "triangle-sign-udid"

export async function POST(request: Request) {
  const token = request.headers.get("x-token") || ""
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "请先登录后再获取 UDID",
      },
      { status: 401 },
    )
  }

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      "X-Token": token,
    },
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      {
        success: false,
        message: payload.message || "登录状态已失效，请重新登录",
      },
      { status: response.status || 401 },
    )
  }

  const cookieStore = await cookies()
  cookieStore.set(SIGN_UDID_COOKIE, JSON.stringify({
    token,
    userId: payload.data.user.id,
    createdAt: Date.now(),
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  })

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004"

  return NextResponse.json({
    success: true,
    data: {
      installUrl: `${origin}/api/sign/udid/profile`,
    },
  })
}
