"use client"

import { ClipboardEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  deleteAdminPost,
  fetchAdminPostCategories,
  fetchAdminPostDetail,
  importAdminPostFromUrl,
  resolveAssetUrl,
  saveAdminPost,
  uploadAdminImage,
} from "@/lib/admin-api"
import { toastError, toastSuccess } from "@/components/admin/toast"
import { confirmDelete } from "@/components/admin/confirm-dialog"
import {
  DEFAULT_AUTHOR,
  EditorMode,
  PostEditorForm,
  buildSlug,
  extractImageFiles,
  initialForm,
  insertTextAtCursor,
  normalizePostStatus,
  readClipboardImageFile,
} from "./post-editor-shared"

export function useAdminPostEditor(editingSlug: string) {
  const router = useRouter()
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const iconFileInputRef = useRef<HTMLInputElement | null>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [form, setForm] = useState<PostEditorForm>(initialForm)
  const [importUrl, setImportUrl] = useState("")
  const [editorMode, setEditorMode] = useState<EditorMode>("visual")
  const [loading, setLoading] = useState(Boolean(editingSlug))
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [articleCategories, setArticleCategories] = useState<string[]>([])
  const [editorContent, setEditorContent] = useState("")

  useEffect(() => {
    let active = true
    fetchAdminPostCategories()
      .then((items) => {
        if (!active) return
        setArticleCategories(items.map((item) => item.name))
      })
      .catch(() => {
        if (!active) return
        setArticleCategories([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!editingSlug) return
    let active = true

    fetchAdminPostDetail(editingSlug)
      .then((post) => {
        if (!active) return
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          category: post.category,
          author: post.author || DEFAULT_AUTHOR,
          readingTime: post.readingTime,
          relatedAppSlug: post.relatedApp?.slug || "",
          content: post.content || "",
          featured: Boolean(post.featured),
          coverImage: post.coverImage || "",
          icon: post.icon || "",
          displayMode:
            post.displayMode === "cover" || post.displayMode === "icon" ? post.displayMode : post.coverImage ? "cover" : "icon",
          status: normalizePostStatus(post.status),
        })
        setEditorContent(post.content || "")
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "加载文章失败。")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [editingSlug])

  const handleImport = async () => {
    if (!importUrl.trim()) {
      setError("请先输入要导入的链接。")
      return
    }

    setImporting(true)
    setError("")
    setMessage("")

    try {
      const result = await importAdminPostFromUrl(importUrl.trim())
      setForm((current) => ({
        ...current,
        title: result.title || current.title,
        slug: current.slug || buildSlug(result.title, result.finalUrl || result.sourceUrl),
        excerpt: result.excerpt || current.excerpt,
        author: DEFAULT_AUTHOR,
        readingTime: result.readingTime || current.readingTime,
        coverImage: current.coverImage || result.coverImage,
      }))
      setEditorContent(result.contentHtml || editorContent)
      setForm((current) => ({
        ...current,
        content: result.contentHtml || current.content,
      }))
      setMessage("导入内容已经填入编辑器。")
      toastSuccess("导入成功", "网页内容已抓取并填充")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "导入失败"
      setError(msg)
      toastError("导入失败", msg)
    } finally {
      setImporting(false)
    }
  }

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return
    setUploadingCover(true)
    setError("")
    setMessage("")
    try {
      const result = await uploadAdminImage(file, "post-cover")
      setForm((current) => ({
        ...current,
        coverImage: result.path,
        displayMode: current.coverImage || current.icon ? current.displayMode : "cover",
      }))
      toastSuccess("上传成功", "封面图片已上传")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "封面上传失败"
      setError(msg)
      toastError("上传失败", msg)
    } finally {
      setUploadingCover(false)
      if (coverFileInputRef.current) coverFileInputRef.current.value = ""
    }
  }

  const handleIconUpload = async (file: File | null) => {
    if (!file) return
    setUploadingIcon(true)
    setError("")
    setMessage("")
    try {
      const result = await uploadAdminImage(file, "app-cover")
      setForm((current) => ({
        ...current,
        icon: result.path,
        displayMode: current.coverImage || current.icon ? current.displayMode : "icon",
      }))
      toastSuccess("上传成功", "图标已上传")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "图标上传失败"
      setError(msg)
      toastError("上传失败", msg)
    } finally {
      setUploadingIcon(false)
      if (iconFileInputRef.current) iconFileInputRef.current.value = ""
    }
  }

  const handlePasteCoverImage = async () => {
    const file = await readClipboardImageFile()
    await handleCoverUpload(file)
  }

  const handlePasteIconImage = async () => {
    const file = await readClipboardImageFile()
    await handleIconUpload(file)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const content = editorMode === "visual" ? editorContent : form.content
      await saveAdminPost(editingSlug || null, {
        ...form,
        status: normalizePostStatus(form.status),
        content,
        author: DEFAULT_AUTHOR,
        dateLabel: new Date().toLocaleDateString("zh-CN"),
        publishedAt: new Date().toISOString().slice(0, 10),
        seoTitle: form.title,
        seoDescription: form.excerpt,
      })
      toastSuccess(editingSlug ? "更新成功" : "创建成功", editingSlug ? "文章已更新" : "文章已创建")
      if (!editingSlug) {
        setForm(initialForm)
        setEditorContent("")
        setImportUrl("")
      }
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "文章保存失败"
      setError(msg)
      toastError("保存失败", msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingSlug) return
    const confirmed = await confirmDelete(form.title)
    if (!confirmed) return
    setSaving(true)
    try {
      await deleteAdminPost(editingSlug)
      toastSuccess("删除成功", `文章“${form.title}”已删除`)
      router.push("/admin/posts")
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "文章删除失败"
      setError(msg)
      toastError("删除失败", msg)
      setSaving(false)
    }
  }

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const result = await uploadAdminImage(file, "post-cover")
    return resolveAssetUrl(result.path) || result.path
  }, [])

  const handleInsertInlineImages = async (files: File[]) => {
    if (!files.length) return
    setUploadingInlineImage(true)
    setError("")
    setMessage("")

    try {
      if (editorMode === "html") {
        const snippets: string[] = []
        for (const file of files) {
          const result = await uploadAdminImage(file, "post-cover")
          const url = resolveAssetUrl(result.path) || result.path
          snippets.push(`\n<p><img src="${url}" alt="" /></p>\n`)
        }
        const html = snippets.join("")
        setForm((current) => {
          const textarea = contentTextareaRef.current
          if (!textarea) return { ...current, content: `${current.content}${html}` }
          return { ...current, content: insertTextAtCursor(textarea, html) }
        })
        setMessage("正文图片已经插入。")
      } else {
        setMessage("请在编辑器中使用图片按钮插入图片，或切换到 HTML 模式粘贴图片。")
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "正文图片上传失败。")
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

  const coverPreview = resolveAssetUrl(form.coverImage)

  return {
    articleCategories,
    contentTextareaRef,
    coverFileInputRef,
    coverPreview,
    editorContent,
    editorMode,
    error,
    form,
    handleCoverUpload,
    handleDelete,
    handleEditorPaste,
    handleIconUpload,
    handleImageUpload,
    handleImport,
    handleInsertInlineImages,
    handlePasteCoverImage,
    handlePasteIconImage,
    handleSubmit,
    iconFileInputRef,
    importUrl,
    importing,
    loading,
    message,
    saving,
    setEditorContent,
    setEditorMode,
    setForm,
    setImportUrl,
    uploadingCover,
    uploadingIcon,
    uploadingInlineImage,
  }
}
