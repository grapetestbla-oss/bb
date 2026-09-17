/** Ссылки на соцсети. Файл без серверных зависимостей — можно импортировать в клиенте. */
export type SocialLinks = {
  telegram: string
  youtube: string
  twitch: string
  kick: string
  tiktok: string
  discord: string
}

export const DEFAULT_SOCIALS: SocialLinks = {
  telegram: 'https://t.me/simraceboy',
  youtube: 'https://www.youtube.com/@fantastiqueboy',
  twitch: 'https://www.twitch.tv/fantastiqueboy',
  kick: 'https://kick.com/nefantastiqueboy',
  tiktok: 'https://www.tiktok.com/@_simraceboy_',
  discord: '',
}

export const SOCIAL_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: 'telegram', label: 'Telegram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'kick', label: 'Kick' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'discord', label: 'Discord' },
]
