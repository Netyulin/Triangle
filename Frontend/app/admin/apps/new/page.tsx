"use client"

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react"

import Link from "next/link"

import { useRouter, useSearchParams } from "next/navigation"

import { ArrowLeft, Package, Plus, Trash2, Upload } from "lucide-react"

import { AppIcon } from "@/components/app-icon"

import { TiptapEditor } from "@/components/admin/tiptap-editor"

import { deleteAdminApp, fetchAdminAppCategories, fetchAdminAppDetail, resolveAssetUrl, saveAdminApp, uploadAdminImage } from "@/lib/admin-api"

import { looksLikeImageUrl } from "@/lib/utils"


type Platform = "Windows" | "Macos" | "IOS" | "Android" | "Linux"

type Compatibility = "PC" | "Apple Silicon" | "Intel芯片" | "移动平台"

type SizeUnit = "Kb" | "Mb" | "Gb"

type DownloadLink = { name: string; url: string }


const pricingOptions = ["免费", "破解版", "买断制", "订阅制"] as const

const platformOptions: Platform[] = ["Windows", "Macos", "IOS", "Android", "Linux"]

const sizeUnitOptions: SizeUnit[] = ["Kb", "Mb", "Gb"]

const defaultDownloadLinks: DownloadLink[] = [

  { name: "百度网盘", url: "" },

  { name: "夸克网盘", url: "" },

  { name: "迅雷网盘", url: "" },

]


type DisplayMode = "cover" | "icon"
type AppMediaField = "heroImage" | "icon"

const initialForm = {

  name: "",

  slug: "",

  subtitle: "",

  category: "",

  sizeUnit: "Mb" as SizeUnit,

  version: "",

  size: "",

  pricing: "免费",

  summary: "<p><br></p>",

  highlights: "",

  review: "",

  icon: "",

  verified: true,

  heroImage: "",

  status: "published",

  platforms: ["Windows"] as Platform[],

  compatibility: ["PC"] as Compatibility[],

  downloadLinks: defaultDownloadLinks,

  displayMode: "icon" as DisplayMode,

}


function buildSlug(title: string) {

  const base = String(title || "")

    .toLowerCase()

    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")

    .replace(/^-+|-+$/g, "")

    .slice(0, 64)

  return base
}

function extractImageFromClipboardData(data: DataTransfer | null) {

  if (!data) return null

  for (const item of Array.from(data.items || [])) {

    if (!item.type.startsWith("image/")) continue

    return item.getAsFile()

  }

  return null
}

function extractImageFilesFromClipboard(data: DataTransfer | null) {

  if (!data) return []

  const files: File[] = []

  for (const item of Array.from(data.items || [])) {

    if (!item.type.startsWith("image/")) continue

    const file = item.getAsFile()

    if (file) files.push(file)

  }

  return files
}

async function readClipboardImageFile() {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
    return null
  }

  const items = await navigator.clipboard.read()

  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"))
    if (!imageType) continue

    const blob = await item.getType(imageType)
    const extension = imageType.split("/")[1] || "png"
    return new File([blob], `clipboard-cover.${extension}`, { type: imageType })
  }

  return null
}

function splitLines(value: string) {

  return String(value || "")

    .split(/[\n\r]+/)

    .map((item) => item.trim())

    .filter(Boolean)

}

function normalizeDownloadLinks(items: DownloadLink[]) {
  return items
    .map((item, index) => ({
      name: item.name.trim() || `网盘 ${index + 1}`,
      url: item.url.trim(),
    }))
    .filter((item) => item.name || item.url)
}

function splitSizeValue(value: string): { size: string; sizeUnit: SizeUnit } {
  const trimmed = String(value || "").trim()
  if (!trimmed) {
    return { size: "", sizeUnit: "Mb" }
  }

  const match = trimmed.match(/^(.+?)\s*(Kb|Mb|Gb)$/i)
  if (!match) {
    return { size: trimmed, sizeUnit: "Mb" }
  }

  const size = match[1].trim()
  const rawUnit = match[2].toLowerCase()
  const sizeUnit = rawUnit === "kb" ? "Kb" : rawUnit === "gb" ? "Gb" : "Mb"
  return { size, sizeUnit }
}

function combineSizeValue(size: string, sizeUnit: SizeUnit) {
  const trimmed = String(size || "").trim()
  if (!trimmed) {
    return ""
  }
  return `${trimmed}${sizeUnit}`
}

function togglePlatformValue(list: Platform[], value: Platform) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}

export default function AdminAppEditorPage() {

  const router = useRouter()

  const searchParams = useSearchParams()

  const editingSlug = searchParams.get("slug") || ""

  const coverFileInputRef = useRef<HTMLInputElement | null>(null)

  const iconFileInputRef = useRef<HTMLInputElement | null>(null)

  const [summaryContent, setSummaryContent] = useState("")

  const [form, setForm] = useState(initialForm)

  const [categories, setCategories] = useState<string[]>([])

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [uploadingCover, setUploadingCover] = useState(false)

  const [uploadingIcon, setUploadingIcon] = useState(false)

  const [message, setMessage] = useState("")

  const [error, setError] = useState("")

  const [slugTouched, setSlugTouched] = useState(Boolean(editingSlug))

  useEffect(() => {

    let active = true

    Promise.all([
      editingSlug ? fetchAdminAppDetail(editingSlug) : Promise.resolve(null),
      fetchAdminAppCategories(),
    ])
      .then(([app, categoryItems]) => {

        if (!active) return

        setCategories(categoryItems.map((item) => item.name))

        if (app) {

          setForm({

            name: app.name,

            slug: app.slug,

            subtitle: app.subtitle,

            category: app.category,

            version: app.version,

            ...splitSizeValue(app.size),

            pricing: app.pricing || "免费",

            summary: app.summary || "<p><br></p>",
            highlights: Array.isArray(app.highlights) ? app.highlights.join("\n") : "",

            review: app.review || "",

            icon: app.icon || "",
            verified: Boolean(app.verified),

            heroImage: app.heroImage || "",

            status: app.status || "published",
            platforms:
              Array.isArray(app.platforms) && app.platforms.length
                ? app.platforms.filter((item): item is Platform => platformOptions.includes(item as Platform))
                : initialForm.platforms,
            compatibility:
              Array.isArray(app.compatibility) && app.compatibility.length
                ? app.compatibility.filter(
                    (item): item is Compatibility => ["PC", "Apple Silicon", "Intel鑺墖", "绉诲姩骞冲彴"].includes(item),
                  )
                : initialForm.compatibility,
            downloadLinks: normalizeDownloadLinks(
              (Array.isArray(app.downloadLinks) && app.downloadLinks.length ? app.downloadLinks : defaultDownloadLinks).map((item) => ({
                name: item.name || "",
                url: item.url || "",
              }))
            ),
            displayMode: app.displayMode === "cover" || app.displayMode === "icon" ? app.displayMode : app.heroImage ? "cover" : "icon",
          })

          setSlugTouched(true)

        }

      })

      .catch((nextError) => {

        if (!active) return

        setError(nextError instanceof Error ? nextError.message : "加载后台数据失败")

      })

      .finally(() => {

        if (active) setLoading(false)

      })

    return () => {

      active = false

    }

  }, [editingSlug])

  useEffect(() => {

    if (slugTouched) return

    setForm((current) => ({ ...current, slug: buildSlug(current.name) }))

  }, [form.name, slugTouched])

  // Initialize summary content when loading completes or form.summary changes
  useEffect(() => {
    if (!loading && form.summary && summaryContent !== form.summary) {
      setSummaryContent(form.summary)
    }
  }, [loading, form.summary])

  const handleImageUpload = async (file: File | null, field: AppMediaField) => {
    if (!file) return

    if (field === "heroImage") setUploadingCover(true)
    else setUploadingIcon(true)

    setError("")
    setMessage("")

    try {
      const result = await uploadAdminImage(file, field === "heroImage" ? "post-cover" : "app-cover")
      setForm((current) => ({
        ...current,
        [field]: result.path,
        displayMode:
          current.heroImage || current.icon
            ? current.displayMode
            : field === "heroImage"
              ? "cover"
              : "icon",
      }))
      setMessage("图片上传成功。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "图片上传失败")
    } finally {

      if (field === "heroImage") {
        setUploadingCover(false)
        if (coverFileInputRef.current) coverFileInputRef.current.value = ""
      } else {
        setUploadingIcon(false)
        if (iconFileInputRef.current) iconFileInputRef.current.value = ""
      }
    }
  }

  const handlePasteImage = async (field: AppMediaField) => {
    const file = await readClipboardImageFile()
    await handleImageUpload(file, field)
  }

  const setDisplayMode = (displayMode: DisplayMode) => {
    setForm((current) => ({ ...current, displayMode }))
  }

  const updateMediaField = (field: AppMediaField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const downloadLinks = normalizeDownloadLinks(form.downloadLinks)
      const primaryDownload = downloadLinks[0]?.url || ""

      const { sizeUnit, ...restForm } = form

      await saveAdminApp(editingSlug || null, {
        ...restForm,
        subtitle: restForm.subtitle.trim() || restForm.name.trim(),
        pricing: restForm.pricing || pricingOptions[0],
        summary: summaryContent,
        size: combineSizeValue(restForm.size, sizeUnit),
        rating: 0,
        downloads: "0",
        updatedAt: new Date().toISOString().slice(0, 10),
        compatibility: form.compatibility,
        platforms: form.platforms,
        gallery: [],
        tags: [form.category].filter(Boolean),
        editorialScore: 0,
        highlights: splitLines(form.highlights),
        requirements: [],
        review: form.review,
        featured: false,
        isDownloadable: downloadLinks.length > 0,
        downloadLinks,
        downloadUrl: primaryDownload,
      })

      setMessage(editingSlug ? "软件已经更新。" : "软件已经创建。")

      if (!editingSlug) {
        setForm(initialForm)
        setSummaryContent(initialForm.summary)
        setSlugTouched(false)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败。")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingSlug || !window.confirm("确定删除这个软件吗？")) return
    setSaving(true)
    try {
      await deleteAdminApp(editingSlug)
      router.push("/admin/apps")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除失败。")
      setSaving(false)
    }
  }

  const coverPreview = resolveAssetUrl(form.heroImage)
  const iconPreview = resolveAssetUrl(form.icon)

  const macosSelected = form.platforms.includes("Macos")
  const mobileSelected = form.platforms.includes("IOS") || form.platforms.includes("Android")

  const updateCompatibilityForPlatform = (platform: Platform, nextPlatforms: Platform[]) => {
    const next = new Set(form.compatibility)

    if (platform === "Windows") {
      if (nextPlatforms.includes("Windows")) next.add("PC")
      else next.delete("PC")
    }

    if (platform === "Macos") {
      if (!nextPlatforms.includes("Macos")) {
        next.delete("Apple Silicon")
        next.delete("Intel芯片")
      }
    }

    if (platform === "IOS" || platform === "Android") {
      if (nextPlatforms.some((item) => item === "IOS" || item === "Android")) next.add("移动平台")
      else next.delete("移动平台")
    }

    return Array.from(next)
  }

  if (loading) {
    return <main className="admin-panel p-6 text-sm text-muted-foreground">正在加载软件信息...</main>
  }

  return (
    <main className="space-y-6">
      {/* Page Header */}
      <div className="admin-hero">
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-[0_12px_24px_-20px_rgba(14,165,233,0.7)] dark:bg-sky-950/30 dark:text-sky-300">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {editingSlug ? "编辑软件" : "新建软件"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  添加新的软件条目到软件库
                </p>
              </div>
            </div>
            <Link href="/admin/apps" className="admin-secondary-btn px-4 py-2 text-sm">
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="admin-panel p-6 md:p-8">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="软件名称">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                className={inputClass}
              />
            </Field>
            <Field label="URL 别名">
              <input
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }}
                required
                className={inputClass}
                placeholder="会默认根据软件名称生成"
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="副标题">
              <input
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                className={inputClass}
                placeholder="一句话说明这个软件适合做什么"
              />
            </Field>
            <Field label="收费方式">
              <select
                value={form.pricing}
                onChange={(event) => setForm((current) => ({ ...current, pricing: event.target.value }))}
                className={inputClass}
              >
                {pricingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="状态">
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
                <option value="scheduled">待发布</option>
              </select>
            </Field>

            <Field label="分类">
              <div className="space-y-2">
                <input
                  list="app-category-options"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="选择或输入分类名"
                  className={inputClass}
                />
                <datalist id="app-category-options">
                  {categories.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">分类会自动同步到分类库里。</p>
              </div>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="当前版本">
              <input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} className={inputClass} />
            </Field>

            <Field label="文件大小">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                <input value={form.size} onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))} className={inputClass} placeholder="44.57" />
                <select value={form.sizeUnit} onChange={(event) => setForm((current) => ({ ...current, sizeUnit: event.target.value as SizeUnit }))} className={inputClass}>
                  {sizeUnitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          <div className="space-y-3">
                <Field label="封面图">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => coverFileInputRef.current?.click()}
                        className="admin-secondary-btn px-4 py-2 text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingCover ? "上传中..." : "上传本地封面"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePasteImage("heroImage")}
                        disabled={uploadingCover}
                        className="admin-secondary-btn px-4 py-2 text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        粘贴剪贴板图片
                      </button>
                      <span className="text-xs text-muted-foreground">也可以直接粘贴图片地址或服务器相对路径。</span>
                      <input ref={coverFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event.target.files?.[0] || null, "heroImage")} />
                    </div>
                    <input
                      value={form.heroImage}
                      onChange={(event) => updateMediaField("heroImage", event.target.value)}
                      onPaste={(event) => {
                        const imageFile = extractImageFromClipboardData(event.clipboardData)
                        if (!imageFile) return
                        event.preventDefault()
                        void handleImageUpload(imageFile, "heroImage")
                      }}
                      className={inputClass}
                      placeholder="封面图地址"
                    />
                    {coverPreview ? <img src={coverPreview} alt="封面预览" className="h-40 w-full rounded-xl object-cover" /> : null}
                  </div>
                </Field>
              </div>
            <div className="space-y-3">
                <Field label="应用图标">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={uploadingIcon}
                        onClick={() => iconFileInputRef.current?.click()}
                        className="admin-secondary-btn px-4 py-2 text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingIcon ? "上传中..." : "上传本地图标"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePasteImage("icon")}
                        disabled={uploadingIcon}
                        className="admin-secondary-btn px-4 py-2 text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        粘贴剪贴板图片
                      </button>
                      <span className="text-xs text-muted-foreground">也可以直接手动填字母、汉字或图标地址。</span>
                      <input ref={iconFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event.target.files?.[0] || null, "icon")} />
                    </div>
                    <input
                      value={form.icon}
                      onChange={(event) => updateMediaField("icon", event.target.value)}
                      onPaste={(event) => {
                        const imageFile = extractImageFromClipboardData(event.clipboardData)
                        if (!imageFile) return
                        event.preventDefault()
                        void handleImageUpload(imageFile, "icon")
                      }}
                      className={inputClass}
                      placeholder="图标字母、图标地址或粘贴图片"
                    />
                    <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                      <div className="flex h-16 w-16 overflow-hidden rounded-xl bg-secondary text-lg font-black text-foreground">
                        <AppIcon
                          value={form.icon}
                          name={form.name || "APP"}
                          className="flex h-full w-full items-center justify-center"
                          imageClassName="h-full w-full object-cover"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="mt-1">{iconPreview || "这里会显示上传或粘贴后的图标。"}</p>
                      </div>
                    </div>
                  </div>
                </Field>
              </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="适用平台">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-3">
                {platformOptions.map((platform) => (
                  <label key={platform} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.platforms.includes(platform)}
                      onChange={() => {
                        setForm((current) => {
                          const nextPlatforms = togglePlatformValue(current.platforms, platform)
                          const nextCompatibility = updateCompatibilityForPlatform(platform, nextPlatforms)
                          return { ...current, platforms: nextPlatforms, compatibility: nextCompatibility }
                        })
                      }}
                    />
                    <span>{platform}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="兼容环境">
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
                {form.platforms.includes("Windows") ? (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.compatibility.includes("PC")}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          compatibility: toggleCompatibility(current.compatibility, "PC"),
                        }))
                      }
                    />
                    <span>PC（Windows 默认）</span>
                  </label>
                ) : null}

                {form.platforms.includes("Macos") ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.compatibility.includes("Apple Silicon")}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            compatibility: toggleCompatibility(current.compatibility, "Apple Silicon"),
                          }))
                        }
                      />
                      <span>Apple Silicon</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.compatibility.includes("Intel芯片")}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            compatibility: toggleCompatibility(current.compatibility, "Intel芯片"),
                          }))
                        }
                      />
                      <span>Intel芯片</span>
                    </label>
                  </>
                ) : null}

                {(form.platforms.includes("IOS") || form.platforms.includes("Android")) ? (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.compatibility.includes("移动平台")}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          compatibility: toggleCompatibility(current.compatibility, "移动平台"),
                        }))
                      }
                    />
                    <span>移动平台（iOS / Android 默认）</span>
                  </label>
                ) : null}
              </div>
            </Field>
          </div>

          <Field label="摘要说明">
            <div className="space-y-3">
              <TiptapEditor
                content={summaryContent}
                onChange={(content) => {
                  setSummaryContent(content)
                  setForm((current) => ({ ...current, summary: content }))
                }}
                placeholder="在这里填写软件摘要..."
                uploadImage={async (file: File) => {
                  const result = await uploadAdminImage(file, "app-cover")
                  return result.path
                }}
                minHeight="200px"
              />
              <p className="text-xs text-muted-foreground">这里支持像文章一样编辑富文本摘要。</p>
            </div>
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="亮点">
              <textarea
                value={form.highlights}
                onChange={(event) => setForm((current) => ({ ...current, highlights: event.target.value }))}
                rows={5}
                className={inputClass}
                placeholder="每行写一个亮点"
              />
            </Field>

            <Field label="编辑点评">
              <textarea
                value={form.review}
                onChange={(event) => setForm((current) => ({ ...current, review: event.target.value }))}
                rows={5}
                className={inputClass}
                placeholder="写下编辑点评"
              />
            </Field>
          </div>

          <Field label="下载地址">
            <div className="space-y-4">
              {form.downloadLinks.map((link, index) => (
                <div key={index} className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                  <input
                    value={link.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        downloadLinks: current.downloadLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item
                        ),
                      }))
                    }
                    className={inputClass}
                    placeholder="网盘名称"
                  />
                  <input
                    value={link.url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        downloadLinks: current.downloadLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url: event.target.value } : item
                        ),
                      }))
                    }
                    className={inputClass}
                    placeholder="下载链接"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        downloadLinks: current.downloadLinks.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    downloadLinks: [...current.downloadLinks, { name: "", url: "" }],
                  }))
                }
                className="admin-secondary-btn px-4 py-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                添加网盘
              </button>
            </div>
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="admin-primary-btn px-6 py-3">
              {saving ? "保存中..." : "保存软件"}
            </button>
            {editingSlug ? (
              <button onClick={handleDelete} disabled={saving} className="rounded-2xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive">
                删除软件
              </button>
            ) : null}
            <div className="flex-1" />
            <Link href="/admin/app-categories" className="admin-secondary-btn px-5 py-3 text-sm">
              管理分类
            </Link>
          </div>
        </div>
      </form>
    </main>
  )
}

function toggleCompatibility(list: Compatibility[], value: Compatibility) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

const inputClass = "admin-input"
