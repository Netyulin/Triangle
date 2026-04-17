"use client"

import { ChangeEvent, useEffect, useId, useState } from "react"
import { ImagePlus, Shuffle, Upload, User } from "lucide-react"
import { avatarPresets } from "@/lib/avatar-presets"
import { createRandomAvatar, type AvatarGender } from "@/lib/avatar-random"
import { cn, resolveAssetUrl } from "@/lib/utils"

type AvatarPickerProps = {
  value: string
  onChange: (value: string) => void
  gender?: AvatarGender
}

async function fileToAvatarDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const size = 256
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size

      const context = canvas.getContext("2d")
          if (!context) {
            URL.revokeObjectURL(objectUrl)
        reject(new Error("头像处理失败，请换一张图片再试。"))
            return
          }

      const sourceSize = Math.min(image.width, image.height)
      const offsetX = (image.width - sourceSize) / 2
      const offsetY = (image.height - sourceSize) / 2

      context.drawImage(image, offsetX, offsetY, sourceSize, sourceSize, 0, 0, size, size)
      const dataUrl = canvas.toDataURL("image/webp", 0.92)
      URL.revokeObjectURL(objectUrl)
      resolve(dataUrl)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("这张图片处理不了，请换一张常见格式的图片。"))
    }

    image.src = objectUrl
  })
}

export function AvatarPicker({ value, onChange, gender = "other" }: AvatarPickerProps) {
  const inputId = useId()
  const [message, setMessage] = useState("")
  const [presetOptions, setPresetOptions] = useState<Array<{ id: number; src: string }>>([])
  const [presetLoading, setPresetLoading] = useState(true)

  useEffect(() => {
    let active = true
    setPresetLoading(true)

    Promise.all(
      avatarPresets.map(async (avatar) => ({
        id: avatar.id,
        src: await createRandomAvatar(gender, { seed: avatar.seed }),
      })),
    )
      .then((nextOptions) => {
        if (!active) return
        setPresetOptions(nextOptions)
      })
      .catch(() => {
        if (!active) return
        setPresetOptions([])
      })
      .finally(() => {
        if (active) setPresetLoading(false)
      })

    return () => {
      active = false
    }
  }, [gender])

  const handleRandomAvatar = async () => {
    try {
      const avatar = await createRandomAvatar(gender)
      onChange(avatar)
      setMessage("已经生成新的随机头像，保存后会写入本地。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "随机头像生成失败，请稍后再试。")
    }
  }

  const handleUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return
    if (!file.type.startsWith("image/")) {
      setMessage("请上传图片文件。")
      return
    }

    try {
      const nextAvatar = await fileToAvatarDataUrl(file)
      onChange(nextAvatar)
      setMessage("本地头像已经选好，保存后就会生效。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传头像失败，请换一张图片再试。")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 min-h-20 min-w-20 max-h-20 max-w-20 overflow-hidden rounded-2xl border border-border bg-background">
            {value ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveAssetUrl(value) || value} alt="当前头像" className="block h-full w-full object-cover" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                <User className="h-6 w-6" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">当前头像</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              不选择时会保留系统默认头像。你也可以从下面的默认头像里手动挑选，或者上传自己的图片。
            </p>
            {message ? <p className="mt-2 text-xs text-accent">{message}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => void handleRandomAvatar()}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
          >
            <Shuffle className="h-4 w-4" />
            随机生成头像
          </button>
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
          >
            <Upload className="h-4 w-4" />
            上传本地头像
          </label>
          <input id={inputId} type="file" accept="image/*" className="sr-only" onChange={handleUploadAvatar} />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {presetLoading
          ? Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="h-20 w-20 min-h-20 min-w-20 max-h-20 max-w-20 justify-self-center animate-pulse rounded-2xl border border-border bg-secondary/60" />
            ))
          : presetOptions.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => {
              onChange(avatar.src)
              setMessage(`已经选中默认头像 ${avatar.id}。`)
            }}
            className={cn(
              "h-20 w-20 min-h-20 min-w-20 max-h-20 max-w-20 justify-self-center overflow-hidden rounded-2xl border-2 bg-background p-0 transition",
              value === avatar.src ? "border-primary" : "border-transparent hover:border-border",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveAssetUrl(avatar.src) || avatar.src} alt={`默认头像 ${avatar.id}`} className="h-full w-full object-cover" />
          </button>
            ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-background/70 px-4 py-3 text-xs text-muted-foreground">
        <ImagePlus className="h-4 w-4 shrink-0" />
        上传头像时会自动裁成方形，避免图片过大或者比例不合适。
      </div>
    </div>
  )
}


