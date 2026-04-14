import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SIGN_UDID_COOKIE = "triangle-sign-udid"

function buildMobileConfig(callbackUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${callbackUrl}</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>PRODUCT</string>
      <string>VERSION</string>
      <string>DEVICE_NAME</string>
    </array>
  </dict>
  <key>PayloadOrganization</key>
  <string>Triangle</string>
  <key>PayloadDisplayName</key>
  <string>Triangle UDID 获取描述文件</string>
  <key>PayloadIdentifier</key>
  <string>com.triangle.sign.udid</string>
  <key>PayloadUUID</key>
  <string>5B1E4A4D-8A8C-44D9-8E2E-7FCE965B0781</string>
  <key>PayloadType</key>
  <string>Profile Service</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const session = cookieStore.get(SIGN_UDID_COOKIE)?.value

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "UDID 会话已过期，请返回控制台重新发起",
      },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const callbackUrl = `${url.origin}/api/sign/udid`
  const mobileConfig = buildMobileConfig(callbackUrl)

  return new NextResponse(mobileConfig, {
    status: 200,
    headers: {
      "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
      "Content-Disposition": "attachment; filename=triangle-udid.mobileconfig",
      "Cache-Control": "no-store",
    },
  })
}
