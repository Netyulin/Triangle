"use client"

import { useEffect, useMemo, useState } from "react"
import { MailPlus, Send } from "lucide-react"
import { fetchAdminInboxTemplates, fetchLevels, sendAdminInboxMessage, type AdminInboxTemplate } from "@/lib/admin-api"
import { PageHeader } from "@/components/admin/page-header"

type UserStatus = "active" | "disabled" | "banned"

const userStatusOptions: Array<{ value: UserStatus; label: string }> = [
  { value: "active", label: "正常用户" },
  { value: "disabled", label: "已禁用用户" },
  { value: "banned", label: "已封禁用户" },
]

export default function AdminNotificationSendPage() {
  const [templates, setTemplates] = useState<AdminInboxTemplate[]>([])
  const [templateKey, setTemplateKey] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [link, setLink] = useState("")
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([])
  const [membershipLevels, setMembershipLevels] = useState<string[]>([])
  const [membershipOptions, setMembershipOptions] = useState<Array<{ value: string; label: string }>>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const selectedTemplate = useMemo(() => templates.find((item) => item.key === templateKey) ?? null, [templateKey, templates])

  useEffect(() => {
    let active = true
    const loadData = async () => {
      setLoading(true)
      setError("")
      try {
        const [templateData, levelData] = await Promise.all([fetchAdminInboxTemplates(), fetchLevels()])
        if (!active) return
        setTemplates(templateData)
        setMembershipOptions(
          (levelData.levels ?? [])
            .filter((item) => Boolean(item.key))
            .map((item) => ({
              value: String(item.key),
              label: String(item.name || item.key),
            })),
        )
      } catch (nextError) {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : "加载站内信配置失败")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedTemplate) return
    setTitle(selectedTemplate.title || "")
    setContent(selectedTemplate.content || "")
  }, [selectedTemplate])

  const toggleUserStatus = (status: UserStatus) => {
    setUserStatuses((current) => (current.includes(status) ? current.filter((item) => item !== status) : [...current, status]))
  }

  const toggleMembershipLevel = (level: string) => {
    setMembershipLevels((current) => (current.includes(level) ? current.filter((item) => item !== level) : [...current, level]))
  }

  const handleSend = async () => {
    if (!content.trim()) {
      setError("请先填写发送内容。")
      return
    }

    setSending(true)
    setError("")
    setMessage("")

    try {
      const result = await sendAdminInboxMessage({
        templateKey: templateKey || undefined,
        title: title.trim() || undefined,
        content: content.trim(),
        link: link.trim() || undefined,
        sendToAll: userStatuses.length === 0 && membershipLevels.length === 0,
        userStatuses: userStatuses.length > 0 ? userStatuses : undefined,
        membershipLevels: membershipLevels.length > 0 ? membershipLevels : undefined,
      })
      setMessage(`发送成功，本次共触达 ${result.count} 位用户。`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "发送失败，请稍后重试")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="立即发送站内信"
        description="选择已设置模板，可按用户状态与会员等级筛选接收人群。"
        icon={<MailPlus className="h-5 w-5" />}
        iconClassName="bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-300"
      />

      {error ? <div className="admin-panel px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div> : null}
      {message ? <div className="admin-panel px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}

      <div className="admin-panel space-y-5 p-5">
        {loading ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">选择模板</label>
              <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className="admin-input">
                <option value="">不使用模板（手动填写）</option>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.title}（{template.key}）
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">按用户状态筛选</label>
                <div className="space-y-2">
                  {userStatusOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={userStatuses.includes(option.value)}
                        onChange={() => toggleUserStatus(option.value)}
                        className="h-4 w-4 border-border text-teal-600 focus:ring-teal-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">按会员等级筛选</label>
                <div className="space-y-2">
                  {membershipOptions.length > 0 ? (
                    membershipOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={membershipLevels.includes(option.value)}
                          onChange={() => toggleMembershipLevel(option.value)}
                          className="h-4 w-4 border-border text-teal-600 focus:ring-teal-500"
                        />
                        {option.label}
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无会员等级数据</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">标题</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="admin-input" placeholder="站内信标题" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">内容</label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="admin-input"
                rows={7}
                placeholder="请输入站内信内容"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">跳转链接（可选）</label>
              <input value={link} onChange={(event) => setLink(event.target.value)} className="admin-input" placeholder="/profile?tab=messages" />
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleSend} disabled={sending} className="admin-primary-btn inline-flex items-center gap-2 px-6 py-2.5">
                <Send className="h-4 w-4" />
                {sending ? "发送中..." : "立即发送"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
