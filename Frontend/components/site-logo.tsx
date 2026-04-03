import { cn } from "@/lib/utils"

type SiteLogoProps = {
  className?: string
  alt?: string
  tone?: "auto" | "light" | "dark"
}

export function SiteLogo({ className, alt = "Triangle", tone = "auto" }: SiteLogoProps) {
  return (
    <img
      src="/site-logo.png"
      alt={alt}
      className={cn(
        "block select-none object-contain",
        tone === "light" ? "brightness-0" : tone === "auto" ? "brightness-0 dark:invert" : tone === "dark" ? "brightness-0 invert" : "",
        className,
      )}
    />
  )
}
