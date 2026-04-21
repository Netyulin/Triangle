"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, FileCode2, FileText, ImagePlus, Link2, Trash2, Upload, WandSparkles } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { resolveAssetUrl } from "@/lib/admin-api"
import { looksLikeImageUrl } from "@/lib/utils"
import { extractImageFiles, getInitial } from "./post-editor-shared"
import { useAdminPostEditor } from "./use-admin-post-editor"

const inputClass = "admin-input"

export default function AdminPostEditorPage() {
  const searchParams = useSearchParams()
  const editingSlug = searchParams.get("slug") || ""

  const {
    articleCategories,
    contentTextareaRef,
    coverFileInputRef,
    coverPreview,
    editorMode,
    error,
    form,
    handleCoverUpload,
    handleDelete,
    handleEditorPaste,
    handleHtmlContentChange,
    handleIconUpload,
    handleImport,
    handleInsertInlineImages,
    handlePasteCoverImage,
    handlePasteIconImage,
    handleRemoveCoverImage,
    handleRemoveIconImage,
    handleSubmit,
    iconFileInputRef,
    importUrl,
    importing,
    loading,
    message,
    saving,
    setEditorMode,
    setForm,
    setImportUrl,
    uploadingCover,
    uploadingIcon,
    uploadingInlineImage,
  } = useAdminPostEditor(editingSlug)

  const handleOpenPreviewWindow = () => {
    const htmlBody = form.content || "<p style='color:#888'>暂无内容</p>"
    const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>文章预览</title>
  </head>
  <body>${htmlBody}</body>
</html>`
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, "_blank", "noopener,noreferrer")
    if (!win) {
      URL.revokeObjectURL(url)
      return
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <main className="space-y-5">
      <PageHeader
        title={editingSlug ? "编辑文章" : "新建文章"}
        description="创建新的技术文章、评测或教程"
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
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">导入助手</p>
            <h2 className="mt-2 text-2xl font-black text-foreground">导入网页内容</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">输入链接后，后台会抓取标题、摘要、封面和正文。</p>
          </div>
          <WandSparkles className="hidden h-9 w-9 text-slate-400/40 dark:text-slate-500/40 md:block" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="输入要导入的链接地址" className={inputClass} />
          <button type="button" onClick={handleImport} disabled={importing || !importUrl.trim()} className="admin-primary-btn px-5 py-3">
            <Link2 className="h-4 w-4" />
            {importing ? "导入中..." : "抓取并导入"}
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="admin-panel p-6 md:p-8">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="标题">
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required className={inputClass} />
            </Field>
            <Field label="别名">
              <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required className={inputClass} />
            </Field>
          </div>

          <Field label="摘要">
            <textarea value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} rows={3} className={inputClass} />
          </Field>

          <div className="grid gap-6 md:grid-cols-3">
            <Field label="分类">
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className={inputClass}>
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
              <input value={form.readingTime} onChange={(event) => setForm((current) => ({ ...current, readingTime: event.target.value }))} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="关联软件别名">
              <input value={form.relatedAppSlug} onChange={(event) => setForm((current) => ({ ...current, relatedAppSlug: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="状态">
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
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
                  <button type="button" onClick={() => coverFileInputRef.current?.click()} disabled={uploadingCover} className="admin-secondary-btn px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    {uploadingCover ? "上传中..." : "上传本地封面"}
                  </button>
                  <button type="button" onClick={() => void handlePasteCoverImage()} disabled={uploadingCover} className="admin-secondary-btn px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    粘贴剪贴板图片
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveCoverImage()}
                    disabled={!form.coverImage}
                    className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除封面
                  </button>
                  <input ref={coverFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleCoverUpload(event.target.files?.[0] || null)} />
                </div>
                <input
                  value={form.coverImage}
                  onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))}
                  onPaste={(event) => {
                    const imageFile = extractImageFiles(event.clipboardData)[0]
                    if (!imageFile) return
                    event.preventDefault()
                    void handleCoverUpload(imageFile)
                  }}
                  placeholder="封面图地址"
                  className={inputClass}
                />
                {coverPreview ? <Image src={coverPreview} alt="封面预览" width={640} height={320} unoptimized className="h-40 w-full rounded-xl object-cover" /> : null}
              </div>
            </Field>

            <Field label="文章图标">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" disabled={uploadingIcon} onClick={() => iconFileInputRef.current?.click()} className="admin-secondary-btn px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    {uploadingIcon ? "上传中..." : "上传本地图标"}
                  </button>
                  <button type="button" onClick={() => void handlePasteIconImage()} disabled={uploadingIcon} className="admin-secondary-btn px-4 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    粘贴剪贴板图片
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveIconImage()}
                    disabled={!form.icon}
                    className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除图标
                  </button>
                  <input ref={iconFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleIconUpload(event.target.files?.[0] || null)} />
                </div>
                <input
                  value={form.icon}
                  onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                  onPaste={(event) => {
                    const imageFile = extractImageFiles(event.clipboardData)[0]
                    if (!imageFile) return
                    event.preventDefault()
                    void handleIconUpload(imageFile)
                  }}
                  className={inputClass}
                  placeholder="图标字母、文字或图片地址"
                />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="flex h-16 w-16 overflow-hidden rounded-2xl bg-secondary text-lg font-black text-foreground">
                    <div className="flex h-full w-full items-center justify-center">
                      {form.icon && looksLikeImageUrl(form.icon) ? (
                        <Image src={resolveAssetUrl(form.icon) || form.icon} alt="图标预览" width={64} height={64} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <span>{form.icon || getInitial(form.title)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Field>
          </div>

          <Field label="正文">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <ModeButton active={editorMode === "visual"} onClick={() => setEditorMode("visual")}>
                    <Eye className="h-4 w-4" />
                    所见即所得预览
                  </ModeButton>
                  <ModeButton active={editorMode === "html"} onClick={() => setEditorMode("html")}>
                    <FileCode2 className="h-4 w-4" />
                    HTML 源码
                  </ModeButton>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <button type="button" onClick={handleOpenPreviewWindow} className="admin-secondary-btn px-3 py-1.5 text-xs">
                    在新窗口预览
                  </button>
                  <button
                    type="button"
                    disabled={uploadingInlineImage}
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = "image/*"
                      input.multiple = true
                      input.onchange = () => void handleInsertInlineImages(Array.from(input.files || []))
                      input.click()
                    }}
                    className="admin-secondary-btn px-3 py-1.5 text-xs"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploadingInlineImage ? "正文图片上传中..." : "上传正文图片"}
                  </button>
                </div>
              </div>

              {editorMode === "visual" ? (
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-3 text-xs text-muted-foreground">当前是原始 HTML 预览（不做格式重写），请在源码模式编辑正文。</p>
                  <iframe
                    title="html-preview"
                    srcDoc={form.content || "<p style='color:#888'>暂无内容</p>"}
                    className="h-[520px] w-full rounded-lg border border-border bg-white"
                  />
                </div>
              ) : (
                <textarea
                  ref={contentTextareaRef}
                  value={form.content}
                  onChange={(event) => handleHtmlContentChange(event.target.value)}
                  onPaste={handleEditorPaste}
                  rows={22}
                  className={inputClass}
                  placeholder="可查看并编辑完整 HTML 源码"
                />
              )}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
            <span>在首页推荐这篇文章</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || loading} className="admin-primary-btn px-6 py-3">
              {saving ? "保存中..." : "保存文章"}
            </button>
            {editingSlug ? (
              <button type="button" onClick={() => void handleDelete()} disabled={saving} className="rounded-2xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive">
                删除文章
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  )
}

function ModeButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          : "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      }
    >
      {children}
    </button>
  )
}
