"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, FileBadge2, Loader2, Lock, Shield, Smartphone, UploadCloud } from "lucide-react"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  activateMyCertificate,
  activateMyProfile,
  createMySigningBundle,
  createUdidSession,
  deleteMyCertificate,
  deleteMyProfile,
  updateMyProfile,
  useMyCertificates,
  useMyProfiles,
  useSignConfig,
  useSignDevices,
  useSignTask,
  useSignTasks,
  type SignAsset,
  type SignDevice,
  type SignTask,
} from "@/lib/sign-api"
import { getToken } from "@/lib/api"

function shortUdid(udid?: string | null) {
  if (!udid) return ""
  if (udid.length <= 16) return udid
  return `${udid.slice(0, 8)}...${udid.slice(-8)}`
}

function taskStatusText(status?: string | null) {
  switch (status) {
    case "completed":
      return "签名完成"
    case "failed":
      return "签名失败"
    case "running":
      return "正在签名"
    case "queued":
      return "排队等待"
    default:
      return status || "未知状态"
  }
}

function assetLabel(asset: SignAsset) {
  return `${asset.name} · ${asset.scope === "user" ? "自备" : "系统"}`
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes < 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function EmptyHint({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">{text}</p>
}

function StepCard({
  index,
  title,
  description,
  ready,
  action,
  children,
}: {
  index: number
  title: string
  description: string
  ready: boolean
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-border bg-background p-5 transition-colors hover:border-border/80">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index}
            </span>
            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                {title}
                {ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
              </p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function AssetItem({
  item,
  activeText,
  note,
  onActivate,
  onEdit,
  onDelete,
}: {
  item: SignAsset
  activeText: string
  note?: string
  onActivate: () => Promise<void>
  onEdit?: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  return (
    <div className="rounded-2xl border border-border px-4 py-4 transition-colors hover:border-primary/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.fileName}
            {note ? ` · ${note}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.isActive ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{activeText}</span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void onActivate()}>
              设为当前使用
            </Button>
          )}
          {onEdit ? (
            <Button size="sm" variant="outline" onClick={() => void onEdit()}>
              编辑
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => void onDelete()}>
            删除
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AppSigningCard() {
  const searchParams = useSearchParams()
  const { data: devices, isLoading: devicesLoading } = useSignDevices()
  const { data: signConfig } = useSignConfig()
  const { data: tasks, isLoading: tasksLoading } = useSignTasks()
  const { data: myCertificates } = useMyCertificates()
  const { data: myProfiles } = useMyProfiles()
  const latestTaskId = tasks?.[0]?.id ?? null
  const { data: latestTask } = useSignTask(latestTaskId)

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [selectedCertificateId, setSelectedCertificateId] = useState<number | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [udidPending, setUdidPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ipaUploadStatus, setIpaUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [ipaUploadProgress, setIpaUploadProgress] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [bundleForm, setBundleForm] = useState({
    name: "",
    password: "",
    note: "",
    certificateFile: null as File | null,
    profileFile: null as File | null,
  })

  const taskSectionRef = useRef<HTMLDivElement | null>(null)
  const ipaInputRef = useRef<HTMLInputElement | null>(null)
  const certInputRef = useRef<HTMLInputElement | null>(null)
  const profileInputRef = useRef<HTMLInputElement | null>(null)

  const canSign = signConfig?.permissions?.canSign ?? false
  const canSelfSign = signConfig?.permissions?.canSelfSign ?? false
  const hasDevice = Boolean(devices?.length)
  const hasSelectedAssets = Boolean(selectedCertificateId && selectedProfileId)
  const selectedDevice = useMemo(() => devices?.find((item) => item.id === selectedDeviceId) ?? null, [devices, selectedDeviceId])
  const selectedCertObj = signConfig?.availableCertificates?.find((item) => item.id === selectedCertificateId) ?? null
  const selectedProfileObj = signConfig?.availableProfiles?.find((item) => item.id === selectedProfileId) ?? null
  const currentTask = latestTask || tasks?.[0] || null
  const recentTasks = tasks?.slice(0, 5) ?? []
  const latestCompletedTask = currentTask?.status === "completed" ? currentTask : null

  useEffect(() => {
    if (!devices?.length) return
    if (selectedDeviceId === null || !devices.some((item) => item.id === selectedDeviceId)) {
      setSelectedDeviceId(devices[0].id)
    }
  }, [devices, selectedDeviceId])

  useEffect(() => {
    const available = signConfig?.availableCertificates ?? []
    if (!available.length) return
    if (selectedCertificateId === null || !available.some((item) => item.id === selectedCertificateId)) {
      setSelectedCertificateId(signConfig?.activeCertificate?.id ?? available[0].id)
    }
  }, [signConfig, selectedCertificateId])

  useEffect(() => {
    const available = signConfig?.availableProfiles ?? []
    if (!available.length) return
    if (selectedProfileId === null || !available.some((item) => item.id === selectedProfileId)) {
      setSelectedProfileId(signConfig?.activeProfile?.id ?? available[0].id)
    }
  }, [signConfig, selectedProfileId])

  useEffect(() => {
    const signStatus = searchParams.get("signStatus")
    if (!signStatus) return

    if (signStatus === "udid-success") {
      setMessage("设备绑定成功，可以继续选择证书并上传 IPA。")
      setError("")
      setUdidPending(false)
      void mutate("sign-devices")
      return
    }

    if (signStatus === "udid-expired") {
      setError("本次获取 UDID 的会话已过期，请重新下载描述文件。")
      setMessage("")
      setUdidPending(false)
      return
    }

    if (signStatus === "udid-failed") {
      setError(searchParams.get("signMessage") || "描述文件安装失败，请重新获取 UDID。")
      setMessage("")
      setUdidPending(false)
    }
  }, [searchParams])

  const handleGetUdid = async () => {
    setError("")
    setMessage("")
    setUdidPending(true)
    try {
      const payload = await createUdidSession()
      window.location.href = payload.installUrl
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "获取 UDID 失败")
      setUdidPending(false)
    }
  }

  const handleSubmitTask = useCallback(async () => {
    if (!canSign) {
      setError("当前账号没有签名权限。")
      return
    }
    if (!hasDevice || selectedDeviceId === null) {
      setError("请先完成设备绑定。")
      return
    }
    if (!hasSelectedAssets || selectedCertificateId === null || selectedProfileId === null) {
      setError("请先选择证书和描述文件。")
      return
    }
    if (!selectedFile) {
      setError("请先选择 IPA 文件。")
      return
    }
    if (submitting) {
      return
    }

    setSubmitting(true)
    setError("")
    setMessage("")
    setIpaUploadStatus("uploading")
    setIpaUploadProgress(0)

    const formData = new FormData()
    formData.append("deviceId", String(selectedDeviceId))
    formData.append("certificateId", String(selectedCertificateId))
    formData.append("profileId", String(selectedProfileId))
    formData.append("ipa", selectedFile)

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setIpaUploadProgress(Math.round((event.loaded / event.total) * 100))
          }
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
            return
          }
          try {
            const payload = JSON.parse(xhr.responseText)
            reject(new Error(payload.message || "创建签名任务失败"))
          } catch {
            reject(new Error("创建签名任务失败"))
          }
        })
        xhr.addEventListener("error", () => reject(new Error("网络连接异常，请稍后再试。")))
        xhr.addEventListener("timeout", () => reject(new Error("上传超时，请重试。")))
        xhr.open("POST", "/api/sign/tasks")
        const token = getToken()
        if (token) {
          xhr.setRequestHeader("X-Token", token)
        }
        xhr.timeout = 180000
        xhr.send(formData)
      })

      setIpaUploadStatus("done")
      setIpaUploadProgress(100)
      setMessage("签名任务已提交，系统正在处理。生成的安装链接和下载链接会保留 24 小时。")
      await Promise.all([mutate("sign-tasks"), mutate("sign-config")])
      setSelectedFile(null)
      if (ipaInputRef.current) {
        ipaInputRef.current.value = ""
      }
      window.setTimeout(() => {
        taskSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 300)
    } catch (nextError) {
      setIpaUploadStatus("error")
      setError(nextError instanceof Error ? nextError.message : "签名任务提交失败")
    } finally {
      window.setTimeout(() => {
        setSubmitting(false)
        setIpaUploadStatus("idle")
        setIpaUploadProgress(0)
      }, 1200)
    }
  }, [canSign, hasDevice, hasSelectedAssets, selectedCertificateId, selectedDeviceId, selectedFile, selectedProfileId, submitting])

  const handleUploadBundle = async () => {
    if (!canSelfSign) {
      setError("当前账号还没有自备证书权限。")
      return
    }

    if (!bundleForm.name.trim() || !bundleForm.password.trim() || !bundleForm.certificateFile || !bundleForm.profileFile) {
      setError("请完整填写方案名称、证书密码，并上传证书与描述文件。")
      return
    }

    const formData = new FormData()
    formData.append("name", bundleForm.name.trim())
    formData.append("password", bundleForm.password.trim())
    formData.append("note", bundleForm.note.trim())
    formData.append("isActive", "true")
    formData.append("certificate", bundleForm.certificateFile)
    formData.append("profile", bundleForm.profileFile)

    try {
      const result = await createMySigningBundle(formData)
      await Promise.all([mutate("sign-my-certificates"), mutate("sign-my-profiles"), mutate("sign-config")])
      setSelectedCertificateId(result.certificate.id)
      setSelectedProfileId(result.profile.id)
      setMessage(`自备签名方案上传成功，团队标识：${result.validation.certificateTeamId}。`)
      setError("")
      setBundleForm({
        name: "",
        password: "",
        note: "",
        certificateFile: null,
        profileFile: null,
      })
      if (certInputRef.current) certInputRef.current.value = ""
      if (profileInputRef.current) profileInputRef.current.value = ""
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "签名方案上传失败")
    }
  }

  const handleProfileEdit = async (item: SignAsset) => {
    const nextName = window.prompt("请输入新的描述文件名称", item.name)
    if (!nextName?.trim()) return
    const nextNote = window.prompt("请输入备注（可留空）", item.note || "") ?? ""
    await updateMyProfile(item.id, { name: nextName.trim(), note: nextNote.trim() })
    await Promise.all([mutate("sign-my-profiles"), mutate("sign-config")])
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-primary" />
              IPA 应用签名
            </CardTitle>
            <CardDescription>
              按顺序完成设备绑定、选择签名方案、上传 IPA 三步。签名产物默认保留 24 小时，之后系统会自动清理。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <StepCard
              index={1}
              title="获取并绑定 UDID"
              description="请在 iPhone 或 iPad 上安装描述文件，回跳后系统会自动记录当前设备。"
              ready={hasDevice}
              action={
                <Button onClick={handleGetUdid} disabled={udidPending}>
                  {udidPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在跳转
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      获取 UDID
                    </>
                  )}
                </Button>
              }
            >
              {devicesLoading ? (
                <EmptyHint text="正在读取已绑定设备…" />
              ) : hasDevice ? (
                <div className="space-y-3">
                  <label htmlFor="device-select" className="text-sm font-medium text-foreground">选择签名设备</label>
                  <select
                    id="device-select"
                    value={selectedDeviceId ?? ""}
                    onChange={(event) => setSelectedDeviceId(Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {devices?.map((device: SignDevice) => (
                      <option key={device.id} value={device.id}>
                        {(device.deviceName || "未命名设备") + " · " + (device.product || "未知型号") + " · " + shortUdid(device.udid)}
                      </option>
                    ))}
                  </select>
                  {selectedDevice ? (
                    <p className="text-sm text-muted-foreground">
                      当前设备：{selectedDevice.deviceName || "未命名设备"} · {selectedDevice.product || "未知型号"} · iOS {selectedDevice.version || "未知版本"}
                    </p>
                  ) : null}
                </div>
              ) : (
                <EmptyHint text="还没有绑定设备。请先点击上方按钮下载 mobileconfig 描述文件，完成后才能进入下一步。" />
              )}
            </StepCard>

            <StepCard
              index={2}
              title="选择证书与描述文件"
              description="证书与描述文件会成对使用；如果你上传了自备方案，也会出现在下拉列表里。"
              ready={hasSelectedAssets}
              action={
                canSign ? (
                  <span className="text-xs text-muted-foreground">{hasSelectedAssets ? "已选择签名方案" : "请选择签名方案"}</span>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground/40" />
                )
              }
            >
              {canSign ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cert-select" className="text-sm font-medium text-foreground">证书</label>
                    <select
                      id="cert-select"
                      value={selectedCertificateId ?? ""}
                      onChange={(event) => setSelectedCertificateId(Number(event.target.value))}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {(signConfig?.availableCertificates ?? []).map((asset) => (
                        <option key={asset.id} value={asset.id}>{assetLabel(asset)}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">{selectedCertObj?.fileName || "暂无可用证书"}</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="profile-select" className="text-sm font-medium text-foreground">描述文件</label>
                    <select
                      id="profile-select"
                      value={selectedProfileId ?? ""}
                      onChange={(event) => setSelectedProfileId(Number(event.target.value))}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {(signConfig?.availableProfiles ?? []).map((asset) => (
                        <option key={asset.id} value={asset.id}>{assetLabel(asset)}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">{selectedProfileObj?.fileName || "暂无可用描述文件"}</p>
                  </div>
                </div>
              ) : (
                <EmptyHint text="当前账号没有签名权限，请联系管理员开通。" />
              )}
            </StepCard>

            <StepCard
              index={3}
              title="上传 IPA 并开始签名"
              description="提交后系统会自动进入签名队列，完成后会提供安装链接和已签名 IPA 下载链接。"
              ready={currentTask?.status === "completed"}
              action={
                <Button onClick={() => void handleSubmitTask()} disabled={submitting || !hasDevice || !hasSelectedAssets || !selectedFile}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {ipaUploadStatus === "uploading" ? `上传中 ${ipaUploadProgress}%` : "处理中"}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      开始签名
                    </>
                  )}
                </Button>
              }
            >
              <div className="space-y-3">
                <div className={`relative overflow-hidden rounded-2xl border transition-colors ${selectedFile ? "border-primary/40 bg-primary/5" : "border-dashed border-border hover:border-primary/30"}`}>
                  <input
                    ref={ipaInputRef}
                    type="file"
                    accept=".ipa,application/octet-stream,application/zip"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    disabled={submitting}
                    className="block w-full cursor-pointer px-3 py-5 text-sm file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground disabled:opacity-50"
                  />

                  {(ipaUploadStatus === "uploading" || ipaUploadStatus === "done") ? (
                    <div className="mx-4 mb-3 space-y-1.5 rounded-xl border border-border bg-background px-3 py-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{ipaUploadStatus === "uploading" ? "正在上传…" : "上传完成"}</span>
                        <span className="font-mono font-semibold tabular-nums">{ipaUploadProgress}%</span>
                      </div>
                      <Progress value={ipaUploadProgress} className="h-2" />
                    </div>
                  ) : null}

                  {ipaUploadStatus === "error" ? (
                    <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>上传失败，请检查网络或重新选择 IPA。</span>
                    </div>
                  ) : null}
                </div>

                {selectedFile ? (
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate font-medium">{selectedFile.name}</span>
                    <span className="shrink-0 text-muted-foreground">（{formatFileSize(selectedFile.size)}）</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {!hasDevice ? "请先绑定设备。" : !hasSelectedAssets ? "请先选择证书与描述文件。" : "请选择需要签名的 IPA 文件。"}
                  </p>
                )}
              </div>
            </StepCard>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70">
          <CardHeader>
            <CardTitle>当前任务状态</CardTitle>
            <CardDescription>这里会显示最近一次签名任务的进度和结果。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">权限状态</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{canSign ? "可签名" : "未开通"}</span>
                {canSign ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                自备证书权限：<span className={canSelfSign ? "text-emerald-700" : ""}>{canSelfSign ? "已开通" : "未开通"}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">最新任务</p>
              <p className="mt-2 text-lg font-bold text-foreground">{currentTask ? taskStatusText(currentTask.status) : "暂无任务"}</p>
              {currentTask ? <Progress value={currentTask.progress ?? 0} className="mt-3 h-2" /> : null}
              <p className="mt-2 text-sm text-muted-foreground">{currentTask?.stage || "完成上方步骤后，这里会显示签名进度。"}</p>
              {latestCompletedTask ? (
                <div className="pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">链接保留到：{latestCompletedTask.expiresAt || "24 小时后自动清理"}</p>
                  <div className="flex flex-wrap gap-2">
                    {latestCompletedTask.installUrl ? (
                      <Button asChild size="sm">
                        <a href={latestCompletedTask.installUrl} target="_blank" rel="noreferrer">安装到设备</a>
                      </Button>
                    ) : null}
                    {latestCompletedTask.downloadUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={latestCompletedTask.downloadUrl} target="_blank" rel="noreferrer">下载签名包</a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBadge2 className="h-5 w-5 text-primary" />
              自备签名方案
            </CardTitle>
            <CardDescription>如果你希望把这里当成签名工具，可以上传自己的证书、密码和描述文件，系统会校验它们是否匹配。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {canSelfSign ? (
              <div className="grid gap-3 rounded-2xl border border-border bg-secondary/10 p-5 lg:grid-cols-2">
                <input
                  value={bundleForm.name}
                  onChange={(event) => setBundleForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="方案名称"
                  className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="password"
                  value={bundleForm.password}
                  onChange={(event) => setBundleForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="证书密码"
                  className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={bundleForm.note}
                  onChange={(event) => setBundleForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="备注（可选）"
                  className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 lg:col-span-2"
                />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">证书文件（.p12）</label>
                  <input
                    ref={certInputRef}
                    type="file"
                    accept=".p12,application/x-pkcs12"
                    onChange={(event) => setBundleForm((prev) => ({ ...prev, certificateFile: event.target.files?.[0] ?? null }))}
                    className="block w-full cursor-pointer rounded-2xl border border-dashed border-border bg-background px-3 py-3 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">描述文件（.mobileprovision）</label>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept=".mobileprovision"
                    onChange={(event) => setBundleForm((prev) => ({ ...prev, profileFile: event.target.files?.[0] ?? null }))}
                    className="block w-full cursor-pointer rounded-2xl border border-dashed border-border bg-background px-3 py-3 text-sm"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Button onClick={() => void handleUploadBundle()}>上传并启用方案</Button>
                </div>
              </div>
            ) : (
              <EmptyHint text="当前账号没有自备证书权限。如需把这里当成独立签名工具使用，请先让管理员开通。" />
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">我的证书</p>
                {myCertificates?.length ? (
                  myCertificates.map((item) => (
                    <AssetItem
                      key={item.id}
                      item={item}
                      activeText="当前启用"
                      onActivate={async () => {
                        await activateMyCertificate(item.id)
                        await Promise.all([mutate("sign-my-certificates"), mutate("sign-config")])
                      }}
                      onDelete={async () => {
                        await deleteMyCertificate(item.id)
                        await Promise.all([mutate("sign-my-certificates"), mutate("sign-config")])
                      }}
                    />
                  ))
                ) : (
                  <EmptyHint text="你还没有上传过自备证书。" />
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">我的描述文件</p>
                {myProfiles?.length ? (
                  myProfiles.map((item) => (
                    <AssetItem
                      key={item.id}
                      item={item}
                      activeText="当前启用"
                      note={item.note || undefined}
                      onActivate={async () => {
                        await activateMyProfile(item.id)
                        await Promise.all([mutate("sign-my-profiles"), mutate("sign-config")])
                      }}
                      onEdit={() => handleProfileEdit(item)}
                      onDelete={async () => {
                        await deleteMyProfile(item.id)
                        await Promise.all([mutate("sign-my-profiles"), mutate("sign-config")])
                      }}
                    />
                  ))
                ) : (
                  <EmptyHint text="你还没有上传过自备描述文件。" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section ref={taskSectionRef}>
        <Card className="rounded-3xl border-border/70">
          <CardHeader>
            <CardTitle>签名任务记录</CardTitle>
            <CardDescription>这里展示最近 5 条签名任务，方便你重新安装或下载已签名文件。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksLoading ? (
              <EmptyHint text="正在加载签名任务…" />
            ) : recentTasks.length ? (
              recentTasks.map((task: SignTask) => (
                <div key={task.id} className="rounded-2xl border border-border px-4 py-4 transition-colors hover:border-primary/30">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{task.ipaName || "未命名 IPA"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        #{task.id} · {taskStatusText(task.status)}
                        {task.stage ? ` · ${task.stage}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {task.status !== "completed" && task.status !== "failed" ? (
                        <Progress value={task.progress ?? 0} className="hidden h-1.5 w-24 md:block" />
                      ) : null}
                      {task.installUrl ? (
                        <Button asChild size="sm">
                          <a href={task.installUrl} target="_blank" rel="noreferrer">安装</a>
                        </Button>
                      ) : null}
                      {task.downloadUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={task.downloadUrl} target="_blank" rel="noreferrer">下载</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyHint text="暂无签名任务记录，完成上方步骤后即可创建。" />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
