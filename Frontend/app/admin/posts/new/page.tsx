"use client"
export { default } from "./post-editor-page"
/*

import Image from "next/image"
import { type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Link2,
  Upload,
  WandSparkles,
} from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { resolveAssetUrl } from "@/lib/admin-api"
import { looksLikeImageUrl } from "@/lib/utils"
import { extractImageFiles, getInitial } from "./post-editor-shared"
import { useAdminPostEditor } from "./use-admin-post-editor"

const TiptapEditor = dynamic(
  () => import("@/components/admin/tiptap-editor").then((mod) => mod.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-secondary/30 px-4 py-6 text-sm text-muted-foreground">
        编辑器加载中，请稍候...
      </div>
    ),
  },
)

const DEFAULT_AUTHOR = "Triangle 编辑部"
const inputClass = "admin-input"

type EditorMode = "visual" | "html"
type DisplayMode = "cover" | "icon"
type PostStatus = "published" | "hidden" | "archived"

const POST_STATUS_VALUES: PostStatus[] = ["published", "hidden", "archived"]

function normalizePostStatus(value: string | null | undefined): PostStatus {
  const candidate = String(value || "").trim() as PostStatus
  return POST_STATUS_VALUES.includes(candidate) ? candidate : "published"
}

const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  author: DEFAULT_AUTHOR,
  readingTime: "",
  relatedAppSlug: "",
  content: "",
  featured: false,
  coverImage: "",
  icon: "",
  displayMode: "icon" as DisplayMode,
  status: "published" as PostStatus,
}

function buildSlug(title: string, sourceUrl: string) {
  const base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

  if (base) return base

  try {
    const url = new URL(sourceUrl)
    return `${url.hostname.replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`.slice(0, 64)
  } catch {
    return `post-${Date.now()}`
  }
}

function extractImageFiles(data: DataTransfer | null) {
  if (!data) return []

  const files: File[] = []
  for (const item of Array.from(data.items || [])) {
    if (!item.type.startsWith("image/")) continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

function getInitial(text: string) {
  return text.trim().slice(0, 2).toUpperCase() || "TR"
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
    return new File([blob], `clipboard.${extension}`, { type: imageType })
  }

  return null
}

function insertTextAtCursor(textarea: HTMLTextAreaElement, value: string) {
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? textarea.value.length
  return `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`
}

export default function AdminPostEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editingSlug = searchParams.get("slug") || ""
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const iconFileInputRef = useRef<HTMLInputElement | null>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [form, setForm] = useState(initialForm)
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
            post.displayMode === "cover" || post.displayMode === "icon"
              ? post.displayMode
              : post.coverImage
                ? "cover"
                : "icon",
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

      toastSuccess(
        editingSlug ? "更新成功" : "创建成功",
        editingSlug ? "文章已更新" : "文章已创建",
      )

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

  const handleEditorPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(event.clipboardData)
    if (!files.length) return
    event.preventDefault()
    await handleInsertInlineImages(files)
  }

  const coverPreview = resolveAssetUrl(form.coverImage)

  return (
    <main className="space-y-5">
      <PageHeader
        title={editingSlug ? "编辑文章" : "新建文章"}
        description="创建新的技术文章、评测或教程。"
        icon={<FileText className="h-5 w-5" />}
        iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        actions={
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/25 hover:bg-secondary/70"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>
        }
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
        >
          <svg className="mt-[-1px] h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      <section className="admin-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              导入助手
            </p>
            <h2 className="mt-2 text-2xl font-black text-foreground">导入网页内容</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              输入链接后，后台会抓取标题、摘要、封面和正文，并直接填入编辑器。
            </p>
          </div>
          <WandSparkles className="hidden h-9 w-9 text-slate-400/40 dark:text-slate-500/40 md:block" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
            placeholder="输入要导入的链接地址"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className="admin-primary-btn px-5 py-3"
          >
            <Link2 className="h-4 w-4" />
            {importing ? "导入中..." : "抓取并导入"}
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="admin-panel p-6 md:p-8">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="标题">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                required
                className={inputClass}
              />
            </Field>
            <Field label="别名">
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }
                required
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="摘要">
            <textarea
              value={form.excerpt}
              onChange={(event) =>
                setForm((current) => ({ ...current, excerpt: event.target.value }))
              }
              rows={3}
              className={inputClass}
            />
          </Field>

          <div className="grid gap-6 md:grid-cols-3">
            <Field label="分类">
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                className={inputClass}
              >
                <option value="">请选择分类</option>
                {articleCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="作者">
              <input value={form.author} readOnly className={`${inputClass} bg-secondary`} />
            </Field>
            <Field label="阅读时长">
              <input
                value={form.readingTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, readingTime: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="关联软件别名">
              <input
                value={form.relatedAppSlug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    relatedAppSlug: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="状态">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                className={inputClass}
              >
                <option value="published">已发布</option>
                <option value="hidden">已隐藏</option>
                <option value="archived">已归档</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="封面图">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="admin-secondary-btn px-4 py-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingCover ? "上传中..." : "上传本地封面"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePasteCoverImage()}
                    disabled={uploadingCover}
                    className="admin-secondary-btn px-4 py-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    粘贴剪贴板图片
                  </button>
                  <span className="text-xs text-muted-foreground">
                    也可以直接填写图片地址。
                  </span>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      void handleCoverUpload(event.target.files?.[0] || null)
                    }
                  />
                </div>
                <input
                  value={form.coverImage}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, coverImage: event.target.value }))
                  }
                  onPaste={(event) => {
                    const imageFile = extractImageFiles(event.clipboardData)[0]
                    if (!imageFile) return
                    event.preventDefault()
                    void handleCoverUpload(imageFile)
                  }}
                  placeholder="封面图地址，或直接粘贴图片"
                  className={inputClass}
                />
                {coverPreview ? (
                  <Image
                    src={coverPreview}
                    alt="封面预览"
                    width={640}
                    height={320}
                    unoptimized
                    className="h-40 w-full rounded-xl object-cover"
                  />
                ) : null}
              </div>
            </Field>

            <Field label="文章图标">
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
                    onClick={() => void handlePasteIconImage()}
                    disabled={uploadingIcon}
                    className="admin-secondary-btn px-4 py-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    粘贴剪贴板图片
                  </button>
                  <span className="text-xs text-muted-foreground">
                    也可以直接填写字母、文字或图片地址。
                  </span>
                  <input
                    ref={iconFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      void handleIconUpload(event.target.files?.[0] || null)
                    }
                  />
                </div>
                <input
                  value={form.icon}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, icon: event.target.value }))
                  }
                  onPaste={(event) => {
                    const imageFile = extractImageFiles(event.clipboardData)[0]
                    if (!imageFile) return
                    event.preventDefault()
                    void handleIconUpload(imageFile)
                  }}
                  className={inputClass}
                  placeholder="图标字母、文字、图片地址，或直接粘贴图片"
                />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="flex h-16 w-16 overflow-hidden rounded-2xl bg-secondary text-lg font-black text-foreground">
                    <div className="flex h-full w-full items-center justify-center">
                      {form.icon && looksLikeImageUrl(form.icon) ? (
                        <Image
                          src={resolveAssetUrl(form.icon) || form.icon}
                          alt="图标预览"
                          width={64}
                          height={64}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{form.icon || getInitial(form.title)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="mt-1">
                      {resolveAssetUrl(form.icon) || "这里会显示上传或粘贴后的图标。"}
                    </p>
                  </div>
                </div>
              </div>
            </Field>
          </div>

          <Field label="正文">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <ModeButton
                    active={editorMode === "visual"}
                    onClick={() => setEditorMode("visual")}
                  >
                    可视化
                  </ModeButton>
                  <ModeButton
                    active={editorMode === "html"}
                    onClick={() => setEditorMode("html")}
                  >
                    HTML
                  </ModeButton>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <button
                    type="button"
                    disabled={uploadingInlineImage}
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = "image/*"
                      input.multiple = true
                      input.onchange = () =>
                        void handleInsertInlineImages(Array.from(input.files || []))
                      input.click()
                    }}
                    className="admin-secondary-btn px-3 py-1.5 text-xs"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploadingInlineImage ? "正文图片上传中..." : "上传正文图片"}
                  </button>
                  <span>在正文里直接粘贴图片也可以自动上传插入。</span>
                </div>
              </div>

              {editorMode === "visual" ? (
                <TiptapEditor
                  content={editorContent}
                  onChange={(content) => {
                    setEditorContent(content)
                    setForm((current) => ({ ...current, content }))
                  }}
                  placeholder="开始输入文章内容..."
                  uploadImage={handleImageUpload}
                  minHeight="420px"
                />
              ) : (
                <textarea
                  ref={contentTextareaRef}
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, content: event.target.value }))
                  }
                  onPaste={handleEditorPaste}
                  rows={18}
                  className={inputClass}
                  placeholder="支持直接粘贴 HTML 或普通正文内容"
                />
              )}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                setForm((current) => ({ ...current, featured: event.target.checked }))
              }
            />
            <span>在首页推荐这篇文章</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="admin-primary-btn px-6 py-3"
            >
              {saving ? "保存中..." : "保存文章"}
            </button>
            {editingSlug ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className="rounded-2xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive"
              >
                删除文章
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  )
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          : "rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      }
    >
      {children}
    </button>
  )
}
*/
