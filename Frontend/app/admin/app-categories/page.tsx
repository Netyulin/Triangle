"use client"

import { FormEvent, useEffect, useMemo, useState, useRef } from "react"
import { Tags, Trash2, Edit3, Package, FileText, Plus, CheckCircle, X } from "lucide-react"
import {
  createAdminAppCategory,
  deleteAdminAppCategory,
  fetchAdminAppCategories,
  updateAdminAppCategory,
  type AppCategoryItem,
  createAdminPostCategory,
  deleteAdminPostCategory,
  fetchAdminPostCategories,
  updateAdminPostCategory,
  type PostCategoryItem,
} from "@/lib/admin-api"

type CategoryForm = {
  name: string
}

const initialForm: CategoryForm = {
  name: "",
}

export default function AdminCategoriesPage() {
  // App categories
  const [appCategories, setAppCategories] = useState<AppCategoryItem[]>([])
  const [appForm, setAppForm] = useState<CategoryForm>(initialForm)
  const [appLoading, setAppLoading] = useState(true)
  const [appSaving, setAppSaving] = useState(false)
  const [appError, setAppError] = useState("")
  const [appMessage, setAppMessage] = useState("")
  const [appEditingName, setAppEditingName] = useState<string | null>(null)
  const appEditInputRef = useRef<HTMLInputElement>(null)

  // Post categories
  const [postCategories, setPostCategories] = useState<PostCategoryItem[]>([])
  const [postForm, setPostForm] = useState<CategoryForm>(initialForm)
  const [postLoading, setPostLoading] = useState(true)
  const [postSaving, setPostSaving] = useState(false)
  const [postError, setPostError] = useState("")
  const [postMessage, setPostMessage] = useState("")
  const [postEditingName, setPostEditingName] = useState<string | null>(null)
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

  // Focus input when editing starts
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

  const appRows = useMemo(() => [...appCategories].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)), [appCategories])
  const postRows = useMemo(() => [...postCategories].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)), [postCategories])

  const resetAppForm = () => {
    setAppForm(initialForm)
    setAppEditingName(null)
    setAppMessage("")
    setAppError("")
  }

  const resetPostForm = () => {
    setPostForm(initialForm)
    setPostEditingName(null)
    setPostMessage("")
    setPostError("")
  }

  const startAppEdit = (item: AppCategoryItem) => {
    setAppForm({ name: item.name })
    setAppEditingName(item.name)
    setAppMessage("")
    setAppError("")
  }

  const cancelAppEdit = () => {
    setAppEditingName(null)
    setAppForm(initialForm)
    setAppError("")
  }

  const startPostEdit = (item: PostCategoryItem) => {
    setPostForm({ name: item.name })
    setPostEditingName(item.name)
    setPostMessage("")
    setPostError("")
  }

  const cancelPostEdit = () => {
    setPostEditingName(null)
    setPostForm(initialForm)
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
      setAppMessage("分类已创建。")
      resetAppForm()
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "分类保存失败")
    } finally {
      setAppSaving(false)
    }
  }

  const handleAppUpdate = async (originalName: string) => {
    const nextName = appForm.name.trim()
    if (!nextName) {
      setAppError("分类名称不能为空。")
      return
    }
    if (nextName === originalName) {
      cancelAppEdit()
      return
    }

    setAppSaving(true)
    setAppError("")
    setAppMessage("")

    try {
      await updateAdminAppCategory(originalName, { name: nextName })
      setAppMessage("分类名称已修改，相关软件也已经同步。")
      cancelAppEdit()
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "分类保存失败")
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
      setPostMessage("分类已创建。")
      resetPostForm()
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "分类保存失败")
    } finally {
      setPostSaving(false)
    }
  }

  const handlePostUpdate = async (originalName: string) => {
    const nextName = postForm.name.trim()
    if (!nextName) {
      setPostError("分类名称不能为空。")
      return
    }
    if (nextName === originalName) {
      cancelPostEdit()
      return
    }

    setPostSaving(true)
    setPostError("")
    setPostMessage("")

    try {
      await updateAdminPostCategory(originalName, { name: nextName })
      setPostMessage("分类名称已修改，相关文章也已经同步。")
      cancelPostEdit()
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "分类保存失败")
    } finally {
      setPostSaving(false)
    }
  }

  const handleAppDelete = async (item: AppCategoryItem) => {
    if (item.count > 0) {
      setAppError("这个分类下面还有软件，先把软件换到别的分类再删。")
      return
    }

    if (!window.confirm(`确定删除「${item.name}」吗？`)) {
      return
    }

    setAppSaving(true)
    setAppError("")
    setAppMessage("")

    try {
      await deleteAdminAppCategory(item.name)
      setAppMessage("分类已删除。")
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "分类删除失败")
    } finally {
      setAppSaving(false)
    }
  }

  const handlePostDelete = async (item: PostCategoryItem) => {
    if (item.count > 0) {
      setPostError("这个分类下面还有文章，先把文章换到别的分类再删。")
      return
    }

    if (!window.confirm(`确定删除「${item.name}」吗？`)) {
      return
    }

    setPostSaving(true)
    setPostError("")
    setPostMessage("")

    try {
      await deleteAdminPostCategory(item.name)
      setPostMessage("分类已删除。")
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "分类删除失败")
    } finally {
      setPostSaving(false)
    }
  }

  const handleAppKeyDown = (e: React.KeyboardEvent, originalName: string) => {
    if (e.key === 'Enter') {
      void handleAppUpdate(originalName)
    } else if (e.key === 'Escape') {
      cancelAppEdit()
    }
  }

  const handlePostKeyDown = (e: React.KeyboardEvent, originalName: string) => {
    if (e.key === 'Enter') {
      void handlePostUpdate(originalName)
    } else if (e.key === 'Escape') {
      cancelPostEdit()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Software Categories Column */}
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">软件分类</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">管理软件分发分类</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">{appCategories.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">分类总数</div>
              </div>
            </div>
          </div>
        </div>

        {appError ? (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
            <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
            {appError}
          </div>
        ) : null}

        {appMessage ? (
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-[-1px]" />
            {appMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
          <form onSubmit={handleAppCreate} className="space-y-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                新增分类名称
              </label>
              <div className="relative">
                <input
                  value={appForm.name}
                  onChange={(event) => setAppForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例如：开发、设计、效率"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <Plus className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={appSaving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                {appSaving ? "创建中..." : "创建分类"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Tags className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">分类列表</h3>
          </div>

          {appLoading ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              分类列表加载中...
            </div>
          ) : appRows.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {appRows.map((item) => (
                <div
                  key={item.name}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md ${
                    appEditingName === item.name
                      ? "border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30"
                      : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-600/50"
                  }`}
                >
                  <div className="p-3">
                    {appEditingName === item.name ? (
                      <div className="space-y-2">
                        <input
                          ref={appEditInputRef}
                          value={appForm.name}
                          onChange={(event) => setAppForm((current) => ({ ...current, name: event.target.value }))}
                          onKeyDown={(e) => handleAppKeyDown(e, item.name)}
                          className="w-full rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={cancelAppEdit}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="h-3 w-3" />
                            取消
                          </button>
                          <button
                            onClick={() => void handleAppUpdate(item.name)}
                            disabled={appSaving}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            <CheckCircle className="h-3 w-3" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                item.count > 0
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
                                {item.count} {item.count === 1 ? "软件" : "软件"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => startAppEdit(item)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-900/50 dark:hover:text-blue-400"
                              title="修改名称"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => void handleAppDelete(item)}
                              disabled={appSaving || item.count > 0}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                              title="删除分类"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {item.updatedAt && (
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">更新于 {item.updatedAt}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              还没有分类。
            </div>
          )}
        </div>
      </div>

      {/* Article Categories Column */}
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">文章分类</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">管理博客文章分类</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{postCategories.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">分类总数</div>
              </div>
            </div>
          </div>
        </div>

        {postError ? (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
            <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
            {postError}
          </div>
        ) : null}

        {postMessage ? (
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-[-1px]" />
            {postMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
          <form onSubmit={handlePostCreate} className="space-y-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                新增分类名称
              </label>
              <div className="relative">
                <input
                  value={postForm.name}
                  onChange={(event) => setPostForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例如：教程、评测、开源"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <Plus className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={postSaving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                {postSaving ? "创建中..." : "创建分类"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Tags className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">分类列表</h3>
          </div>

          {postLoading ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              分类列表加载中...
            </div>
          ) : postRows.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {postRows.map((item) => (
                <div
                  key={item.name}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md ${
                    postEditingName === item.name
                      ? "border-emerald-500 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/30"
                      : "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-600/50"
                  }`}
                >
                  <div className="p-3">
                    {postEditingName === item.name ? (
                      <div className="space-y-2">
                        <input
                          ref={postEditInputRef}
                          value={postForm.name}
                          onChange={(event) => setPostForm((current) => ({ ...current, name: event.target.value }))}
                          onKeyDown={(e) => handlePostKeyDown(e, item.name)}
                          className="w-full rounded-lg border border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={cancelPostEdit}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="h-3 w-3" />
                            取消
                          </button>
                          <button
                            onClick={() => void handlePostUpdate(item.name)}
                            disabled={postSaving}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle className="h-3 w-3" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                item.count > 0
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
                                {item.count} {item.count === 1 ? "文章" : "文章"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => startPostEdit(item)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-600 dark:text-slate-500 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-400"
                              title="修改名称"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => void handlePostDelete(item)}
                              disabled={postSaving || item.count > 0}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                              title="删除分类"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {item.updatedAt && (
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">更新于 {item.updatedAt}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              还没有分类。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
