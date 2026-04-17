import Image from "next/image"
import { cn } from "@/lib/utils"

type SiteLogoProps = {
  className?: string
  alt?: string
  tone?: "auto" | "light" | "dark"
}

export function SiteLogo({ className, alt = "三角软件", tone = "auto" }: SiteLogoProps) {
  return (
    <Image
      src="/site-logo.png"
      alt={alt}
      width={240}
      height={80}
      priority
      className={cn(
        "block select-none object-contain",
        tone === "light" ? "brightness-0" : tone === "auto" ? "brightness-0 dark:invert" : tone === "dark" ? "brightness-0 invert" : "",
        className,
      )}
    />
  )
}
