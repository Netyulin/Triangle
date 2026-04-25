import { NextRequest, NextResponse } from 'next/server'

const API_BASE = (
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:58085'
).replace(/\/$/, '')

function toProxyErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'unknown proxy error'
  return NextResponse.json(
    {
      success: false,
      code: 500,
      message: `server error: ${message}`,
      data: null,
      timestamp: Date.now(),
    },
    { status: 500 },
  )
}

function buildProxyPath(path: string[]) {
  return path
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment))
      } catch {
        return encodeURIComponent(segment)
      }
    })
    .join('/')
}

function buildProxyHeaders(request: NextRequest): Record<string, string> {
  // 显式提取所有认证相关 header
  const headers: Record<string, string> = {}
  const auth = request.headers.get('authorization')
  if (auth) headers['Authorization'] = auth
  const xToken = request.headers.get('x-token')
  if (xToken) headers['x-token'] = xToken
  // 透传其他必要 header
  const userAgent = request.headers.get('user-agent')
  if (userAgent) headers['user-agent'] = userAgent
  const referer = request.headers.get('referer')
  if (referer) headers['referer'] = referer
  return headers
}

async function forwardWithBody(request: NextRequest, method: string, pathStr: string) {
  try {
    const apiUrl = `${API_BASE}/api/${pathStr}${request.nextUrl.search}`
    const headers = buildProxyHeaders(request)
    const contentType = request.headers.get('content-type')
    if (contentType) {
      headers['Content-Type'] = contentType
    }

    const bodyBuffer = await request.arrayBuffer()

    const response = await fetch(apiUrl, {
      method,
      headers,
      body: bodyBuffer,
    })
    const output = await response.arrayBuffer()

    return new NextResponse(output, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return toProxyErrorResponse(error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const pathStr = buildProxyPath(path)
    const search = request.nextUrl.search
    const apiUrl = `${API_BASE}/api/${pathStr}${search}`

    const response = await fetch(apiUrl, {
      headers: buildProxyHeaders(request),
    })
    const text = await response.text()

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return toProxyErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = buildProxyPath(path)
  return forwardWithBody(request, 'POST', pathStr)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = buildProxyPath(path)
  return forwardWithBody(request, 'PUT', pathStr)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = buildProxyPath(path)
  return forwardWithBody(request, 'DELETE', pathStr)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = buildProxyPath(path)
  return forwardWithBody(request, 'PATCH', pathStr)
}
