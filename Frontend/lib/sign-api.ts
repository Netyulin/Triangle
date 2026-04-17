"use client"

import useSWR from "swr"
import { getToken, request } from "@/lib/api"

export type SignDevice = {
  id: number
  udid: string
  product: string | null
  version: string | null
  deviceName: string | null
  source: string
  createdAt: string
  updatedAt: string
}

export type SignAsset = {
  id: number
  ownerUserId: number | null
  scope: "system" | "user"
  name: string
  fileName: string
  filePath?: string
  subjectCn?: string | null
  teamId?: string | null
  note?: string | null
  appId?: string | null
  profileUuid?: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type SignTask = {
  id: number
  userId: number
  deviceId: number | null
  certificateId: number | null
  profileId: number | null
  status: "queued" | "running" | "completed" | "failed"
  progress: number
  stage: string
  ipaName: string
  downloadUrl: string | null
  installUrl: string | null
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  expiresAt: string | null
  cleanedAt: string | null
}

export type UdidSessionPayload = {
  installUrl: string
}

export type SignRuntimeConfig = {
  publicBaseUrl: string
  activeCertificate: SignAsset | null
  activeProfile: SignAsset | null
  systemCertificate: SignAsset | null
  systemProfile: SignAsset | null
  userCertificate: SignAsset | null
  userProfile: SignAsset | null
  availableCertificates: SignAsset[]
  availableProfiles: SignAsset[]
  permissions: {
    membershipLevel: string
    membershipRank: number
    canSign: boolean
    canSelfSign: boolean
    overrides?: {
      canSign: boolean
      canSelfSign: boolean
    } | null
  }
}

async function parseFetchResponse<T>(response: Response, fallbackMessage: string) {
  const payload = await response.json()
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallbackMessage)
  }
  return payload.data as T
}

export async function createUdidSession() {
  const token = getToken()
  const response = await fetch("/api/sign/udid/session", {
    method: "POST",
    headers: {
      "X-Token": token,
    },
    cache: "no-store",
  })

  return parseFetchResponse<UdidSessionPayload>(response, "获取 UDID 会话失败")
}

export async function fetchSignDevices() {
  return request<SignDevice[]>("/api/sign/devices")
}

export async function fetchSignTasks() {
  return request<SignTask[]>("/api/sign/tasks")
}

export async function fetchSignTask(taskId: number) {
  return request<SignTask>(`/api/sign/tasks/${taskId}`)
}

export async function fetchSignConfig() {
  return request<SignRuntimeConfig>("/api/sign/config")
}

export async function fetchMyCertificates() {
  return request<SignAsset[]>("/api/sign/certificates")
}

export async function fetchMyProfiles() {
  return request<SignAsset[]>("/api/sign/profiles")
}

export async function createMyCertificate(formData: FormData) {
  const token = getToken()
  const response = await fetch("/api/sign/certificates", {
    method: "POST",
    headers: {
      "X-Token": token,
    },
    body: formData,
    cache: "no-store",
  })

  return parseFetchResponse<SignAsset>(response, "上传证书失败")
}

export async function createMySigningBundle(formData: FormData) {
  const token = getToken()
  const response = await fetch("/api/sign/bundles", {
    method: "POST",
    headers: {
      "X-Token": token,
    },
    body: formData,
    cache: "no-store",
  })

  return parseFetchResponse<{
    certificate: SignAsset
    profile: SignAsset
    validation: {
      certificateTeamId: string
      profileTeamId: string
      appId: string | null
      profileUuid: string | null
      profileName: string | null
    }
  }>(response, "上传签名方案失败")
}

export async function activateMyCertificate(id: number) {
  return request<{ id: number }>(`/api/sign/certificates/${id}/activate`, {
    method: "PATCH",
  })
}

export async function deleteMyCertificate(id: number) {
  return request<SignAsset>(`/api/sign/certificates/${id}`, {
    method: "DELETE",
  })
}

export async function createMyProfile(formData: FormData) {
  const token = getToken()
  const response = await fetch("/api/sign/profiles", {
    method: "POST",
    headers: {
      "X-Token": token,
    },
    body: formData,
    cache: "no-store",
  })

  return parseFetchResponse<SignAsset>(response, "上传描述文件失败")
}

export async function activateMyProfile(id: number) {
  return request<{ id: number }>(`/api/sign/profiles/${id}/activate`, {
    method: "PATCH",
  })
}

export async function updateMyProfile(id: number, payload: { name: string; note?: string }) {
  return request<{ id: number }>(`/api/sign/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteMyProfile(id: number) {
  return request<SignAsset>(`/api/sign/profiles/${id}`, {
    method: "DELETE",
  })
}

export async function createSignTask(formData: FormData) {
  const token = getToken()
  const response = await fetch("/api/sign/tasks", {
    method: "POST",
    headers: {
      "X-Token": token,
    },
    body: formData,
    cache: "no-store",
  })

  return parseFetchResponse<SignTask>(response, "创建签名任务失败")
}

export function useSignDevices() {
  return useSWR("sign-devices", fetchSignDevices, {
    revalidateOnFocus: false,
  })
}

export function useSignTasks() {
  return useSWR("sign-tasks", fetchSignTasks, {
    refreshInterval: 30_000,
    dedupingInterval: 8_000,
    revalidateOnFocus: false,
  })
}

export function useSignTask(taskId: number | null) {
  return useSWR(taskId ? `sign-task-${taskId}` : null, () => fetchSignTask(taskId as number), {
    refreshInterval: (current) => {
      if (!current) return 8_000
      return current.status === "completed" || current.status === "failed" ? 0 : 8_000
    },
    dedupingInterval: 5_000,
    revalidateOnFocus: false,
  })
}

export function useSignConfig() {
  return useSWR("sign-config", fetchSignConfig, {
    revalidateOnFocus: false,
  })
}

export function useMyCertificates() {
  return useSWR("sign-my-certificates", fetchMyCertificates, {
    revalidateOnFocus: false,
  })
}

export function useMyProfiles() {
  return useSWR("sign-my-profiles", fetchMyProfiles, {
    revalidateOnFocus: false,
  })
}
