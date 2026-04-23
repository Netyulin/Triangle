"use client"

import { ClipboardEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  deleteAdminImage,
  deleteAdminApp,
  fetchAdminAppCategories,
  fetchAdminAppDetail,
  importAdminAppFromSource,
  resolveAssetUrl,
  saveAdminApp,
  uploadAdminImage,
} from "@/lib/admin-api"
import { toastError, toastSuccess } from "@/components/admin/toast"
import { confirmDelete } from "@/components/admin/confirm-dialog"
import {
  AppEditorForm,
  AppMediaField,
  Compatibility,
  EditorMode,
  Platform,
  buildSlug,
  combineSizeValue,
  compatibilityOptions,
  defaultDownloadLinks,
  extractImageFiles,
  initialForm,
  insertTextAtCursor,
  normalizeDownloadLinks,
  platformOptions,
  pricingOptions,
  readClipboardImageFile,
  splitLines,
  splitSizeValue,
} from "./app-editor-shared"

export function useAdminAppEditor(editingSlug: string) {
  const router = useRouter()
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const iconFileInputRef = useRef<HTMLInputElement | null>(null)
  const htmlFileInputRef = useRef<HTMLInputElement | null>(null)
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null)
  const summaryTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [form, setForm] = useState<AppEditorForm>(initialForm)
  const [editorMode, setEditorMode] = useState<EditorMode>("visual")
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [importUrl, setImportUrl] = useState("")
  const [slugTouched, setSlugTouched] = useState(Boolean(editingSlug))

  useEffect(() => {
    let active = true
    Promise.all([editingSlug ? fetchAdminAppDetail(editingSlug) : Promise.resolve(null), fetchAdminAppCategories()])
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
            pricing: app.pricing || pricingOptions[0],
            summary: app.summary || "<p><br></p>",
            highlights: Array.isArray(app.highlights) ? app.highlights.join("\n") : "",
            review: app.review || "",
            icon: app.icon || "",
            verified: Boolean(app.verified),
            featured: Boolean(app.featured),
            heroImage: app.heroImage || "",
            status: app.status || "published",
            accessLevel: app.accessLevel || "free",
            platforms:
              Array.isArray(app.platforms) && app.platforms.length
                ? app.platforms.filter((item): item is Platform => platformOptions.includes(item as Platform))
                : initialForm.platforms,
            compatibility:
              Array.isArray(app.compatibility) && app.compatibility.length
                ? app.compatibility.filter((item): item is Compatibility => compatibilityOptions.includes(item as Compatibility))
                : initialForm.compatibility,
            gallery: Array.isArray(app.gallery) ? app.gallery.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [],
            downloadLinks: normalizeDownloadLinks(
              (Array.isArray(app.downloadLinks) && app.downloadLinks.length ? app.downloadLinks : defaultDownloadLinks).map((item) => ({
                name: item.name || "",
                url: item.url || "",
                extractionCode: item.extractionCode || "",
              })),
            ),
            displayMode:
              app.displayMode === "cover" || app.displayMode === "icon" ? app.displayMode : app.heroImage ? "cover" : "icon",
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

  const handleImageUpload = async (file: File | null, field: AppMediaField) => {
    if (!file) return
    if (field === "heroImage") setUploadingCover(true)
    else setUploadingIcon(true)
    setError("")
    try {
      const result = await uploadAdminImage(file, field === "heroImage" ? "post-cover" : "app-cover")
      setForm((current) => ({
        ...current,
        [field]: result.path,
        displayMode: current.heroImage || current.icon ? current.displayMode : field === "heroImage" ? "cover" : "icon",
      }))
      toastSuccess("上传成功", "图片已上传并保存")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "图片上传失败"
      setError(msg)
      toastError("上传失败", msg)
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

  const handleRemoveImage = async (field: AppMediaField) => {
    const sourcePath = String(form[field] || "").trim()
    if (!sourcePath) {
      setForm((current) => ({ ...current, [field]: "" }))
      return
    }

    try {
      await deleteAdminImage(sourcePath)
      setForm((current) => ({ ...current, [field]: "" }))
      toastSuccess("删除成功", "图片已从服务器删除")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "删除图片失败"
      setError(msg)
      toastError("删除失败", msg)
    }
  }

  const updateMediaField = (field: AppMediaField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleGalleryUpload = async (file: File | null) => {
    if (!file) return
    setUploadingGallery(true)
    setError("")
    try {
      const result = await uploadAdminImage(file, "app-cover")
      setForm((current) => ({
        ...current,
        gallery: [...current.gallery, result.path],
      }))
      toastSuccess("上传成功", "截图已添加")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "截图上传失败"
      setError(msg)
      toastError("上传失败", msg)
    } finally {
      setUploadingGallery(false)
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = ""
    }
  }

  const handleRemoveGalleryImage = async (index: number) => {
    const sourcePath = String(form.gallery[index] || "").trim()
    if (!sourcePath) {
      setForm((current) => ({
        ...current,
        gallery: current.gallery.filter((_, i) => i !== index),
      }))
      return
    }

    try {
      await deleteAdminImage(sourcePath)
    } catch {
      // 图片可能不是当前服务可删除路径，不阻断编辑流程
    }

    setForm((current) => ({
      ...current,
      gallery: current.gallery.filter((_, i) => i !== index),
    }))
    toastSuccess("删除成功", "截图已移除")
  }

  const applyImportedData = (result: {
    name?: string
    subtitle?: string
    summary?: string
    review?: string
    heroImage?: string
    highlights?: string[]
  }) => {
    setForm((current) => {
      const nextName = (result.name || "").trim() || current.name
      const nextSlug = current.slug || buildSlug(nextName)
      const nextSummary = result.summary || current.summary
      const nextHeroImage = current.heroImage || result.heroImage || ""
      return {
        ...current,
        name: nextName,
        slug: nextSlug,
        subtitle: (result.subtitle || "").trim() || current.subtitle || nextName,
        summary: nextSummary,
        review: (result.review || "").trim() || current.review,
        highlights: Array.isArray(result.highlights) && result.highlights.length ? result.highlights.join("\n") : current.highlights,
        heroImage: nextHeroImage,
        displayMode: current.heroImage || current.icon ? current.displayMode : nextHeroImage ? "cover" : "icon",
      }
    })

  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setError("请先输入要导入的网址")
      return
    }

    setImporting(true)
    setError("")
    setMessage("")

    try {
      const result = await importAdminAppFromSource({ url: importUrl.trim() })
      applyImportedData(result)
      setMessage("网页内容已导入到软件详情")
      toastSuccess("导入成功", "已抓取并填充软件内容")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "导入失败"
      setError(msg)
      toastError("导入失败", msg)
    } finally {
      setImporting(false)
    }
  }

  const handleImportFromHtmlFile = async (file: File | null) => {
    if (!file) return

    setImporting(true)
    setError("")
    setMessage("")

    try {
      const rawContent = await file.text()
      if (!rawContent.trim()) {
        throw new Error("HTML 文件内容为空")
      }
      const result = await importAdminAppFromSource({ rawContent })
      applyImportedData(result)
      setMessage("HTML 文件已导入到软件详情")
      toastSuccess("导入成功", "HTML 内容已解析并填充")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "HTML 导入失败"
      setError(msg)
      toastError("导入失败", msg)
    } finally {
      setImporting(false)
      if (htmlFileInputRef.current) {
        htmlFileInputRef.current.value = ""
      }
    }
  }

  const handleInsertInlineImages = async (files: File[]) => {
    if (!files.length) return

    setUploadingInlineImage(true)
    setError("")
    setMessage("")

    try {
      if (editorMode === "html") {
        const snippets: string[] = []
        for (const file of files) {
          const result = await uploadAdminImage(file, "app-cover")
          const url = resolveAssetUrl(result.path) || result.path
          snippets.push(`\n<p><img src="${url}" alt="" /></p>\n`)
        }

        const html = snippets.join("")
        setForm((current) => {
          const textarea = summaryTextareaRef.current
          if (!textarea) return { ...current, summary: `${current.summary}${html}` }
          return { ...current, summary: insertTextAtCursor(textarea, html) }
        })
        setMessage("图片已插入摘要 HTML")
      } else {
        setMessage("当前是可视模式，请切换到 HTML 源码模式后插入图片")
      }
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "摘要图片上传失败"
      setError(msg)
    } finally {
      setUploadingInlineImage(false)
    }
  }

  const handleEditorPaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(event.clipboardData)
    if (!files.length) return

    event.preventDefault()
    await handleInsertInlineImages(files)
  }

  const handleHtmlContentChange = useCallback((content: string) => {
    setForm((current) => ({ ...current, summary: content }))
  }, [])

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
        summary: restForm.summary,
        size: combineSizeValue(restForm.size, sizeUnit),
        rating: 0,
        downloads: "0",
        updatedAt: new Date().toISOString().slice(0, 10),
        compatibility: form.compatibility,
        platforms: form.platforms,
        gallery: form.gallery.filter((item) => item.trim().length > 0),
        tags: [form.category].filter(Boolean),
        editorialScore: 0,
        highlights: splitLines(form.highlights),
        requirements: [],
        review: form.review,
        featured: form.featured,
        isDownloadable: downloadLinks.length > 0,
        downloadLinks,
        downloadUrl: primaryDownload,
      })
      toastSuccess(editingSlug ? "更新成功" : "创建成功", editingSlug ? "软件已更新" : "软件已创建")
      if (!editingSlug) {
        setForm(initialForm)
        setSlugTouched(false)
      }
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "保存失败"
      setError(msg)
      toastError("保存失败", msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingSlug) return
    const confirmed = await confirmDelete(form.name)
    if (!confirmed) return
    setSaving(true)
    try {
      await deleteAdminApp(editingSlug)
      toastSuccess("删除成功", `软件"${form.name}"已删除`)
      router.push("/admin/apps")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "删除失败"
      setError(msg)
      toastError("删除失败", msg)
      setSaving(false)
    }
  }

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

  const coverPreview = resolveAssetUrl(form.heroImage)
  const iconPreview = resolveAssetUrl(form.icon)

  return {
    categories,
    coverFileInputRef,
    coverPreview,
    error,
    editorMode,
    htmlFileInputRef,
    galleryFileInputRef,
    form,
    handleDelete,
    handleImportFromHtmlFile,
    handleImportFromUrl,
    handleImageUpload,
    handleGalleryUpload,
    handleInsertInlineImages,
    handleEditorPaste,
    handleHtmlContentChange,
    handleRemoveImage,
    handleRemoveGalleryImage,
    handlePasteImage,
    handleSubmit,
    iconFileInputRef,
    iconPreview,
    importUrl,
    importing,
    loading,
    message,
    saving,
    setEditorMode,
    setForm,
    setImportUrl,
    setSlugTouched,
    slugTouched,
    summaryTextareaRef,
    updateCompatibilityForPlatform,
    updateMediaField,
    uploadingCover,
    uploadingGallery,
    uploadingInlineImage,
    uploadingIcon,
  }
}
