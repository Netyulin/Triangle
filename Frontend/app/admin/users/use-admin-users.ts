"use client"

import { useEffect, useMemo, useState } from "react"
import {
  deleteAdminUser,
  deleteAdminUserDevice,
  fetchAdminUserDevices,
  fetchAdminUsers,
  saveAdminUserDevice,
  updateAdminUser,
  updateAdminUserPassword,
  type AdminUserDevice,
  type AdminUserItem,
} from "@/lib/admin-api"
import { normalizeMembershipLevel, type ActivityFilter, type RegistrationSourceFilter, type UserFilter } from "./users-shared"

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
  const [registrationSourceFilter, setRegistrationSourceFilter] = useState<RegistrationSourceFilter>("all")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [deviceMap, setDeviceMap] = useState<Record<number, AdminUserDevice[]>>({})
  const [deviceLoadingUserId, setDeviceLoadingUserId] = useState<number | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchAdminUsers()
      setUsers(data.list)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "用户数据加载失败。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const visibleUsers = useMemo(() => {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    return users.filter((item) => {
      const matchesStatus =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
            ? !item.status || item.status === "active"
            : item.status === activeFilter

      const source = item.registrationSource || "other"
      const matchesSource = registrationSourceFilter === "all" ? true : source === registrationSourceFilter

      const lastLoginMs = item.lastLoginAt ? new Date(item.lastLoginAt).getTime() : Number.NaN
      const hasLastLogin = Number.isFinite(lastLoginMs)

      const matchesActivity =
        activityFilter === "all"
          ? true
          : activityFilter === "never"
            ? !hasLastLogin
            : hasLastLogin &&
              (activityFilter === "today"
                ? lastLoginMs >= oneDayAgo
                : activityFilter === "7d"
                  ? lastLoginMs >= sevenDaysAgo
                  : lastLoginMs >= thirtyDaysAgo)

      return matchesStatus && matchesSource && matchesActivity
    })
  }, [activeFilter, activityFilter, registrationSourceFilter, users])

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((item) => !item.status || item.status === "active").length,
      disabled: users.filter((item) => item.status === "disabled").length,
      banned: users.filter((item) => item.status === "banned").length,
    }),
    [users],
  )

  const patchUser = (userId: number, patch: Partial<AdminUserItem>) => {
    setUsers((current) => current.map((item) => (item.id === userId ? { ...item, ...patch } : item)))
  }

  const toggleExpanded = async (user: AdminUserItem) => {
    setMessage("")
    if (expandedUserId === user.id) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(user.id)
    if (!deviceMap[user.id]) {
      setDeviceLoadingUserId(user.id)
      try {
        const devices = await fetchAdminUserDevices(user.id)
        setDeviceMap((current) => ({ ...current, [user.id]: devices }))
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "用户 UDID 列表加载失败。")
      } finally {
        setDeviceLoadingUserId(null)
      }
    }
  }

  const handleStatusUpdate = async (user: AdminUserItem, nextStatus: string) => {
    try {
      await updateAdminUser(user.id, { status: nextStatus })
      patchUser(user.id, { status: nextStatus })
      setMessage("用户状态已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "用户状态更新失败。")
    }
  }

  const handleMembershipUpdate = async (user: AdminUserItem) => {
    const nextLevel = window.prompt("输入会员等级：free / sponsor / lifetime / supreme", normalizeMembershipLevel(user.membershipLevel))
    if (!nextLevel) return
    try {
      const normalized = normalizeMembershipLevel(nextLevel)
      await updateAdminUser(user.id, { membershipLevel: normalized })
      patchUser(user.id, { membershipLevel: normalized })
      setMessage("会员等级已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "会员等级更新失败。")
    }
  }

  const handlePermissionToggle = async (
    user: AdminUserItem,
    key: "canComment" | "canReply" | "canSubmitRequest" | "canSign" | "canSelfSign",
  ) => {
    try {
      const nextValue = !Boolean(user[key])
      await updateAdminUser(user.id, { [key]: nextValue })
      patchUser(user.id, { [key]: nextValue })
      setMessage("权限已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "权限更新失败。")
    }
  }

  const handleBanDays = async (user: AdminUserItem) => {
    const value = window.prompt("请输入封禁天数，输入 0 表示解除封禁", "7")
    if (value === null) return
    const days = Number(value)
    if (Number.isNaN(days) || days < 0) return
    try {
      await updateAdminUser(user.id, { status: days > 0 ? "banned" : "active", banDays: days })
      patchUser(user.id, { status: days > 0 ? "banned" : "active" })
      setMessage("封禁状态已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "封禁操作失败。")
    }
  }

  const handlePasswordReset = async (user: AdminUserItem) => {
    const password = window.prompt("请输入新密码")
    if (!password) return
    try {
      await updateAdminUserPassword(user.id, password)
      setMessage("密码已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "密码修改失败。")
    }
  }

  const handleDelete = async (user: AdminUserItem) => {
    if (!window.confirm(`确定删除用户“${user.username}”吗？`)) return
    try {
      await deleteAdminUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setMessage("用户已删除。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "用户删除失败。")
    }
  }

  const handleCreateDevice = async (user: AdminUserItem) => {
    const udid = window.prompt("输入 UDID")
    if (!udid) return
    const deviceName = window.prompt("输入设备名称", "我的 iPhone") || ""
    const product = window.prompt("输入设备型号", "iPhone") || ""
    const version = window.prompt("输入系统版本", "iOS") || ""
    try {
      const item = await saveAdminUserDevice(user.id, { udid, deviceName, product, version })
      setDeviceMap((current) => ({
        ...current,
        [user.id]: [item, ...(current[user.id] || [])],
      }))
      setMessage("用户 UDID 已添加。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "添加 UDID 失败。")
    }
  }

  const handleEditDevice = async (user: AdminUserItem, device: AdminUserDevice) => {
    const udid = window.prompt("修改 UDID", device.udid)
    if (!udid) return
    const deviceName = window.prompt("修改设备名称", device.deviceName || "") || ""
    const product = window.prompt("修改设备型号", device.product || "") || ""
    const version = window.prompt("修改系统版本", device.version || "") || ""
    try {
      const updated = await saveAdminUserDevice(user.id, {
        deviceId: device.id,
        udid,
        deviceName,
        product,
        version,
      })
      setDeviceMap((current) => ({
        ...current,
        [user.id]: (current[user.id] || []).map((item) => (item.id === device.id ? updated : item)),
      }))
      setMessage("用户 UDID 已更新。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "修改 UDID 失败。")
    }
  }

  const handleDeleteDevice = async (user: AdminUserItem, device: AdminUserDevice) => {
    if (!window.confirm(`确定删除设备 ${device.deviceName || device.udid} 吗？`)) return
    try {
      await deleteAdminUserDevice(user.id, device.id)
      setDeviceMap((current) => ({
        ...current,
        [user.id]: (current[user.id] || []).filter((item) => item.id !== device.id),
      }))
      setMessage("用户 UDID 已删除。")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "删除 UDID 失败。")
    }
  }

  return {
    activeFilter,
    activityFilter,
    deviceLoadingUserId,
    deviceMap,
    error,
    expandedUserId,
    handleBanDays,
    handleCreateDevice,
    handleDelete,
    handleDeleteDevice,
    handleEditDevice,
    handleMembershipUpdate,
    handlePasswordReset,
    handlePermissionToggle,
    handleStatusUpdate,
    loading,
    message,
    patchUser,
    registrationSourceFilter,
    setActiveFilter,
    setActivityFilter,
    setError,
    setMessage,
    setRegistrationSourceFilter,
    stats,
    toggleExpanded,
    users,
    visibleUsers,
  }
}
