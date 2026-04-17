import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AppProvider } from "@/components/app-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { TranslateScript } from "@/components/translate-script"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "三角软件 - 小众软件工具资讯下载站",
  description: "三角软件 - 帮你整理软件、文章和真实需求。专注小众软件、工具、游戏资源分享",
  keywords: ["软件下载", "工具分享", "小众软件", "游戏资源", "资讯"],
  authors: [{ name: "三角软件" }],
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon-light-32x32.png",
        type: "image/png",
      },
    ],
    apple: "/icon-light-32x32.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppProvider>{children}</AppProvider>
        </ThemeProvider>
        <TranslateScript />
      </body>
    </html>
  )
}
