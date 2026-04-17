"use client"

import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react"
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
import { initialForm, type CategoryForm, type DragState } from "./app-categories-shared"

export function useAdminCategories() {
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

  const loadAppCategories = async () => {
    setAppLoading(true)
    try {
      const items = await fetchAdminAppCategories()
      setAppCategories(items)
      setAppError("")
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类加载失败。")
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
      setPostError(nextError instanceof Error ? nextError.message : "文章分类加载失败。")
    } finally {
      setPostLoading(false)
    }
  }

  useEffect(() => {
    void loadAppCategories()
    void loadPostCategories()
  }, [])

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
      setAppError(nextError instanceof Error ? nextError.message : "软件分类保存失败。")
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
      setPostError(nextError instanceof Error ? nextError.message : "文章分类保存失败。")
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
      setAppMessage("软件分类已更新。")
      resetAppEditor()
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类更新失败。")
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
      setPostMessage("文章分类已更新。")
      resetPostEditor()
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类更新失败。")
    } finally {
      setPostSaving(false)
    }
  }

  const handleAppDelete = async (item: AppCategoryItem) => {
    if (item.count > 0) {
      setAppError("这个分类下还有软件，请先迁移内容后再删除。")
      return
    }
    if (!window.confirm(`确定删除“${item.name}”吗？`)) return

    setAppSaving(true)
    setAppError("")
    setAppMessage("")
    try {
      await deleteAdminAppCategory(item.name)
      setAppMessage("软件分类已删除。")
      await loadAppCategories()
    } catch (nextError) {
      setAppError(nextError instanceof Error ? nextError.message : "软件分类删除失败。")
    } finally {
      setAppSaving(false)
    }
  }

  const handlePostDelete = async (item: PostCategoryItem) => {
    if (item.count > 0) {
      setPostError("这个分类下还有文章，请先迁移内容后再删除。")
      return
    }
    if (!window.confirm(`确定删除“${item.name}”吗？`)) return

    setPostSaving(true)
    setPostError("")
    setPostMessage("")
    try {
      await deleteAdminPostCategory(item.name)
      setPostMessage("文章分类已删除。")
      await loadPostCategories()
    } catch (nextError) {
      setPostError(nextError instanceof Error ? nextError.message : "文章分类删除失败。")
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
        setAppError(nextError instanceof Error ? nextError.message : "软件分类排序失败。")
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
      setPostError(nextError instanceof Error ? nextError.message : "文章分类排序失败。")
    } finally {
      setPostSaving(false)
    }
  }

  const handleDragStart = (event: DragEvent<HTMLElement>, type: "app" | "post", name: string) => {
    const source = { type, name } as const
    dragSourceRef.current = source
    setDragState(source)
    setDragOverName(name)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", JSON.stringify(source))
  }

  const handleDrop = async (event: DragEvent<HTMLElement>, type: "app" | "post", name: string) => {
    event.preventDefault()

    const rawPayload = event.dataTransfer.getData("text/plain")
    let parsedPayload: DragState = null
    try {
      parsedPayload = rawPayload ? (JSON.parse(rawPayload) as DragState) : null
    } catch {
      parsedPayload = null
    }

    const source =
      (parsedPayload && parsedPayload.type === type ? parsedPayload : dragSourceRef.current) ??
      dragState

    if (!source || source.type !== type || source.name === name) return

    await reorderItems(type, source.name, name)
    resetDragState()
  }

  const resetDragState = () => {
    setDragState(null)
    setDragOverName(null)
    dragSourceRef.current = null
  }

  const handleAppEditStart = (item: AppCategoryItem) => {
    setAppForm({ name: item.name })
    setAppEditingName(item.name)
    setAppError("")
    setAppMessage("")
  }

  const handlePostEditStart = (item: PostCategoryItem) => {
    setPostForm({ name: item.name })
    setPostEditingName(item.name)
    setPostError("")
    setPostMessage("")
  }

  const handleAppEditKeyDown = (event: KeyboardEvent, originalName: string) => {
    if (event.key === "Enter") void handleAppUpdate(originalName)
    if (event.key === "Escape") resetAppEditor()
  }

  const handlePostEditKeyDown = (event: KeyboardEvent, originalName: string) => {
    if (event.key === "Enter") void handlePostUpdate(originalName)
    if (event.key === "Escape") resetPostEditor()
  }

  return {
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
  }
}
