"use client"

import { useEffect, useState } from "react"
import { createLevel, deleteLevel, fetchLevels, updateLevel, type MembershipLevel } from "@/lib/admin-api"
import { defaultForm, type LevelForm } from "./levels-shared"

export function useAdminLevels() {
  const [levels, setLevels] = useState<MembershipLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState<LevelForm>(defaultForm)
  const [formError, setFormError] = useState("")

  const loadLevels = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchLevels()
      setLevels(data.levels ?? [])
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "等级列表加载失败。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLevels()
  }, [])

  const openAdd = () => {
    setEditingKey(null)
    setForm(defaultForm)
    setFormError("")
    setShowModal(true)
  }

  const openEdit = (level: MembershipLevel) => {
    setEditingKey(level.key)
    setForm({
      name: level.name,
      key: level.key,
      dailyDownloadLimit: level.dailyDownloadLimit,
      publicCertLimit: level.publicCertLimit,
      rechargePrice: level.rechargePrice,
      rechargeBonusPercent: level.rechargeBonusPercent,
      color: level.color || "#3B82F6",
      isActive: level.isActive,
    })
    setFormError("")
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingKey(null)
    setForm(defaultForm)
    setFormError("")
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("等级名称不能为空。")
      return
    }
    if (!editingKey && !form.key.trim()) {
      setFormError("Key 不能为空。")
      return
    }
    if (!editingKey && !/^[a-z0-9_-]+$/.test(form.key.trim())) {
      setFormError("Key 只能包含小写字母、数字、下划线和短横线。")
      return
    }

    setSaving(true)
    setFormError("")
    const payload = {
      name: form.name.trim(),
      dailyDownloadLimit: form.dailyDownloadLimit,
      publicCertLimit: form.publicCertLimit,
      rechargePrice: form.rechargePrice,
      rechargeBonusPercent: form.rechargeBonusPercent,
      color: form.color,
      isActive: form.isActive,
    }

    try {
      if (editingKey) {
        await updateLevel(editingKey, payload)
        setMessage("等级已更新。")
      } else {
        await createLevel({ ...payload, key: form.key.trim() })
        setMessage("等级已创建。")
      }
      closeModal()
      await loadLevels()
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "保存失败。")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (level: MembershipLevel) => {
    if (level.key === "free") {
      setError("不能删除默认的 free 等级。")
      return
    }
    if (!window.confirm(`确定删除等级“${level.name}”吗？此操作不可恢复。`)) return

    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteLevel(level.key)
      setMessage(`等级“${level.name}”已删除。`)
      await loadLevels()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除失败。")
    } finally {
      setSaving(false)
    }
  }

  return {
    closeModal,
    editingKey,
    error,
    form,
    formError,
    handleDelete,
    handleSave,
    levels,
    loading,
    message,
    openAdd,
    openEdit,
    saving,
    setForm,
    showModal,
  }
}
