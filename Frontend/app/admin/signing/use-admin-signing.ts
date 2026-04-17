"use client"

import { useEffect, useState, type FormEvent } from "react"
import {
  activateAdminSignCertificate,
  activateAdminSignProfile,
  deleteAdminSignCertificate,
  deleteAdminSignProfile,
  fetchAdminSignCertificates,
  fetchAdminSignConfig,
  fetchAdminSignProfiles,
  updateAdminSignCertificatePassword,
  updateAdminSignProfile,
  uploadAdminSignCertificate,
  uploadAdminSignProfile,
  type AdminSignCertificate,
  type AdminSignProfile,
} from "@/lib/admin-api"
import { initialCertForm, initialProfileForm, type ProfileDraft } from "./signing-shared"

export function useAdminSigning() {
  const [certs, setCerts] = useState<AdminSignCertificate[]>([])
  const [activeCertId, setActiveCertId] = useState<number | null>(null)
  const [profiles, setProfiles] = useState<AdminSignProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [certForm, setCertForm] = useState(initialCertForm)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({})
  const [profileForm, setProfileForm] = useState(initialProfileForm)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [profileDrafts, setProfileDrafts] = useState<Record<number, ProfileDraft>>({})

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const [certificates, profileList, config] = await Promise.all([
        fetchAdminSignCertificates(),
        fetchAdminSignProfiles(),
        fetchAdminSignConfig(),
      ])
      setCerts(certificates)
      setProfiles(profileList)
      setActiveCertId(config.activeCertificate?.id ?? null)
      setActiveProfileId(config.activeProfile?.id ?? null)
      setProfileDrafts(
        Object.fromEntries(
          profileList.map((item) => [item.id, { name: item.name, note: item.note || "" }]),
        ),
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "签名数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleCertUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!certFile) {
      setError("请先选择 .p12 证书文件")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const fd = new FormData()
      fd.append("certificate", certFile)
      fd.append("name", certForm.name.trim())
      fd.append("password", certForm.password)
      fd.append("isActive", String(certForm.isActive))
      await uploadAdminSignCertificate(fd)
      setCertForm(initialCertForm)
      setCertFile(null)
      setMessage("签名证书已上传")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书上传失败")
    } finally {
      setSaving(false)
    }
  }

  const handleCertActivate = async (id: number) => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await activateAdminSignCertificate(id)
      setMessage("已切换生效证书")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书切换失败")
    } finally {
      setSaving(false)
    }
  }

  const handleCertPasswordUpdate = async (id: number) => {
    const pwd = passwordDrafts[id]?.trim()
    if (!pwd) {
      setError("请先填写新密码")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminSignCertificatePassword(id, pwd)
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }))
      setMessage("证书密码已更新")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书密码更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleCertDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除证书“${name}”吗？`)) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteAdminSignCertificate(id)
      setMessage("证书已删除")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "证书删除失败")
    } finally {
      setSaving(false)
    }
  }

  const handleProfileUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!profileFile) {
      setError("请先选择 mobileprovision 文件")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")
    try {
      const fd = new FormData()
      fd.append("profile", profileFile)
      fd.append("name", profileForm.name.trim())
      fd.append("note", profileForm.note.trim())
      fd.append("isActive", String(profileForm.isActive))
      await uploadAdminSignProfile(fd)
      setProfileForm(initialProfileForm)
      setProfileFile(null)
      setMessage("描述文件已上传")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件上传失败")
    } finally {
      setSaving(false)
    }
  }

  const handleProfileActivate = async (id: number) => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await activateAdminSignProfile(id)
      setMessage("已切换生效描述文件")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件切换失败")
    } finally {
      setSaving(false)
    }
  }

  const handleProfileUpdate = async (item: AdminSignProfile) => {
    const draft = profileDrafts[item.id]
    if (!draft?.name.trim()) {
      setError("描述文件名称不能为空")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await updateAdminSignProfile(item.id, { name: draft.name.trim(), note: draft.note.trim() })
      setMessage("描述文件信息已更新")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleProfileDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除描述文件“${name}”吗？`)) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await deleteAdminSignProfile(id)
      setMessage("描述文件已删除")
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "描述文件删除失败")
    } finally {
      setSaving(false)
    }
  }

  return {
    activeCertId,
    activeProfileId,
    certFile,
    certForm,
    certs,
    error,
    handleCertActivate,
    handleCertDelete,
    handleCertPasswordUpdate,
    handleCertUpload,
    handleProfileActivate,
    handleProfileDelete,
    handleProfileUpdate,
    handleProfileUpload,
    loadData,
    loading,
    message,
    passwordDrafts,
    profileDrafts,
    profileFile,
    profileForm,
    profiles,
    saving,
    setCertFile,
    setCertForm,
    setPasswordDrafts,
    setProfileDrafts,
    setProfileFile,
    setProfileForm,
  }
}
