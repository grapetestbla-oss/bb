import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = { title: 'Панель управления — FANTASTIQUEBOY SETUPS' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/profile')
  return <AdminPanel user={user} />
}
