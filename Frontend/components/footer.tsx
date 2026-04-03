"use client"

import Link from "next/link"
import { languageOptions } from "@/lib/i18n"
import { useAppContext } from "@/components/app-provider"
import { SiteLogo } from "@/components/site-logo"

export function Footer() {
  const { language, setLanguage, siteSettings, t } = useAppContext()

  const footerLinks = {
    [t.footerLinks]: [
      { label: t.navHome, href: "/" },
      { label: t.navSoftware, href: "/software" },
      { label: t.navArticles, href: "/articles" },
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
    <footer className="border-t border-border bg-card mt-12">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-3 transition-opacity hover:opacity-80 w-fit">
              <SiteLogo className="h-9 w-auto" tone="auto" />
              <div>
                <div className="text-base font-black leading-none text-foreground font-mono">{siteSettings?.siteName ?? "Triangle"}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{t.brandTagline}</div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
              {siteSettings?.siteDescription ?? "把软件、文章和真实需求放到一个清楚的入口里。"}
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-foreground transition-colors hover:text-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.footerLanguage}</h3>
            <div className="flex flex-col items-start gap-1">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLanguage(option.value)}
                  className={`w-full rounded-full px-3 py-1.5 text-left text-sm transition-colors ${
                    option.value === language
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            © {new Date().getFullYear()} {siteSettings?.siteName ?? "Triangle"}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
