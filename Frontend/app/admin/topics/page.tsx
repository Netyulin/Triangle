"use client"

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react"
import { Shapes, Trash2, CheckCircle } from "lucide-react"
import { createAdminTopic, deleteAdminTopic, fetchAdminApps, fetchAdminPosts, fetchAdminTopics, updateAdminTopic } from "@/lib/admin-api"

type TopicStatus = "draft" | "published" | "archived"

type TopicForm = {
  slug: string
  title: string
  description: string
  coverImage: string
  status: TopicStatus
  relatedAppSlugs: string[]
  relatedPostSlugs: string[]
}

type TopicRecord = TopicForm

type TopicApiItem = Partial<TopicRecord> & {
  relatedApps?: Array<{ slug?: string | null }>
  relatedPosts?: Array<{ slug?: string | null }>
}

const initialForm: TopicForm = {
  slug: "",
  title: "",
  description: "",
  coverImage: "",
  status: "draft",
  relatedAppSlugs: [],
  relatedPostSlugs: [],
}

const statusLabel: Record<TopicStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
}

const statusColor: Record<TopicStatus, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  archived: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
}

function normalizeTopic(item: TopicApiItem): TopicRecord {
  const relatedAppSlugs = Array.isArray(item.relatedAppSlugs)
    ? item.relatedAppSlugs.filter(Boolean)
    : Array.isArray(item.relatedApps)
      ? item.relatedApps.map((entry) => entry.slug || "").filter(Boolean)
      : []

  const relatedPostSlugs = Array.isArray(item.relatedPostSlugs)
    ? item.relatedPostSlugs.filter(Boolean)
    : Array.isArray(item.relatedPosts)
      ? item.relatedPosts.map((entry) => entry.slug || "").filter(Boolean)
      : []

  return {
    slug: String(item.slug || ""),
    title: String(item.title || ""),
    description: String(item.description || ""),
    coverImage: String(item.coverImage || ""),
    status: item.status === "published" || item.status === "archived" ? item.status : "draft",
    relatedAppSlugs,
    relatedPostSlugs,
  }
}

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<TopicRecord[]>([])
  const [apps, setApps] = useState<Array<{ slug: string; name: string }>>([])
  const [posts, setPosts] = useState<Array<{ slug: string; title: string }>>([])
  const [form, setForm] = useState<TopicForm>(initialForm)
  const [editingSlug, setEditingSlug] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const loadData = async () => {
    setLoading(true)

    try {
      const [topicItems, appItems, postItems] = await Promise.all([fetchAdminTopics(), fetchAdminApps(), fetchAdminPosts()])

      setTopics((topicItems as TopicApiItem[]).map(normalizeTopic))
      setApps(appItems.map((item) => ({ slug: item.slug, name: item.name })))
      setPosts(postItems.map((item) => ({ slug: item.slug, title: item.title })))
      setError("")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "专题数据加载失败。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const rows = useMemo(
    () =>
      topics.map((topic) => ({
        ...topic,
        appNames: topic.relatedAppSlugs.map((slug) => apps.find((item) => item.slug === slug)?.name || slug).slice(0, 3),
        postTitles: topic.relatedPostSlugs.map((slug) => posts.find((item) => item.slug === slug)?.title || slug).slice(0, 3),
      })),
    [apps, posts, topics],
  )

  const resetForm = () => {
    setForm(initialForm)
    setEditingSlug("")
    setMessage("")
    setError("")
  }

  const startEdit = (topic: TopicRecord) => {
    setForm({
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      coverImage: topic.coverImage,
      status: topic.status,
      relatedAppSlugs: [...topic.relatedAppSlugs],
      relatedPostSlugs: [...topic.relatedPostSlugs],
    })
    setEditingSlug(topic.slug)
    setMessage("")
    setError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    try {
      if (editingSlug) {
        await updateAdminTopic(editingSlug, form)
        setMessage("专题已更新。")
      } else {
        await createAdminTopic(form)
        setMessage("专题已创建。")
      }

      resetForm()
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "专题保存失败。")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slug: string) => {
    if (!window.confirm("确定删除这个专题吗？")) return

    setMessage("")
    setError("")

    try {
      await deleteAdminTopic(slug)

      if (editingSlug === slug) {
        resetForm()
      }

      setMessage("专题已删除。")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "专题删除失败。")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/40 dark:to-purple-950/20 border border-violet-100 dark:border-violet-900">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
              <Shapes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">专题管理</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">把相关软件和文章组织成一个专题页，方便前台集中展示</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0 mt-[-1px]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 011.06 0L10 8.94l.66-.66a.75.75 0 111.06 1.06L11.06 10l.66.66a.75.75 0 11-1.06 1.06L10 11.06l-.66.66a.75.75 0 01-1.06-1.06L8.94 10l-.66-.66a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-[-1px]" />
          {message}
        </div>
      ) : null}

      {/* Create/Edit Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingSlug ? "编辑专题" : "新建专题"}</h2>
          </div>

          {editingSlug ? (
            <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="专题标题">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              className={inputClass}
            />
          </Field>

          <Field label="专题别名">
            <input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              required
              disabled={Boolean(editingSlug)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="专题描述">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="封面图地址">
            <input
              value={form.coverImage}
              onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))}
              className={inputClass}
            />
          </Field>

          <Field label="状态">
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TopicStatus }))}
              className={inputClass}
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="关联软件（按住 Ctrl/Command 多选）">
            <select
              multiple
              value={form.relatedAppSlugs}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  relatedAppSlugs: Array.from(event.target.selectedOptions).map((item) => item.value),
                }))
              }
              className={`${inputClass} min-h-36`}
            >
              {apps.map((app) => (
                <option key={app.slug} value={app.slug}>
                  {app.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="关联文章（按住 Ctrl/Command 多选）">
            <select
              multiple
              value={form.relatedPostSlugs}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  relatedPostSlugs: Array.from(event.target.selectedOptions).map((item) => item.value),
                }))
              }
              className={`${inputClass} min-h-36`}
            >
              {posts.map((post) => (
                <option key={post.slug} value={post.slug}>
                  {post.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-md hover:shadow-violet-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? "保存中..." : editingSlug ? "保存修改" : "创建专题"}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">按住 Ctrl 或 Command 可以多选关联项。</span>
        </div>
      </form>

      {/* Topic List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">专题列表</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">当前共有 {topics.length} 个专题。</p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">正在加载专题数据...</div>
        ) : rows.length ? (
          <div className="space-y-3">
            {rows.map((topic) => (
              <div key={topic.slug} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-4 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{topic.title}</h3>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor[topic.status]}`}>{statusLabel[topic.status]}</span>
                    </div>

                    {topic.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{topic.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <span>别名：<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">{topic.slug}</code></span>
                      {topic.appNames.length > 0 && (
                        <span>软件：{topic.appNames.join("，")}</span>
                      )}
                      {topic.postTitles.length > 0 && (
                        <span>文章：{topic.postTitles.join("，")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(topic)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/40 dark:hover:text-blue-400">
                      编辑
                    </button>
                    <button onClick={() => void handleDelete(topic.slug)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800/50 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/40">
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">还没有专题内容。</div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:focus:border-violet-500 dark:focus:ring-violet-500/20 text-slate-900 dark:text-slate-100"
