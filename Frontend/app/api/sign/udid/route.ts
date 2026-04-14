import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:58085"
const SIGN_UDID_COOKIE = "triangle-sign-udid"

function extractPlistValue(text: string, key: string) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<(?:string|data)>([\\s\\S]*?)</(?:string|data)>`, "i")
  const match = text.match(pattern)
  return match?.[1]?.trim() || ""
}

function redirectToDashboard(origin: string, params: Record<string, string>) {
  const url = new URL("/dashboard", origin)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}

async function readSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SIGN_UDID_COOKIE)?.value
  if (!raw) return null

  try {
    return JSON.parse(raw) as {
      token: string
      userId: number
      createdAt: number
    }
  } catch {
    return null
  }
}

async function persistUdid(request: Request, payload: Record<string, string>) {
  const session = await readSession()
  const origin = new URL(request.url).origin

  if (!session?.token) {
    return redirectToDashboard(origin, {
      signStatus: "udid-expired",
    })
  }

  if (!payload.UDID) {
    return redirectToDashboard(origin, {
      signStatus: "udid-failed",
      signMessage: "没有读取到设备 UDID，请重新安装描述文件后再试",
    })
  }

  const response = await fetch(`${API_BASE}/api/sign/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Token": session.token,
    },
    body: JSON.stringify({
      udid: payload.UDID,
      product: payload.PRODUCT,
      version: payload.VERSION,
      deviceName: payload.DEVICE_NAME,
      source: "profile_service",
    }),
    cache: "no-store",
  })

  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    return redirectToDashboard(origin, {
      signStatus: "udid-failed",
      signMessage: result?.message || "描述文件读取失败，请重新安装后再试",
    })
  }

  return redirectToDashboard(origin, {
    signStatus: "udid-success",
    udid: payload.UDID,
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  return persistUdid(request, {
    UDID: url.searchParams.get("UDID") || "",
    PRODUCT: url.searchParams.get("PRODUCT") || "",
    VERSION: url.searchParams.get("VERSION") || "",
    DEVICE_NAME: url.searchParams.get("DEVICE_NAME") || "",
  })
}

export async function POST(request: Request) {
  const text = await request.text()
  return persistUdid(request, {
    UDID: extractPlistValue(text, "UDID"),
    PRODUCT: extractPlistValue(text, "PRODUCT"),
    VERSION: extractPlistValue(text, "VERSION"),
    DEVICE_NAME: extractPlistValue(text, "DEVICE_NAME"),
  })
}
