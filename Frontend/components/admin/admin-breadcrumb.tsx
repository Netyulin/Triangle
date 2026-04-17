import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  AdminBreadcrumb – 面包屑导航                                        */
/*  根据当前 pathname 自动生成层级路径                                  */
/* ------------------------------------------------------------------ */

export function AdminBreadcrumb() {
  const pathname = usePathname()

  // Only show breadcrumb under /admin
  if (!pathname?.startsWith("/admin") || pathname === "/admin") {
    return null
  }

  const segments = generateBreadcrumbs(pathname)

  if (segments.length <= 1) return null

  return (
    <nav aria-label="面包屑导航" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link
            href="/admin"
            className="flex items-center gap-1 transition hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="max-[640px]:hidden">后台</span>
          </Link>
        </li>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1

          return (
            <li key={segment.href} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
              {isLast ? (
                <span className="font-medium text-foreground">{segment.label}</span>
              ) : (
                <Link
                  href={segment.href}
                  className="transition hover:text-foreground"
                >
                  {segment.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Breadcrumb data generation                                         */
/* ------------------------------------------------------------------ */

interface Crumb {
  href: string
  label: string
}

function generateBreadcrumbs(pathname: string): Crumb[] {
  // Strip /admin prefix and split
  const rest = pathname.replace(/^\/admin\/?/, "")

  // No sub-path
  if (!rest) return []

  // Handle query strings (e.g., /admin/apps/new?slug=xxx)
  const pathPart = rest.split("?")[0]
  const segments = pathPart.split("/").filter(Boolean)

  const crumbs: Crumb[] = []
  let currentPath = "/admin"

  for (let i = 0; i < segments.length; i++) {
    currentPath += "/" + segments[i]

    // Map known paths to labels
    let label = segmentLabel(currentPath)

    // For edit pages with slug, check parent path
    if (!label && i > 0) {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/"))
      const parentLabel = segmentLabel(parentPath)
      const lastSegment = segments[i]
      // If it looks like an edit page (new?slug=xxx)
      if (parentLabel && lastSegment === "new") {
        const isEdit = pathname.includes("slug=")
        label = isEdit ? `编辑${parentLabel.replace(/管理$/, "")}` : `新建${parentLabel.replace(/管理$/, "")}`
      }
    }

    // Fallback: capitalize the segment
    if (!label) {
      label = segments[i]
        .replace(/-/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
    }

    crumbs.push({ href: currentPath, label })
  }

  return crumbs
}

/** Known route → Chinese label mapping */
function segmentLabel(path: string): string | undefined {
  const map: Record<string, string> = {
    "/admin/posts":           "文章管理",
    "/admin/apps":            "软件管理",
    "/admin/app-categories":  "分类管理",
    "/admin/topics":          "专题管理",
    "/admin/submissions":     "需求管理",
    "/admin/ad-slots":        "广告位管理",
    "/admin/ad-contents":     "广告内容管理",
    "/admin/ads-stats":       "广告数据",
    "/admin/signing":         "应用签名管理",
    "/admin/levels":          "等级管理",
    "/admin/netdisk-reports": "失效报告",
    "/admin/account":         "账号设置",
    "/admin/users":           "用户管理",
    "/admin/invite-codes":    "邀请码管理",
    "/admin/announcements":   "站点公告",
    "/admin/notification-templates": "站内信模板",
    "/admin/settings":        "系统设置",

    // Sub-pages
    "/admin/apps/new":        "新建软件",
    "/admin/posts/new":       "新建文章",
    "/admin/sign-certificates": "证书管理",
    "/admin/sign-profiles":   "描述文件管理",
    "/admin/topics/new":      "新建专题",
    "/admin/app-categories/new": "新建分类",
  }
  return map[path]
}
