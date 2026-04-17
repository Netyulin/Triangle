"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  deleteAdminApp,
  fetchAdminAppCategories,
  fetchAdminAppDetail,
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
  Platform,
  buildSlug,
  combineSizeValue,
  compatibilityOptions,
  defaultDownloadLinks,
  initialForm,
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

  const [summaryContent, setSummaryContent] = useState("")
  const [form, setForm] = useState<AppEditorForm>(initialForm)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [error, setError] = useState("")
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
            downloadLinks: normalizeDownloadLinks(
              (Array.isArray(app.downloadLinks) && app.downloadLinks.length ? app.downloadLinks : defaultDownloadLinks).map((item) => ({
                name: item.name || "",
                url: item.url || "",
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

  useEffect(() => {
    if (!loading && form.summary && summaryContent !== form.summary) {
      setSummaryContent(form.summary)
    }
  }, [loading, form.summary, summaryContent])

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

  const updateMediaField = (field: AppMediaField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
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
        featured: form.featured,
        isDownloadable: downloadLinks.length > 0,
        downloadLinks,
        downloadUrl: primaryDownload,
      })
      toastSuccess(editingSlug ? "更新成功" : "创建成功", editingSlug ? "软件已更新" : "软件已创建")
      if (!editingSlug) {
        setForm(initialForm)
        setSummaryContent(initialForm.summary)
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
    form,
    handleDelete,
    handleImageUpload,
    handlePasteImage,
    handleSubmit,
    iconFileInputRef,
    iconPreview,
    loading,
    saving,
    setForm,
    setSlugTouched,
    slugTouched,
    summaryContent,
    setSummaryContent,
    updateCompatibilityForPlatform,
    updateMediaField,
    uploadingCover,
    uploadingIcon,
  }
}
