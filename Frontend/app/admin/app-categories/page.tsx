"use client"

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react"
import {
  CheckCircle2,
  Edit3,
  FileText,
  GripVertical,
  Package,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react"

import {
  createAdminAppCategory,
  createAdminPostCategory,
  deleteAdminAppCategory,
  deleteAdminPostCategory,
  fetchAdminAppCategories,
  fetchAdminPostCategories,
  reorderAdminAppCategories,
  reorderAdminPostCategories,
  type AppCategoryItem,
  type PostCategoryItem,
  updateAdminAppCategory,
  updateAdminPostCategory,
} from "@/lib/admin-api"

type CategoryForm = {
  name: string
}

type DragState = {
  type: "app" | "post"
  name: string
} | null

const initialForm: CategoryForm = { name: "" }

export default function AdminCategoriesPage() {
  const [appCategories, setAppCategories] = useState<AppCategoryItem[]>([])
  const [postCategories, setPostCategories] = useState<PostCategoryItem[]>([])

  const [appForm, setAppForm] = useState<CategoryForm>(initialForm)
  const [postForm, setPostForm] = useState<CategoryForm>(initialForm)

  const [appLoading, setAppLoading] = useState(true)
  const [postLoading, setPostLoading] = useState(true)
  const [appSaving, setAppSaving] = useState(false)
  const [postSaving, setPostSaving] = useState(false)

  const [appEditingName, setAppEditingName] = useState<string | null>(null)
  const [postEditingName, setPostEditingName] = useState<string | null>(null)

  const [appError, setAppError] = useState("")
  const [postError, setPostError] = useState("")
  const [appMessage, setAppMessage] = useState("")
  const [postMessage, setPostMessage] = useState("")

  const [dragState, setDragState] = useState<DragState>(null)
  const [dragOverName, setDragOverName] = useState<string | null>(null)
  const dragSourceRef = useRef<DragState>(null)

  const appEditInputRef = useRef<HTMLInputElement>(null)
  const postEditInputRef = useRef<HTMLInputElement>(null)

  const loadAppCategories = async () => {
    setAppLoading(true)
    try {
      const items = await fetchAdminAppCategories()
      setAppCategories(items)
      setAppError("")
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类列表加载失败")
    } finally {
      setAppLoading(false)
    }
  }

  const loadPostCategories = async () => {
    setPostLoading(true)
    try {
      const items = await fetchAdminPostCategories()
      setPostCategories(items)
      setPostError("")
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类列表加载失败")
    } finally {
      setPostLoading(false)
    }
  }

  useEffect(() => {
    void loadAppCategories()
    void loadPostCategories()
  }, [])

  useEffect(() => {
    if (appEditingName && appEditInputRef.current) {
      appEditInputRef.current.focus()
      appEditInputRef.current.select()
    }
  }, [appEditingName])

  useEffect(() => {
    if (postEditingName && postEditInputRef.current) {
      postEditInputRef.current.focus()
      postEditInputRef.current.select()
    }
  }, [postEditingName])

  const resetAppEditor = () => {
    setAppForm(initialForm)
    setAppEditingName(null)
    setAppError("")
  }

  const resetPostEditor = () => {
    setPostForm(initialForm)
    setPostEditingName(null)
    setPostError("")
  }

  const handleAppCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = appForm.name.trim()
    if (!nextName) {
      setAppError("请先填写分类名称。")
      return
    }

    setAppSaving(true)
    setAppError("")
    setAppMessage("")

    try {
      await createAdminAppCategory({ name: nextName })
      setAppMessage("软件分类已创建。")
      setAppForm(initialForm)
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类保存失败")
    } finally {
      setAppSaving(false)
    }
  }

  const handlePostCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = postForm.name.trim()
    if (!nextName) {
      setPostError("请先填写分类名称。")
      return
    }

    setPostSaving(true)
    setPostError("")
    setPostMessage("")

    try {
      await createAdminPostCategory({ name: nextName })
      setPostMessage("文章分类已创建。")
      setPostForm(initialForm)
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类保存失败")
    } finally {
      setPostSaving(false)
    }
  }

  const handleAppUpdate = async (originalName: string) => {
    const nextName = appForm.name.trim()
    if (!nextName) {
      setAppError("分类名称不能为空。")
      return
    }
    if (nextName === originalName) {
      resetAppEditor()
      return
    }

    setAppSaving(true)
    setAppError("")
    setAppMessage("")

    try {
      await updateAdminAppCategory(originalName, { name: nextName })
      setAppMessage("软件分类名称已更新。")
      resetAppEditor()
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类更新失败")
    } finally {
      setAppSaving(false)
    }
  }

  const handlePostUpdate = async (originalName: string) => {
    const nextName = postForm.name.trim()
    if (!nextName) {
      setPostError("分类名称不能为空。")
      return
    }
    if (nextName === originalName) {
      resetPostEditor()
      return
    }

    setPostSaving(true)
    setPostError("")
    setPostMessage("")

    try {
      await updateAdminPostCategory(originalName, { name: nextName })
      setPostMessage("文章分类名称已更新。")
      resetPostEditor()
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类更新失败")
    } finally {
      setPostSaving(false)
    }
  }

  const handleAppDelete = async (item: AppCategoryItem) => {
    if (item.count > 0) {
      setAppError("这个分类下还有软件，先挪走内容再删除。")
      return
    }
    if (!window.confirm(`确定删除「${item.name}」吗？`)) return

    setAppSaving(true)
    setAppError("")
    setAppMessage("")

    try {
      await deleteAdminAppCategory(item.name)
      setAppMessage("软件分类已删除。")
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类删除失败")
    } finally {
      setAppSaving(false)
    }
  }

  const handlePostDelete = async (item: PostCategoryItem) => {
    if (item.count > 0) {
      setPostError("这个分类下还有文章，先挪走内容再删除。")
      return
    }
    if (!window.confirm(`确定删除「${item.name}」吗？`)) return

    setPostSaving(true)
    setPostError("")
    setPostMessage("")

    try {
      await deleteAdminPostCategory(item.name)
      setPostMessage("文章分类已删除。")
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类删除失败")
    } finally {
      setPostSaving(false)
    }
  }

  const reorderItems = async (type: "app" | "post", fromName: string, toName: string) => {
    const items = type === "app" ? appCategories : postCategories
    const sourceIndex = items.findIndex((item) => item.name === fromName)
    const targetIndex = items.findIndex((item) => item.name === toName)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return

    const nextNames = items.map((item) => item.name)
    const [moved] = nextNames.splice(sourceIndex, 1)
    nextNames.splice(targetIndex, 0, moved)

    if (type === "app") {
      setAppSaving(true)
      setAppError("")
      setAppMessage("")
      try {
        const nextItems = await reorderAdminAppCategories(nextNames)
        setAppCategories(nextItems)
        setAppMessage("软件分类顺序已更新。")
      } catch (nextError) {
        setAppError(nextError instanceof Error ? nextError.message : "软件分类排序失败")
      } finally {
        setAppSaving(false)
      }
      return
    }

    setPostSaving(true)
    setPostError("")
    setPostMessage("")
    try {
      const nextItems = await reorderAdminPostCategories(nextNames)
      setPostCategories(nextItems)
      setPostMessage("文章分类顺序已更新。")
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类排序失败")
    } finally {
      setPostSaving(false)
    }
  }

  const handleDragStart = (event: React.DragEvent<HTMLElement>, type: "app" | "post", name: string) => {
    const source = { type, name } as const
    dragSourceRef.current = source
    setDragState(source)
    setDragOverName(name)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", JSON.stringify(source))
  }

  const handleDrop = async (event: React.DragEvent<HTMLElement>, type: "app" | "post", name: string) => {
    event.preventDefault()
    const rawPayload = event.dataTransfer.getData("text/plain")
    let parsedPayload: DragState = null
    try {
      parsedPayload = rawPayload ? (JSON.parse(rawPayload) as DragState) : null
    } catch {
      parsedPayload = null
    }
    const source = (parsedPayload && parsedPayload.type === type ? parsedPayload : dragSourceRef.current) ?? dragState

    if (!source || source.type !== type || source.name === name) return

    await reorderItems(type, source.name, name)
    setDragState(null)
    setDragOverName(null)
    dragSourceRef.current = null
  }

  const renderCategoryColumn = ({
    title,
    subtitle,
    icon,
    accentClass,
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
  }: {
    title: string
    subtitle: string
    icon: React.ReactNode
    accentClass: string
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
  }) => (
    <div className="space-y-5">
      <div className={`overflow-hidden rounded-2xl border ${accentClass}`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-900 shadow-sm">
                {icon}
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
                <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 leading-none">{categories.length}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">总数</div>
            </div>
          </div>
        </div>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={onCreate} className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">新增分类名称</label>
            <div className="relative">
              <input
                value={form.name}
                onChange={(event) => onFormChange(event.target.value)}
                placeholder="输入分类名称"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <Plus className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? "保存中..." : "创建分类"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 px-1">
          <Tags className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">分类列表</h3>
          <span className="ml-auto text-xs text-slate-500">拖拽左侧把手调整顺序</span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            分类列表加载中...
          </div>
        ) : categories.length ? (
          <div className="grid gap-2">
            {categories.map((item, index) => {
              const isEditing = editingName === item.name
              const isDragged = dragState?.type === type && dragState.name === item.name
              const isDragOver = dragOverName === item.name && dragState?.type === type && dragState.name !== item.name

              return (
                <div
                  key={item.name}
                  draggable={!isEditing}
                  onDragStart={(event) => handleDragStart(event, type, item.name)}
                  onDragOver={(event) => {
                    if (dragState?.type !== type) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                    setDragOverName(item.name)
                  }}
                  onDragLeave={() => {
                    if (dragOverName === item.name) setDragOverName(null)
                  }}
                  onDrop={(event) => void handleDrop(event, type, item.name)}
                  onDragEnd={() => {
                    setDragState(null)
                    setDragOverName(null)
                    dragSourceRef.current = null
                  }}
                  className={`rounded-xl border bg-white transition ${
                    isEditing
                      ? "border-slate-900 bg-slate-50"
                      : isDragged
                        ? "border-slate-300 opacity-50"
                        : isDragOver
                          ? "border-slate-900 ring-2 ring-slate-200"
                          : "border-slate-200 hover:border-slate-300"
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
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
                          >
                            <X className="h-3 w-3" />
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => onSaveEdit(item.name)}
                            disabled={saving}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <button
                            type="button"
                            className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-lg bg-slate-100 text-slate-500 active:cursor-grabbing"
                            aria-label="拖拽排序"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">
                                {index + 1}
                              </span>
                              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.count} 条内容</span>
                              {item.sortOrder !== undefined ? <span>顺序 {item.sortOrder + 1}</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onStartEdit(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="修改名称"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            disabled={saving || item.count > 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="删除分类"
                          >
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
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            还没有分类。
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {renderCategoryColumn({
        title: "软件分类",
        subtitle: "拖拽后会直接影响首页和前台分类下拉的顺序。",
        icon: <Package className="h-5 w-5" />,
        accentClass: "border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/50",
        categories: appCategories,
        loading: appLoading,
        saving: appSaving,
        form: appForm,
        editingName: appEditingName,
        error: appError,
        message: appMessage,
        inputRef: appEditInputRef,
        onFormChange: (value) => setAppForm({ name: value }),
        onCreate: handleAppCreate,
        onStartEdit: (item) => {
          setAppForm({ name: item.name })
          setAppEditingName(item.name)
          setAppError("")
          setAppMessage("")
        },
        onCancelEdit: resetAppEditor,
        onSaveEdit: (originalName) => void handleAppUpdate(originalName),
        onDelete: (item) => void handleAppDelete(item as AppCategoryItem),
        onKeyDown: (event, originalName) => {
          if (event.key === "Enter") void handleAppUpdate(originalName)
          if (event.key === "Escape") resetAppEditor()
        },
        type: "app",
      })}

      {renderCategoryColumn({
        title: "文章分类",
        subtitle: "文章列表和首页分类入口也会跟着这里的顺序走。",
        icon: <FileText className="h-5 w-5" />,
        accentClass: "border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/50",
        categories: postCategories,
        loading: postLoading,
        saving: postSaving,
        form: postForm,
        editingName: postEditingName,
        error: postError,
        message: postMessage,
        inputRef: postEditInputRef,
        onFormChange: (value) => setPostForm({ name: value }),
        onCreate: handlePostCreate,
        onStartEdit: (item) => {
          setPostForm({ name: item.name })
          setPostEditingName(item.name)
          setPostError("")
          setPostMessage("")
        },
        onCancelEdit: resetPostEditor,
        onSaveEdit: (originalName) => void handlePostUpdate(originalName),
        onDelete: (item) => void handlePostDelete(item as PostCategoryItem),
        onKeyDown: (event, originalName) => {
          if (event.key === "Enter") void handlePostUpdate(originalName)
          if (event.key === "Escape") resetPostEditor()
        },
        type: "post",
      })}
    </div>
  )
}

function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const className =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-red-200 bg-red-50 text-red-700"

  return <div className={`rounded-xl border px-4 py-3 text-sm ${className}`}>{children}</div>
}
