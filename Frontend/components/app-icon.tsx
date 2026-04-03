"use client"

import { cn, looksLikeImageUrl, resolveAssetUrl } from "@/lib/utils"

type AppIconProps = {
  value?: string | null
  name: string
  className?: string
  imageClassName?: string
}

export function AppIcon({ value, name, className, imageClassName }: AppIconProps) {
  const source = String(value || "").trim()
  if (source && looksLikeImageUrl(source)) {
    return (
      <img
        src={resolveAssetUrl(source)}
        alt={name}
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    )
  }

  return <span className={cn(className)}>{(source || name).slice(0, 2).toUpperCase()}</span>
}
