const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
const dateShortFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d))
export const formatDateShort = (d: Date | string) => dateShortFmt.format(new Date(d))
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d))
export const formatDateTime = (d: Date | string) => `${dateFmt.format(new Date(d))}, ${timeFmt.format(new Date(d))}`

/** Значение для <input type="datetime-local"> в локальном времени. */
export function toDateTimeLocal(d: Date | string) {
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const SEASON_STATUS: Record<string, string> = {
  UPCOMING: 'Анонсирован',
  ACTIVE: 'Идёт',
  FINISHED: 'Завершён',
}

export const RACE_STATUS: Record<string, string> = {
  SCHEDULED: 'Запланирован',
  LIVE: 'Идёт сейчас',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

export const ENTRY_STATUS: Record<string, string> = {
  ACTIVE: 'Основной состав',
  RESERVE: 'Резерв',
  INACTIVE: 'Не выступает',
}

export const APPLICATION_STATUS: Record<string, string> = {
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

export const ROLE_LABEL: Record<string, string> = {
  USER: 'Участник',
  ADMIN: 'Администратор',
  SUPERADMIN: 'Главный администратор',
}

export function positionClass(position: number) {
  if (position === 1) return 'pos-badge pos-1'
  if (position === 2) return 'pos-badge pos-2'
  if (position === 3) return 'pos-badge pos-3'
  return 'pos-badge pos-default'
}

/** «через 3 дня» / «завтра» для карточек календаря. */
export function relativeDays(date: Date | string) {
  const target = new Date(date)
  const diffMs = target.getTime() - Date.now()
  const days = Math.round(diffMs / 86_400_000)
  if (diffMs < 0) return null
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  if (days < 5) return `через ${days} дня`
  return `через ${days} дней`
}
