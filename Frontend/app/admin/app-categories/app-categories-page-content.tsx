"use client"

import { type FormEvent, type ReactNode } from "react"
import { CheckCircle2, Edit3, FileText, GripVertical, Package, Plus, Tags, Trash2, X } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { type AppCategoryItem, type PostCategoryItem } from "@/lib/admin-api"
import { inputClass, type CategoryForm, type DragState } from "./app-categories-shared"
import { useAdminCategories } from "./use-admin-categories"

export default function AdminCategoriesPageContent() {
  const {
    appCategories,
    appEditInputRef,
    appEditingName,
    appError,
    appForm,
    appLoading,
    appMessage,
    appSaving,
    dragOverName,
    dragState,
    handleAppCreate,
    handleAppDelete,
    handleAppEditKeyDown,
    handleAppEditStart,
    handleAppUpdate,
    handleDragStart,
    handleDrop,
    handlePostCreate,
    handlePostDelete,
    handlePostEditKeyDown,
    handlePostEditStart,
    handlePostUpdate,
    postCategories,
    postEditInputRef,
    postEditingName,
    postError,
    postForm,
    postLoading,
    postMessage,
    postSaving,
    resetAppEditor,
    resetDragState,
    resetPostEditor,
    setAppForm,
    setDragOverName,
    setPostForm,
  } = useAdminCategories()

  return (
    <div className="space-y-5">
      <PageHeader
        title="分类管理"
        description="管理软件和文章的分类，支持拖拽排序。"
        icon={<Tags className="h-5 w-5" />}
        iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryColumn
          title="软件分类"
          subtitle="拖拽顺序会直接影响前台的软件分类展示。"
          icon={<Package className="h-5 w-5" />}
          categories={appCategories}
          loading={appLoading}
          saving={appSaving}
          form={appForm}
          editingName={appEditingName}
          error={appError}
          message={appMessage}
          inputRef={appEditInputRef}
          onFormChange={(value) => setAppForm({ name: value })}
          onCreate={handleAppCreate}
          onStartEdit={(item) => handleAppEditStart(item as AppCategoryItem)}
          onCancelEdit={resetAppEditor}
          onSaveEdit={(originalName) => void handleAppUpdate(originalName)}
          onDelete={(item) => void handleAppDelete(item as AppCategoryItem)}
          onKeyDown={handleAppEditKeyDown}
          type="app"
          dragState={dragState}
          dragOverName={dragOverName}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragStateReset={resetDragState}
          onDragOverNameChange={setDragOverName}
        />

        <CategoryColumn
          title="文章分类"
          subtitle="文章列表和首页分类入口也会跟着这里的顺序变化。"
          icon={<FileText className="h-5 w-5" />}
          categories={postCategories}
          loading={postLoading}
          saving={postSaving}
          form={postForm}
          editingName={postEditingName}
          error={postError}
          message={postMessage}
          inputRef={postEditInputRef}
          onFormChange={(value) => setPostForm({ name: value })}
          onCreate={handlePostCreate}
          onStartEdit={(item) => handlePostEditStart(item as PostCategoryItem)}
          onCancelEdit={resetPostEditor}
          onSaveEdit={(originalName) => void handlePostUpdate(originalName)}
          onDelete={(item) => void handlePostDelete(item as PostCategoryItem)}
          onKeyDown={handlePostEditKeyDown}
          type="post"
          dragState={dragState}
          dragOverName={dragOverName}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragStateReset={resetDragState}
          onDragOverNameChange={setDragOverName}
        />
      </div>
    </div>
  )
}

function CategoryColumn({
  title,
  subtitle,
  icon,
  categories,
  loading,
  saving,
  form,
  editingName,
  error,
  message,
  inputRef,
  onFormChange,
  onCreate,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onKeyDown,
  type,
  dragState,
  dragOverName,
  onDragStart,
  onDrop,
  onDragStateReset,
  onDragOverNameChange,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  categories: Array<AppCategoryItem | PostCategoryItem>
  loading: boolean
  saving: boolean
  form: CategoryForm
  editingName: string | null
  error: string
  message: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onFormChange: (value: string) => void
  onCreate: (event: FormEvent<HTMLFormElement>) => void
  onStartEdit: (item: AppCategoryItem | PostCategoryItem) => void
  onCancelEdit: () => void
  onSaveEdit: (originalName: string) => void
  onDelete: (item: AppCategoryItem | PostCategoryItem) => void
  onKeyDown: (event: React.KeyboardEvent, originalName: string) => void
  type: "app" | "post"
  dragState: DragState
  dragOverName: string | null
  onDragStart: (event: React.DragEvent<HTMLElement>, type: "app" | "post", name: string) => void
  onDrop: (event: React.DragEvent<HTMLElement>, type: "app" | "post", name: string) => Promise<void>
  onDragStateReset: () => void
  onDragOverNameChange: (value: string | null) => void
}) {
  return (
    <div className="space-y-5">
      <div className="admin-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              {icon}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold leading-none text-foreground">{categories.length}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">总数</div>
          </div>
        </div>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <div className="admin-panel p-4">
        <form onSubmit={onCreate} className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">新增分类名称</label>
            <div className="relative">
              <input value={form.name} onChange={(event) => onFormChange(event.target.value)} placeholder="输入分类名称" className={inputClass} />
              <Plus className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button type="submit" disabled={saving} className="admin-primary-btn inline-flex items-center gap-2 px-5 py-2.5">
              <Plus className="h-4 w-4" />
              {saving ? "保存中..." : "创建分类"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-panel p-4">
        <div className="mb-4 flex items-center gap-2 px-1">
          <Tags className="h-4 w-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-foreground">分类列表</h3>
          <span className="ml-auto text-xs text-muted-foreground">拖拽左侧把手调整顺序</span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            分类列表加载中...
          </div>
        ) : categories.length ? (
          <div className="grid gap-2">
            {categories.map((item, index) => {
              const isEditing = editingName === item.name
              const isDragged = dragState?.type === type && dragState.name === item.name
              const isDragOver =
                dragOverName === item.name &&
                dragState?.type === type &&
                dragState.name !== item.name

              return (
                <div
                  key={item.name}
                  draggable={!isEditing}
                  onDragStart={(event) => onDragStart(event, type, item.name)}
                  onDragOver={(event) => {
                    if (dragState?.type !== type) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                    onDragOverNameChange(item.name)
                  }}
                  onDragLeave={() => {
                    if (dragOverName === item.name) onDragOverNameChange(null)
                  }}
                  onDrop={(event) => void onDrop(event, type, item.name)}
                  onDragEnd={onDragStateReset}
                  className={`rounded-xl border bg-background transition ${
                    isEditing
                      ? "border-sky-300 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/20"
                      : isDragged
                        ? "border-border opacity-50"
                        : isDragOver
                          ? "border-sky-300 ring-2 ring-sky-200"
                          : "border-border hover:border-sky-300"
                  }`}
                >
                  <div className="p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          ref={inputRef}
                          value={form.name}
                          onChange={(event) => onFormChange(event.target.value)}
                          onKeyDown={(event) => onKeyDown(event, item.name)}
                          className={inputClass}
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={onCancelEdit} className="admin-secondary-btn inline-flex h-7 items-center justify-center gap-1 px-2 text-xs">
                            <X className="h-3 w-3" />
                            取消
                          </button>
                          <button type="button" onClick={() => onSaveEdit(item.name)} disabled={saving} className="admin-primary-btn inline-flex h-7 items-center justify-center gap-1 px-2 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <button type="button" className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-lg bg-secondary text-muted-foreground active:cursor-grabbing" aria-label="拖拽排序">
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                              <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-secondary px-2 py-0.5">{item.count} 条内容</span>
                              {item.sortOrder !== undefined ? <span>顺序 {item.sortOrder + 1}</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => onStartEdit(item)} className="admin-secondary-btn inline-flex h-8 w-8 items-center justify-center p-0" title="修改名称">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => onDelete(item)} disabled={saving || item.count > 0} className="admin-secondary-btn inline-flex h-8 w-8 items-center justify-center p-0 disabled:cursor-not-allowed disabled:opacity-40" title="删除分类">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            还没有分类。
          </div>
        )}
      </div>
    </div>
  )
}

function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div className={`admin-panel px-4 py-3 text-sm ${tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
      {children}
    </div>
  )
}
