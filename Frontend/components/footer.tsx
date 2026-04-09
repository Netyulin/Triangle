"use client"

import Link from "next/link"
import { useAppContext } from "@/components/app-provider"
import { SiteLogo } from "@/components/site-logo"

export function Footer() {
  const { siteSettings, t } = useAppContext()

  const footerLinks = {
    [t.footerLinks]: [
      { label: t.navHome, href: "/" },
      { label: t.navSoftware, href: "/software" },
      { label: t.navArticles, href: "/news" },
      { label: t.navRequests, href: "/requests" },
    ],
    [t.footerAccount]: [
      { label: t.login, href: "/login" },
      { label: t.register, href: "/register" },
      { label: t.profile, href: "/profile" },
      { label: t.navSearch, href: "/search" },
    ],
  }

  return (
    <footer className="footer-shell">
      <div className="container-custom py-10 md:py-12">
        <div className="footer-panel">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(0,0.8fr))]">
            <div>
              <Link href="/" className="mb-5 flex w-fit items-center gap-3 transition-opacity hover:opacity-80">
                <SiteLogo className="h-9 w-auto" tone="auto" />
                <div>
                  <div className="font-mono text-lg font-black leading-none text-foreground">{siteSettings?.siteName ?? "Triangle"}</div>
                  <div className="mt-1 text-[11px] tracking-[0.18em] text-muted-foreground">{t.brandTagline}</div>
                </div>
              </Link>
              <p className="max-w-sm text-[15px] leading-7 text-muted-foreground">
                {siteSettings?.siteDescription ?? "把软件、工具、文章和真实需求放到一个清晰、好找、值得信赖的入口里。"}
              </p>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="footer-title">{category}</h3>
                <ul className="space-y-3.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="footer-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border/70 pt-5">
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} {siteSettings?.siteName ?? "Triangle"}。保留所有权利。
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
