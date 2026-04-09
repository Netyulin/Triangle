import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:58085'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
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
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const apiUrl = `${API_BASE}/api/${pathStr}`
  const body = await request.text()

  const headers = buildProxyHeaders(request)
  headers['Content-Type'] = 'application/json'

  const response = await fetch(apiUrl, { method: 'POST', headers, body })
  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const apiUrl = `${API_BASE}/api/${pathStr}`
  const body = await request.text()

  const headers = buildProxyHeaders(request)
  headers['Content-Type'] = 'application/json'

  const response = await fetch(apiUrl, { method: 'PUT', headers, body })
  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const apiUrl = `${API_BASE}/api/${pathStr}`

  const response = await fetch(apiUrl, {
    method: 'DELETE',
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const apiUrl = `${API_BASE}/api/${pathStr}`
  const body = await request.text()

  const headers = buildProxyHeaders(request)
  headers['Content-Type'] = 'application/json'

  const response = await fetch(apiUrl, { method: 'PATCH', headers, body })
  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
