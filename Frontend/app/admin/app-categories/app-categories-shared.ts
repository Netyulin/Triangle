export type CategoryForm = { name: string }
export type DragState = { type: "app" | "post"; name: string } | null

export const initialForm: CategoryForm = { name: "" }
export const inputClass = "admin-input"
