import { AdminAuthGuard } from "@/components/admin/admin-auth-guard"
import { ToastContainer } from "@/components/admin/toast"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      {children}
      <ToastContainer />
      <ConfirmDialog />
    </AdminAuthGuard>
  )
}
