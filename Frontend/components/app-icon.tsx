"use client"

import Image from "next/image"
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
      <span className="relative block h-full w-full">
        <Image
          src={resolveAssetUrl(source)}
          alt={name}
          fill
          unoptimized
          sizes="96px"
          className={cn("object-cover", imageClassName)}
        />
      </span>
    )
  }

  return <span className={cn(className)}>{(source || name).slice(0, 2).toUpperCase()}</span>
}
