"use client"

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react"
import { CheckCircle, Search, Shapes, Trash2 } from "lucide-react"
import { createAdminTopic, deleteAdminTopic, fetchAdminApps, fetchAdminPosts, fetchAdminTopics, updateAdminTopic } from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

type TopicStatus = "hidden" | "published" | "archived"

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
  status: "published",
  relatedAppSlugs: [],
  relatedPostSlugs: [],
}

const statusLabel: Record<TopicStatus, string> = {
  hidden: "已隐藏",
  published: "已发布",
  archived: "已归档",
}

const statusColor: Record<TopicStatus, string> = {
  hidden: "bg-secondary text-muted-foreground border-border",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  archived: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
}

function normalizeTopic(item: TopicApiItem): TopicRecord {
  return {
    slug: String(item.slug || ""),
    title: String(item.title || ""),
    description: String(item.description || ""),
    coverImage: String(item.coverImage || ""),
    status: item.status === "archived" ? "archived" : item.status === "hidden" ? "hidden" : "published",
    relatedAppSlugs: Array.isArray(item.relatedAppSlugs)
      ? item.relatedAppSlugs.filter(Boolean)
      : Array.isArray(item.relatedApps)
        ? item.relatedApps.map((entry) => entry.slug || "").filter(Boolean)
        : [],
    relatedPostSlugs: Array.isArray(item.relatedPostSlugs)
      ? item.relatedPostSlugs.filter(Boolean)
      : Array.isArray(item.relatedPosts)
        ? item.relatedPosts.map((entry) => entry.slug || "").filter(Boolean)
        : [],
  }
}

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<TopicRecord[]>([])
  const [apps, setApps] = useState<Array<{ slug: string; name: string }>>([])
  const [posts, setPosts] = useState<Array<{ slug: string; title: string }>>([])
  const [form, setForm] = useState<TopicForm>(initialForm)
  const [editingSlug, setEditingSlug] = useState("")
  const [appKeyword, setAppKeyword] = useState("")
  const [postKeyword, setPostKeyword] = useState("")
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

  const filteredApps = useMemo(() => {
    const keyword = appKeyword.trim().toLowerCase()
    return apps.filter((item) => !keyword || `${item.name} ${item.slug}`.toLowerCase().includes(keyword))
  }, [appKeyword, apps])

  const filteredPosts = useMemo(() => {
    const keyword = postKeyword.trim().toLowerCase()
    return posts.filter((item) => !keyword || `${item.title} ${item.slug}`.toLowerCase().includes(keyword))
  }, [postKeyword, posts])

  const rows = useMemo(
    () =>
      topics.map((topic) => ({
        ...topic,
        appNames: topic.relatedAppSlugs.map((slug) => apps.find((item) => item.slug === slug)?.name || slug).slice(0, 4),
        postTitles: topic.relatedPostSlugs.map((slug) => posts.find((item) => item.slug === slug)?.title || slug).slice(0, 4),
      })),
    [apps, posts, topics],
  )

  const resetForm = () => {
    setForm(initialForm)
    setEditingSlug("")
    setAppKeyword("")
    setPostKeyword("")
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

  const toggleRelatedApp = (slug: string) => {
    setForm((current) => ({
      ...current,
      relatedAppSlugs: current.relatedAppSlugs.includes(slug)
        ? current.relatedAppSlugs.filter((item) => item !== slug)
        : [...current.relatedAppSlugs, slug],
    }))
  }

  const toggleRelatedPost = (slug: string) => {
    setForm((current) => ({
      ...current,
      relatedPostSlugs: current.relatedPostSlugs.includes(slug)
        ? current.relatedPostSlugs.filter((item) => item !== slug)
        : [...current.relatedPostSlugs, slug],
    }))
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
      if (editingSlug === slug) resetForm()
      setMessage("专题已删除。")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "专题删除失败。")
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="专题管理"
        description="把软件和文章组合成更清晰的专题页。"
        icon={<Shapes className="h-5 w-5" />}
        iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel flex items-start gap-2 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle className="mt-[-1px] h-5 w-5 flex-shrink-0" />{message}</div> : null}

      <form onSubmit={handleSubmit} className="admin-panel p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{editingSlug ? "编辑专题" : "新建专题"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">软件和文章分开选择，避免混在一起。</p>
          </div>
          {editingSlug ? (
            <button type="button" onClick={resetForm} className="admin-secondary-btn px-4 py-2">
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="专题标题">
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required className={inputClass} />
          </Field>
          <Field label="专题别名">
            <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required disabled={Boolean(editingSlug)} className={inputClass} />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="专题描述">
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} required className={inputClass} />
          </Field>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="封面地址">
            <input value={form.coverImage} onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="状态">
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TopicStatus }))} className={inputClass}>
              <option value="published">已发布</option>
              <option value="hidden">已隐藏</option>
              <option value="archived">已归档</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SelectionPanel
            title="关联软件"
            keyword={appKeyword}
            onKeywordChange={setAppKeyword}
            placeholder="搜索软件名称或别名"
            items={filteredApps.map((item) => ({ id: item.slug, label: item.name, meta: item.slug }))}
            selectedIds={form.relatedAppSlugs}
            onToggle={toggleRelatedApp}
            emptyText="没有匹配的软件。"
          />
          <SelectionPanel
            title="关联文章"
            keyword={postKeyword}
            onKeywordChange={setPostKeyword}
            placeholder="搜索文章标题或别名"
            items={filteredPosts.map((item) => ({ id: item.slug, label: item.title, meta: item.slug }))}
            selectedIds={form.relatedPostSlugs}
            onToggle={toggleRelatedPost}
            emptyText="没有匹配的文章。"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saving} className="admin-primary-btn px-5 py-2.5">
            {saving ? "保存中..." : editingSlug ? "保存修改" : "创建专题"}
          </button>
          <span className="text-xs text-muted-foreground">已选软件 {form.relatedAppSlugs.length} 个，文章 {form.relatedPostSlugs.length} 篇。</span>
        </div>
      </form>

      <div className="admin-panel p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">专题列表</h2>
          <p className="mt-1 text-sm text-muted-foreground">当前共有 {topics.length} 个专题。</p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">正在加载专题数据...</div>
        ) : rows.length ? (
          <div className="space-y-3">
            {rows.map((topic) => (
              <div key={topic.slug} className="rounded-[24px] border border-border bg-background p-4 transition-colors hover:bg-secondary/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{topic.title}</h3>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor[topic.status]}`}>{statusLabel[topic.status]}</span>
                    </div>

                    {topic.description ? <p className="text-sm text-muted-foreground">{topic.description}</p> : null}

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        别名：<code className="rounded bg-secondary px-1 py-0.5">{topic.slug}</code>
                      </span>
                      {topic.appNames.length > 0 ? <span>软件：{topic.appNames.join("、")}</span> : null}
                      {topic.postTitles.length > 0 ? <span>文章：{topic.postTitles.join("、")}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(topic)} className="admin-secondary-btn px-3 py-2">
                      编辑
                    </button>
                    <button onClick={() => void handleDelete(topic.slug)} className="admin-secondary-btn inline-flex items-center gap-1 px-3 py-2">
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">还没有专题内容。</div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function SelectionPanel({
  title,
  keyword,
  onKeywordChange,
  placeholder,
  items,
  selectedIds,
  onToggle,
  emptyText,
}: {
  title: string
  keyword: string
  onKeywordChange: (value: string) => void
  placeholder: string
  items: Array<{ id: string; label: string; meta: string }>
  selectedIds: string[]
  onToggle: (id: string) => void
  emptyText: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder={placeholder} className={`${inputClass} pl-9`} />
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {items.length ? (
          items.map((item) => {
            const checked = selectedIds.includes(item.id)
            return (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                  checked ? "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30" : "border-border bg-background hover:border-sky-300"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} className="mt-1 h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
                </div>
              </label>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
        )}
      </div>
    </div>
  )
}

const inputClass = "admin-input"
