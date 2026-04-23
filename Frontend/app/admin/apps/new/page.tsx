"use client"

import Image from "next/image"
import { type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, FileCode2, ImagePlus, Link2, Package, Plus, Trash2, Upload, WandSparkles } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { PageHeader } from "@/components/admin/page-header"
import { PageHeaderSkeleton, FormFieldSkeleton } from "@/components/admin/skeleton"
import { resolveAssetUrl } from "@/lib/admin-api"
import {
  extractImageFromClipboardData,
  platformOptions,
  sizeUnitOptions,
  toggleCompatibility,
  togglePlatformValue,
  type SizeUnit,
} from "./app-editor-shared"
import { useAdminAppEditor } from "./use-admin-app-editor"

export default function AdminAppEditorPage() {
  const searchParams = useSearchParams()
  const editingSlug = searchParams.get("slug") || ""
  const {
    categories,
    coverFileInputRef,
    coverPreview,
    error,
    editorMode,
    galleryFileInputRef,
    htmlFileInputRef,
    form,
    handleDelete,
    handleGalleryUpload,
    handleImportFromHtmlFile,
    handleImportFromUrl,
    handleImageUpload,
    handleInsertInlineImages,
    handleEditorPaste,
    handleHtmlContentChange,
    handleRemoveGalleryImage,
    handleRemoveImage,
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
    summaryTextareaRef,
    updateCompatibilityForPlatform,
    updateMediaField,
    uploadingCover,
    uploadingGallery,
    uploadingInlineImage,
    uploadingIcon,
  } = useAdminAppEditor(editingSlug)

  const handleOpenPreviewWindow = () => {
    const htmlBody = form.summary || "<p style='color:#888'>暂无内容</p>"
    const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>软件详情预览</title>
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

  if (loading) {
    return (
      <main className="space-y-5">
        <PageHeaderSkeleton />
        <div className="grid gap-6 md:grid-cols-2">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-5">
      {/* PageHeader */}
      <PageHeader
        title={editingSlug ? "编辑软件" : "新建软件"}
        description={editingSlug ? "编辑软件信息" : "添加新的软件条目到软件库"}
        icon={<Package className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"
        actions={
          <Link
            href="/admin/apps"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/25 hover:bg-secondary/70"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>
        }
      />

      {/* Error / Success Messages */}
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">导入助手</p>
            <h2 className="mt-2 text-2xl font-black text-foreground">像文章发布一样导入详情</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">支持输入网页链接抓取，或直接上传 HTML 文件自动解析并填充摘要说明。</p>
          </div>
          <WandSparkles className="hidden h-9 w-9 text-slate-400/40 dark:text-slate-500/40 md:block" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
            placeholder="输入要导入的网页链接"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleImportFromUrl}
            disabled={importing || !importUrl.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            {importing ? "导入中..." : "抓取并导入"}
          </button>
        </div>

        <div className="mt-3">
          <button
            type="button"
            disabled={importing}
            onClick={() => htmlFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
          >
            <FileCode2 className="h-4 w-4" />
            上传 HTML 文件导入
          </button>
          <input
            ref={htmlFileInputRef}
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(event) => void handleImportFromHtmlFile(event.target.files?.[0] || null)}
          />
        </div>
      </section>

      <form onSubmit={handleSubmit} className="admin-panel p-6 md:p-8">
        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="软件名称">
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                required
                className={inputClass}
                placeholder="输入软件名称"
              />
            </Field>
            <Field label="URL 别名">
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setForm((c) => ({ ...c, slug: e.target.value }))
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
                onChange={(e) => setForm((c) => ({ ...c, subtitle: e.target.value }))}
                className={inputClass}
                placeholder="一句话说明这个软件适合做什么"
              />
            </Field>
            <Field label="访问等级限制">
              <select
                value={form.accessLevel}
                onChange={(e) => setForm((c) => ({ ...c, accessLevel: e.target.value }))}
                className={inputClass}
              >
                <option value="free">注册用户（默认）</option>
                <option value="sponsor">赞助会员</option>
                <option value="lifetime">终身会员</option>
                <option value="supreme">至尊会员</option>
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">低于该等级的用户只能浏览详情，无法下载</p>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="状态">
              <select
                value={form.status}
                onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
                className={inputClass}
              >
                <option value="published">已发布</option>
                <option value="hidden">已隐藏</option>
                <option value="draft">草稿</option>
              </select>
            </Field>

            <Field label="分类">
              <div className="space-y-2">
                <input
                  list="app-category-options"
                  value={form.category}
                  onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                  placeholder="选择或输入分类名"
                  className={inputClass}
                />
                <datalist id="app-category-options">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">分类会自动同步到分类库里</p>
              </div>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="首页推荐">
              <label className="inline-flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((c) => ({ ...c, featured: e.target.checked }))}
                />
                <span>加入首页推荐与轮播候选</span>
              </label>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="当前版本">
              <input
                value={form.version}
                onChange={(e) => setForm((c) => ({ ...c, version: e.target.value }))}
                className={inputClass}
                placeholder="如：v1.0.0"
              />
            </Field>

            <Field label="文件大小">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                <input
                  value={form.size}
                  onChange={(e) => setForm((c) => ({ ...c, size: e.target.value }))}
                  className={inputClass}
                  placeholder="44.57"
                />
                <select
                  value={form.sizeUnit}
                  onChange={(e) => setForm((c) => ({ ...c, sizeUnit: e.target.value as SizeUnit }))}
                  className={inputClass}
                >
                  {sizeUnitOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* 封面图 & 图标 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="封面图">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => coverFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingCover ? "上传中..." : "上传本地封面"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePasteImage("heroImage")}
                    disabled={uploadingCover}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    粘贴剪贴板图片
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveImage("heroImage")}
                    disabled={!form.heroImage}
                    className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除封面
                  </button>
                  <span className="text-xs text-muted-foreground">也可以直接粘贴图片地址</span>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e.target.files?.[0] || null, "heroImage")}
                  />
                </div>
                <input
                  value={form.heroImage}
                  onChange={(e) => updateMediaField("heroImage", e.target.value)}
                  onPaste={(e) => {
                    const imageFile = extractImageFromClipboardData(e.clipboardData)
                    if (!imageFile) return
                    e.preventDefault()
                    void handleImageUpload(imageFile, "heroImage")
                  }}
                  className={inputClass}
                  placeholder="封面图地址"
                />
                {coverPreview ? (
                  <Image src={coverPreview} alt="封面预览" width={640} height={320} unoptimized className="h-40 w-full rounded-xl object-cover" />
                ) : null}
              </div>
            </Field>

            <Field label="应用图标">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={uploadingIcon}
                    onClick={() => iconFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingIcon ? "上传中..." : "上传本地图标"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePasteImage("icon")}
                    disabled={uploadingIcon}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    粘贴剪贴板图片
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveImage("icon")}
                    disabled={!form.icon}
                    className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除图标
                  </button>
                  <span className="text-xs text-muted-foreground">也可以直接填字母或图标地址</span>
                  <input
                    ref={iconFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e.target.files?.[0] || null, "icon")}
                  />
                </div>
                <input
                  value={form.icon}
                  onChange={(e) => updateMediaField("icon", e.target.value)}
                  onPaste={(e) => {
                    const imageFile = extractImageFromClipboardData(e.clipboardData)
                    if (!imageFile) return
                    e.preventDefault()
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
                    <p>{iconPreview ? "图标预览" : "这里会显示上传或粘贴后的图标"}</p>
                  </div>
                </div>
              </div>
            </Field>
          </div>

          <Field label="软件截图">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={uploadingGallery}
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingGallery ? "上传中..." : "上传截图"}
                </button>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleGalleryUpload(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, gallery: [...c.gallery, ""] }))}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70"
                >
                  <Plus className="h-4 w-4" />
                  手动添加地址
                </button>
              </div>

              {form.gallery.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {form.gallery.map((item, idx) => {
                    const preview = resolveAssetUrl(item) || item
                    return (
                      <div key={`${idx}-${item}`} className="space-y-2 rounded-xl border border-border bg-background p-3">
                        <div className="relative h-32 overflow-hidden rounded-lg bg-secondary">
                          {preview ? (
                            <Image src={preview} alt={`截图 ${idx + 1}`} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">未设置截图地址</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={item}
                            onChange={(e) =>
                              setForm((c) => ({
                                ...c,
                                gallery: c.gallery.map((g, i) => (i === idx ? e.target.value : g)),
                              }))
                            }
                            className={inputClass}
                            placeholder="截图地址"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRemoveGalleryImage(idx)}
                            className="inline-flex items-center justify-center rounded-xl border border-destructive/30 bg-background px-3 py-2 text-destructive transition hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂未添加截图</p>
              )}
            </div>
          </Field>

          {/* 平台 & 兼容 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="适用平台">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-3">
                {platformOptions.map((platform) => (
                  <label key={platform} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.platforms.includes(platform)}
                      onChange={() => {
                        setForm((c) => {
                          const nextPlatforms = togglePlatformValue(c.platforms, platform)
                          const nextCompatibility = updateCompatibilityForPlatform(platform, nextPlatforms)
                          return { ...c, platforms: nextPlatforms, compatibility: nextCompatibility }
                        })
                      }}
                    />
                    <span>{platform}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="兼容环境">
              <div className="grid gap-3 rounded-xl border border-border bg-background p-4">
                {form.platforms.includes("Windows") ? (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.compatibility.includes("PC")}
                      onChange={() =>
                        setForm((c) => ({
                          ...c,
                          compatibility: toggleCompatibility(c.compatibility, "PC"),
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
                          setForm((c) => ({
                            ...c,
                            compatibility: toggleCompatibility(c.compatibility, "Apple Silicon"),
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
                          setForm((c) => ({
                            ...c,
                            compatibility: toggleCompatibility(c.compatibility, "Intel芯片"),
                          }))
                        }
                      />
                      <span>Intel 芯片</span>
                    </label>
                  </>
                ) : null}

                {(form.platforms.includes("IOS") || form.platforms.includes("Android")) ? (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.compatibility.includes("移动平台")}
                      onChange={() =>
                        setForm((c) => ({
                          ...c,
                          compatibility: toggleCompatibility(c.compatibility, "移动平台"),
                        }))
                      }
                    />
                    <span>移动平台（iOS / Android 默认）</span>
                  </label>
                ) : null}
              </div>
            </Field>
          </div>

          {/* 摘要 */}
          <Field label="摘要说明">
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
                    {uploadingInlineImage ? "上传中..." : "上传摘要图片"}
                  </button>
                </div>
              </div>

              {editorMode === "visual" ? (
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-3 text-xs text-muted-foreground">可视模式用于预览最终效果；编辑请切换到 HTML 源码模式。</p>
                  <iframe
                    title="summary-preview"
                    srcDoc={form.summary || "<p style='color:#888'>暂无内容</p>"}
                    className="h-[420px] w-full rounded-lg border border-border bg-white"
                  />
                </div>
              ) : (
                <textarea
                  ref={summaryTextareaRef}
                  value={form.summary}
                  onChange={(event) => handleHtmlContentChange(event.target.value)}
                  onPaste={handleEditorPaste}
                  rows={16}
                  className={inputClass}
                  placeholder="可查看并编辑完整 HTML 源码"
                />
              )}
            </div>
          </Field>

          {/* 亮点 & 点评 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="亮点">
              <textarea
                value={form.highlights}
                onChange={(e) => setForm((c) => ({ ...c, highlights: e.target.value }))}
                rows={5}
                className={inputClass}
                placeholder="每行写一个亮点"
              />
            </Field>

            <Field label="编辑点评">
              <textarea
                value={form.review}
                onChange={(e) => setForm((c) => ({ ...c, review: e.target.value }))}
                rows={5}
                className={inputClass}
                placeholder="写下编辑点评"
              />
            </Field>
          </div>

          {/* 下载地址 */}
          <Field label="下载地址">
            <div className="space-y-4">
              {form.downloadLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[160px_minmax(0,1fr)_140px_auto]"
                >
                  <input
                    value={link.name}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        downloadLinks: c.downloadLinks.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        ),
                      }))
                    }
                    className={inputClass}
                    placeholder="网盘名称"
                  />
                  <input
                    value={link.url}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        downloadLinks: c.downloadLinks.map((item, i) =>
                          i === idx ? { ...item, url: e.target.value } : item
                        ),
                      }))
                    }
                    className={inputClass}
                    placeholder="下载链接"
                  />
                  <input
                    value={link.extractionCode || ""}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        downloadLinks: c.downloadLinks.map((item, i) =>
                          i === idx ? { ...item, extractionCode: e.target.value } : item
                        ),
                      }))
                    }
                    className={inputClass}
                    placeholder="提取码(可选)"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((c) => ({
                        ...c,
                        downloadLinks: c.downloadLinks.filter((_, i) => i !== idx),
                      }))
                    }
                    className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setForm((c) => ({
                    ...c,
                    downloadLinks: [...c.downloadLinks, { name: "", url: "", extractionCode: "" }],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary/70"
              >
                <Plus className="h-4 w-4" />
                添加网盘
              </button>
            </div>
          </Field>

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存软件"}
            </button>
            {editingSlug ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                删除软件
              </button>
            ) : null}
            <div className="flex-1" />
            <Link
              href="/admin/app-categories"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium transition hover:bg-secondary/70"
            >
              管理分类
            </Link>
          </div>
        </div>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
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

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
