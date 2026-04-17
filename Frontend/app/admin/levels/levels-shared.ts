export type LevelForm = {
  name: string
  key: string
  dailyDownloadLimit: number
  publicCertLimit: number
  rechargePrice: number
  rechargeBonusPercent: number
  color: string
  isActive: boolean
}

export const defaultForm: LevelForm = {
  name: "",
  key: "",
  dailyDownloadLimit: 10,
  publicCertLimit: 3,
  rechargePrice: 0,
  rechargeBonusPercent: 0,
  color: "#3B82F6",
  isActive: true,
}

export const colorOptions = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#84CC16",
]
