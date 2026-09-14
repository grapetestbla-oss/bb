import { redirect } from 'next/navigation'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { ROLE_LABEL } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { AdminPanel } from '@/components/admin/admin-panel'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Админ-панель' }

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!isAdmin(user)) redirect('/cabinet')

  return (
    <div>
      <PageHeader
        eyebrow="Управление лигой"
        title="Админ-панель"
        subtitle="Заявки, сезоны, команды, пилоты, календарь, результаты, новости и права доступа."
      >
        <Badge variant="outline" className="border-primary/40 text-primary">
          {ROLE_LABEL[user.role]} · {user.displayName}
        </Badge>
      </PageHeader>

      <AdminPanel currentUser={user} />
    </div>
  )
}
