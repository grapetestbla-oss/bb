import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getCurrentSeason } from '@/lib/standings'
import { APPLICATION_STATUS, formatDateTime } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { ApplicationForm } from '@/components/application-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Заявка в лигу' }

export default async function ApplyPage() {
  const user = await getCurrentUser()
  const season = await getCurrentSeason()

  const [application, entry, teams] = user
    ? await Promise.all([
        db.application.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
        season ? db.seasonEntry.findFirst({ where: { userId: user.id, seasonId: season.id }, include: { team: true } }) : null,
        season ? db.team.findMany({ where: { seasonId: season.id }, orderBy: { order: 'asc' } }) : [],
      ])
    : [null, null, []]

  return (
    <div>
      <PageHeader
        eyebrow={season?.name ?? 'F1 Icons League'}
        title="Заявка в лигу"
        subtitle="Заполните анкету пилота. Администрация рассмотрит её и определит вас в команду — статус заявки будет виден в личном кабинете."
      >
        {season && (
          <Badge variant={season.applicationsOpen ? 'default' : 'secondary'}>
            {season.applicationsOpen ? 'Приём заявок открыт' : 'Приём заявок закрыт'}
          </Badge>
        )}
      </PageHeader>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {!user ? (
          <div className="surface p-8 text-center">
            <h2 className="text-lg font-bold">Нужен аккаунт пилота</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Чтобы подать заявку, войдите в аккаунт или зарегистрируйтесь — это займёт минуту.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild><Link href="/register">Регистрация</Link></Button>
              <Button asChild variant="outline"><Link href="/login">Войти</Link></Button>
            </div>
          </div>
        ) : entry ? (
          <div className="surface p-8 text-center">
            <Badge className="mb-3">Вы уже в составе</Badge>
            <h2 className="text-lg font-bold">
              Вы участник сезона{season ? ` «${season.name}»` : ''}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Команда: {entry.team?.name ?? 'пока не назначена'}
              {entry.number ? ` · номер #${entry.number}` : ''}
            </p>
            <Button asChild className="mt-6"><Link href="/cabinet">В личный кабинет</Link></Button>
          </div>
        ) : application && application.status === 'PENDING' ? (
          <div className="surface p-8 text-center">
            <Badge variant="secondary" className="mb-3">{APPLICATION_STATUS[application.status]}</Badge>
            <h2 className="text-lg font-bold">Заявка отправлена</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Подана {formatDateTime(application.createdAt)}. Мы сообщим о решении — следите за статусом в личном кабинете.
            </p>
            <Button asChild className="mt-6" variant="outline"><Link href="/cabinet">Статус заявки</Link></Button>
          </div>
        ) : season && !season.applicationsOpen ? (
          <div className="surface p-8 text-center">
            <h2 className="text-lg font-bold">Приём заявок закрыт</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Набор в сезон «{season.name}» временно приостановлен. Следите за новостями лиги — набор откроется перед следующим сезоном.
            </p>
            <Button asChild className="mt-6" variant="outline"><Link href="/news">К новостям</Link></Button>
          </div>
        ) : (
          <>
            {application?.status === 'REJECTED' && (
              <div className="surface mb-6 border-destructive/40 p-5">
                <div className="text-sm font-semibold text-destructive">Предыдущая заявка отклонена</div>
                {application.adminComment && (
                  <p className="mt-1 text-sm text-muted-foreground">Комментарий: {application.adminComment}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">Вы можете подать новую заявку с учётом замечаний.</p>
              </div>
            )}
            <div className="surface p-6">
              <ApplicationForm
                seasonId={season?.id ?? null}
                seasonName={season?.name ?? null}
                teams={teams.map((t) => ({ id: t.id, name: t.name }))}
                defaults={{ gameNick: user.gameNick ?? '', platform: user.platform ?? '' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
