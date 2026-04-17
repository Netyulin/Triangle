"use client"

import Image from "next/image"
import { type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Package, Plus, Trash2, Upload } from "lucide-react"
import { AppIcon } from "@/components/app-icon"
import { PageHeader } from "@/components/admin/page-header"
import { TiptapEditor } from "@/components/admin/tiptap-editor"
import { PageHeaderSkeleton, FormFieldSkeleton } from "@/components/admin/skeleton"
import {
  extractImageFromClipboardData,
  platformOptions,
  pricingOptions,
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
    summaryContent,
    setSummaryContent,
    updateCompatibilityForPlatform,
    updateMediaField,
    uploadingCover,
    uploadingIcon,
  } = useAdminAppEditor(editingSlug)

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
            <Field label="收费方式">
              <select
                value={form.pricing}
                onChange={(e) => setForm((c) => ({ ...c, pricing: e.target.value }))}
                className={inputClass}
              >
                {pricingOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
              <TiptapEditor
                content={summaryContent}
                onChange={(content) => {
                  setSummaryContent(content)
                  setForm((c) => ({ ...c, summary: content }))
                }}
                placeholder="在这里填写软件摘要..."
                uploadImage={async (file: File) => {
                  const result = await uploadAdminImage(file, "app-cover")
                  return result.path
                }}
                minHeight="200px"
              />
              <p className="text-xs text-muted-foreground">支持富文本编辑，可插入图片</p>
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
                  className="grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]"
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
                    downloadLinks: [...c.downloadLinks, { name: "", url: "" }],
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

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
