"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { MessageSquare, Reply, Star, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react"

import { useAppContext } from "@/components/app-provider"
import { buildAuthUrl } from "@/lib/utils"
import {
  createComment,
  fetchAppRating,
  fetchComments,
  reactComment,
  removeComment,
  submitAppRating,
  type CommentItem,
} from "@/lib/api"

type ContentInteractionsProps = {
  contentType: "app" | "post"
  contentId: string
  contentTitle: string
  enableRating?: boolean
}

function formatTimeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("zh-CN", { hour12: false })
}

function sanitizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

export function ContentInteractions({
  contentType,
  contentId,
  contentTitle,
  enableRating = false,
}: ContentInteractionsProps) {
  const { token, user } = useAppContext()

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [inputValue, setInputValue] = useState("")
  const [anonymousMain, setAnonymousMain] = useState(false)

  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyValue, setReplyValue] = useState("")
  const [anonymousReply, setAnonymousReply] = useState(false)
  const [replySubmitting, setReplySubmitting] = useState(false)

  const [ratingLoading, setRatingLoading] = useState(enableRating)
  const [ratingError, setRatingError] = useState("")
  const [averageRating, setAverageRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  const canPost = Boolean(token && user)

  const userHasMainComment = useMemo(() => {
    if (!user) return false
    return comments.some((item) => item.parentId == null && item.userId === user.id)
  }, [comments, user])

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    setCommentsError("")
    try {
      const data = await fetchComments(contentType, contentId, token || undefined)
      setComments(data)
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "评论加载失败")
    } finally {
      setCommentsLoading(false)
    }
  }, [contentType, contentId, token])

  const loadRating = useCallback(async () => {
    if (!enableRating) return
    setRatingLoading(true)
    setRatingError("")
    try {
      const payload = await fetchAppRating(contentId, token || undefined)
      setAverageRating(payload.averageRating ?? 0)
      setReviewCount(payload.reviewCount ?? 0)
      setUserRating(payload.userRating ?? 0)
    } catch (error) {
      setRatingError(error instanceof Error ? error.message : "评分加载失败")
    } finally {
      setRatingLoading(false)
    }
  }, [contentId, enableRating, token])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  useEffect(() => {
    void loadRating()
  }, [loadRating])

  const submitMainComment = async () => {
    if (!token) return
    const content = sanitizeText(inputValue)
    if (!content) return

    setSubmitting(true)
    setCommentsError("")
    try {
      await createComment(
        {
          contentType,
          contentId,
          content,
          anonymous: anonymousMain,
        },
        token
      )
      setInputValue("")
      setAnonymousMain(false)
      await loadComments()
      if (enableRating) {
        await loadRating()
      }
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "评论提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async () => {
    if (!token || !replyingTo) return
    const content = sanitizeText(replyValue)
    if (!content) return

    setReplySubmitting(true)
    setCommentsError("")
    try {
      await createComment(
        {
          contentType,
          contentId,
          parentId: replyingTo,
          content,
          anonymous: anonymousReply,
        },
        token
      )
      setReplyingTo(null)
      setReplyValue("")
      setAnonymousReply(false)
      await loadComments()
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "回复提交失败")
    } finally {
      setReplySubmitting(false)
    }
  }

  const submitReaction = async (commentId: string, action: "like" | "dislike") => {
    if (!token) return
    try {
      await reactComment(commentId, action, token)
      await loadComments()
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "操作失败")
    }
  }

  const deleteOne = async (commentId: string) => {
    if (!token) return
    try {
      await removeComment(commentId, token)
      await loadComments()
      if (enableRating) {
        await loadRating()
      }
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "删除失败")
    }
  }

  const rateApp = async (value: number) => {
    if (!token || !enableRating || ratingSubmitting) return
    setRatingSubmitting(true)
    setRatingError("")
    try {
      const payload = await submitAppRating(contentId, value, token)
      setAverageRating(payload.averageRating ?? 0)
      setReviewCount(payload.reviewCount ?? 0)
      setUserRating(payload.userRating ?? value)
    } catch (error) {
      setRatingError(error instanceof Error ? error.message : "评分失败")
    } finally {
      setRatingSubmitting(false)
    }
  }

  const renderComment = (comment: CommentItem, depth = 0) => (
    <div key={comment.id} className={`rounded-2xl border border-border bg-card p-4 ${depth > 0 ? "mt-3" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">{comment.authorName || "用户"}</span>
            {comment.isAdminReply ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                管理员回复
              </span>
            ) : null}
            {!comment.isAnonymous && comment.authorMembershipLabel ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                {comment.authorMembershipLabel}
              </span>
            ) : null}
            {!comment.isAnonymous && comment.authorUsername ? (
              <span className="text-xs text-muted-foreground">@{comment.authorUsername}</span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{formatTimeLabel(comment.createdAt)}</div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{comment.content}</div>
        </div>

        {comment.canDelete ? (
          <button
            type="button"
            onClick={() => void deleteOne(comment.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!token}
          onClick={() => void submitReaction(comment.id, "like")}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition ${
            comment.userLiked ? "border-emerald-400 text-emerald-600" : "border-border text-muted-foreground"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {comment.likes ?? 0}
        </button>
        <button
          type="button"
          disabled={!token}
          onClick={() => void submitReaction(comment.id, "dislike")}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition ${
            comment.userDisliked ? "border-rose-400 text-rose-600" : "border-border text-muted-foreground"
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {comment.dislikes ?? 0}
        </button>
        <button
          type="button"
          disabled={!token}
          onClick={() => {
            setReplyingTo(comment.id)
            setReplyValue("")
            setAnonymousReply(false)
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Reply className="h-3.5 w-3.5" />
          回复
        </button>
      </div>

      {replyingTo === comment.id ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3">
          <textarea
            value={replyValue}
            onChange={(event) => setReplyValue(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={`回复 ${comment.authorName}`}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={anonymousReply}
              onChange={(event) => setAnonymousReply(event.target.checked)}
            />
            匿名回复
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submitReply()}
              disabled={replySubmitting || !sanitizeText(replyValue)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {replySubmitting ? "提交中..." : "提交回复"}
            </button>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
        <div className="mt-3 border-l border-border pl-3">
          {comment.replies.map((item) => renderComment(item, depth + 1))}
        </div>
      ) : null}
    </div>
  )

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <h2 className="text-base font-semibold">评分与评论</h2>
      </div>

      {enableRating ? (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-sm font-medium text-foreground">为“{contentTitle}”评分</div>
          <div className="mt-2 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                disabled={!token || ratingSubmitting || ratingLoading}
                onClick={() => void rateApp(value)}
                className="transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Star
                  className={`h-5 w-5 ${
                    value <= Math.round(userRating || averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs text-muted-foreground">
              {averageRating > 0 ? `${averageRating.toFixed(1)} 分` : "暂无评分"} · {reviewCount} 条评分
            </span>
          </div>
          {ratingError ? <p className="mt-2 text-xs text-destructive">{ratingError}</p> : null}
          {!token ? (
            <p className="mt-2 text-xs text-muted-foreground">登录后可评分</p>
          ) : null}
        </div>
      ) : null}

      {!canPost ? (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          仅登录用户可发表评论。请先
          <Link href={buildAuthUrl("/login")} className="mx-1 text-primary underline">
            登录
          </Link>
          或
          <Link href={buildAuthUrl("/register")} className="mx-1 text-primary underline">
            注册
          </Link>
          。
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-border bg-background p-4">
          {userHasMainComment ? (
            <p className="text-xs text-muted-foreground">每位用户对当前内容仅允许发布 1 条主评论，你仍可回复他人评论。</p>
          ) : null}
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="写下你的评论..."
            disabled={userHasMainComment}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-70"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={anonymousMain}
                onChange={(event) => setAnonymousMain(event.target.checked)}
                disabled={userHasMainComment}
              />
              匿名评论
            </label>
            <button
              type="button"
              onClick={() => void submitMainComment()}
              disabled={submitting || userHasMainComment || !sanitizeText(inputValue)}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "提交中..." : "发布评论"}
            </button>
          </div>
        </div>
      )}

      {commentsError ? <p className="text-xs text-destructive">{commentsError}</p> : null}

      <div className="space-y-3">
        {commentsLoading ? <p className="text-sm text-muted-foreground">评论加载中...</p> : null}
        {!commentsLoading && comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有评论，来抢沙发吧。</p>
        ) : null}
        {!commentsLoading ? comments.map((comment) => renderComment(comment)) : null}
      </div>
    </section>
  )
}
