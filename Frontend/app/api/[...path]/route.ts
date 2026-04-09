import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:54735'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = `${API_BASE}/api/${pathStr}${request.nextUrl.search}`
  try {
    const response = await fetch(url, {
      headers: {
        ...Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) => !['host', 'connection'].includes(key.toLowerCase())
          )
        ),
      },
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
    return NextResponse.json(
      { success: false, code: 500, message: 'Proxy error', data: null },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = `${API_BASE}/api/${pathStr}`
  try {
    const body = await request.text()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) => !['host', 'connection', 'content-length'].includes(key.toLowerCase())
          )
        ),
      },
      body,
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
    return NextResponse.json(
      { success: false, code: 500, message: 'Proxy error', data: null },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = `${API_BASE}/api/${pathStr}`
  try {
    const body = await request.text()
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) => !['host', 'connection', 'content-length'].includes(key.toLowerCase())
          )
        ),
      },
      body,
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
    return NextResponse.json(
      { success: false, code: 500, message: 'Proxy error', data: null },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = `${API_BASE}/api/${pathStr}`
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) => !['host', 'connection'].includes(key.toLowerCase())
          )
        ),
      },
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
    return NextResponse.json(
      { success: false, code: 500, message: 'Proxy error', data: null },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = `${API_BASE}/api/${pathStr}`
  try {
    const body = await request.text()
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) => !['host', 'connection', 'content-length'].includes(key.toLowerCase())
          )
        ),
      },
      body,
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
    return NextResponse.json(
      { success: false, code: 500, message: 'Proxy error', data: null },
      { status: 500 }
    )
  }
}
