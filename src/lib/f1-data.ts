export type TrackSeed = {
  slug: string
  name: string
  country: string
  flag: string
  pack: 'f125' | 's2026' | 'classic'
  round: number
  laps: number
  lengthKm: number
}

/** Трассы, доступные в F1 25 (сезон 2025) */
export const F1_25_TRACKS: TrackSeed[] = [
  { slug: 'bahrain', name: 'Bahrain International Circuit', country: 'Бахрейн', flag: '🇧🇭', pack: 'f125', round: 1, laps: 57, lengthKm: 5.412 },
  { slug: 'jeddah', name: 'Jeddah Corniche Circuit', country: 'Саудовская Аравия', flag: '🇸🇦', pack: 'f125', round: 2, laps: 50, lengthKm: 6.174 },
  { slug: 'melbourne', name: 'Albert Park Circuit', country: 'Австралия', flag: '🇦🇺', pack: 'f125', round: 3, laps: 58, lengthKm: 5.278 },
  { slug: 'suzuka', name: 'Suzuka International Racing Course', country: 'Япония', flag: '🇯🇵', pack: 'f125', round: 4, laps: 53, lengthKm: 5.807 },
  { slug: 'shanghai', name: 'Shanghai International Circuit', country: 'Китай', flag: '🇨🇳', pack: 'f125', round: 5, laps: 56, lengthKm: 5.451 },
  { slug: 'miami', name: 'Miami International Autodrome', country: 'США', flag: '🇺🇸', pack: 'f125', round: 6, laps: 57, lengthKm: 5.412 },
  { slug: 'imola', name: 'Autodromo Enzo e Dino Ferrari', country: 'Италия', flag: '🇮🇹', pack: 'f125', round: 7, laps: 63, lengthKm: 4.909 },
  { slug: 'monaco', name: 'Circuit de Monaco', country: 'Монако', flag: '🇲🇨', pack: 'f125', round: 8, laps: 78, lengthKm: 3.337 },
  { slug: 'barcelona', name: 'Circuit de Barcelona-Catalunya', country: 'Испания', flag: '🇪🇸', pack: 'f125', round: 9, laps: 66, lengthKm: 4.657 },
  { slug: 'montreal', name: 'Circuit Gilles-Villeneuve', country: 'Канада', flag: '🇨🇦', pack: 'f125', round: 10, laps: 70, lengthKm: 4.361 },
  { slug: 'red-bull-ring', name: 'Red Bull Ring', country: 'Австрия', flag: '🇦🇹', pack: 'f125', round: 11, laps: 71, lengthKm: 4.318 },
  { slug: 'silverstone', name: 'Silverstone Circuit', country: 'Великобритания', flag: '🇬🇧', pack: 'f125', round: 12, laps: 52, lengthKm: 5.891 },
  { slug: 'spa', name: 'Circuit de Spa-Francorchamps', country: 'Бельгия', flag: '🇧🇪', pack: 'f125', round: 13, laps: 44, lengthKm: 7.004 },
  { slug: 'hungaroring', name: 'Hungaroring', country: 'Венгрия', flag: '🇭🇺', pack: 'f125', round: 14, laps: 70, lengthKm: 4.381 },
  { slug: 'zandvoort', name: 'Circuit Zandvoort', country: 'Нидерланды', flag: '🇳🇱', pack: 'f125', round: 15, laps: 72, lengthKm: 4.259 },
  { slug: 'monza', name: 'Autodromo Nazionale Monza', country: 'Италия', flag: '🇮🇹', pack: 'f125', round: 16, laps: 53, lengthKm: 5.793 },
  { slug: 'baku', name: 'Baku City Circuit', country: 'Азербайджан', flag: '🇦🇿', pack: 'f125', round: 17, laps: 51, lengthKm: 6.003 },
  { slug: 'singapore', name: 'Marina Bay Street Circuit', country: 'Сингапур', flag: '🇸🇬', pack: 'f125', round: 18, laps: 62, lengthKm: 4.940 },
  { slug: 'cota', name: 'Circuit of the Americas', country: 'США', flag: '🇺🇸', pack: 'f125', round: 19, laps: 56, lengthKm: 5.513 },
  { slug: 'mexico', name: 'Autódromo Hermanos Rodríguez', country: 'Мексика', flag: '🇲🇽', pack: 'f125', round: 20, laps: 71, lengthKm: 4.304 },
  { slug: 'interlagos', name: 'Autódromo José Carlos Pace', country: 'Бразилия', flag: '🇧🇷', pack: 'f125', round: 21, laps: 71, lengthKm: 4.309 },
  { slug: 'las-vegas', name: 'Las Vegas Strip Circuit', country: 'США', flag: '🇺🇸', pack: 'f125', round: 22, laps: 50, lengthKm: 6.201 },
  { slug: 'lusail', name: 'Lusail International Circuit', country: 'Катар', flag: '🇶🇦', pack: 'f125', round: 23, laps: 57, lengthKm: 5.419 },
  { slug: 'yas-marina', name: 'Yas Marina Circuit', country: 'ОАЭ', flag: '🇦🇪', pack: 'f125', round: 24, laps: 58, lengthKm: 5.281 },
  { slug: 'portimao', name: 'Autódromo Internacional do Algarve', country: 'Португалия', flag: '🇵🇹', pack: 'classic', round: 25, laps: 66, lengthKm: 4.653 },
  { slug: 'paul-ricard', name: 'Circuit Paul Ricard', country: 'Франция', flag: '🇫🇷', pack: 'classic', round: 26, laps: 53, lengthKm: 5.842 },
]

/** Трассы 2026 Season Pack */
export const S2026_TRACKS: TrackSeed[] = [
  { slug: 'madrid-2026', name: 'Madring (Madrid)', country: 'Испания', flag: '🇪🇸', pack: 's2026', round: 1, laps: 57, lengthKm: 5.474 },
  { slug: 'bahrain-2026', name: 'Bahrain International Circuit (2026)', country: 'Бахрейн', flag: '🇧🇭', pack: 's2026', round: 2, laps: 57, lengthKm: 5.412 },
  { slug: 'monaco-2026', name: 'Circuit de Monaco (2026)', country: 'Монако', flag: '🇲🇨', pack: 's2026', round: 3, laps: 78, lengthKm: 3.337 },
  { slug: 'monza-2026', name: 'Autodromo Nazionale Monza (2026)', country: 'Италия', flag: '🇮🇹', pack: 's2026', round: 4, laps: 53, lengthKm: 5.793 },
  { slug: 'spa-2026', name: 'Circuit de Spa-Francorchamps (2026)', country: 'Бельгия', flag: '🇧🇪', pack: 's2026', round: 5, laps: 44, lengthKm: 7.004 },
  { slug: 'suzuka-2026', name: 'Suzuka Circuit (2026)', country: 'Япония', flag: '🇯🇵', pack: 's2026', round: 6, laps: 53, lengthKm: 5.807 },
  { slug: 'silverstone-2026', name: 'Silverstone Circuit (2026)', country: 'Великобритания', flag: '🇬🇧', pack: 's2026', round: 7, laps: 52, lengthKm: 5.891 },
  { slug: 'interlagos-2026', name: 'Interlagos (2026)', country: 'Бразилия', flag: '🇧🇷', pack: 's2026', round: 8, laps: 71, lengthKm: 4.309 },
]

export const ALL_TRACKS = [...F1_25_TRACKS, ...S2026_TRACKS]

/// Условия внутри одного сетапа. Квалификация и гонка не разделяются —
/// настройки под них почти совпадают, а тайм-триал лежит в открытом доступе.
export const CONDITIONS = [
  { value: 'dry', label: 'Сухо', hint: 'Квалификация и гонка' },
  { value: 'wet', label: 'Дождь', hint: 'Дождь и смешанные условия' },
] as const

export type Condition = (typeof CONDITIONS)[number]['value']

export const PACKS = [
  { value: 'f125', label: 'F1 25' },
  { value: 's2026', label: '2026 Season Pack' },
] as const

export const PLATFORMS = [
  { value: 'pc', label: 'PC' },
  { value: 'ps', label: 'PlayStation' },
  { value: 'xbox', label: 'Xbox' },
] as const

export const DEVICES = [
  { value: 'wheel', label: 'Руль' },
  { value: 'gamepad', label: 'Геймпад' },
  { value: 'keyboard', label: 'Клавиатура' },
] as const

export const CONTACT_TYPES = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
] as const

export type SetupData = {
  frontWing: number
  rearWing: number
  diffOnThrottle: number
  diffOffThrottle: number
  engineBraking: number
  frontCamber: number
  rearCamber: number
  frontToe: number
  rearToe: number
  frontSuspension: number
  rearSuspension: number
  frontAntiRoll: number
  rearAntiRoll: number
  frontRideHeight: number
  rearRideHeight: number
  brakePressure: number
  brakeBias: number
  frontRightTyre: number
  frontLeftTyre: number
  rearRightTyre: number
  rearLeftTyre: number
}

export const SETUP_FIELDS: { key: keyof SetupData; label: string; group: string; unit?: string; step?: number }[] = [
  { key: 'frontWing', label: 'Переднее антикрыло', group: 'Аэродинамика' },
  { key: 'rearWing', label: 'Заднее антикрыло', group: 'Аэродинамика' },
  { key: 'diffOnThrottle', label: 'Дифференциал под тягой', group: 'Трансмиссия', unit: '%' },
  { key: 'diffOffThrottle', label: 'Дифференциал без тяги', group: 'Трансмиссия', unit: '%' },
  { key: 'engineBraking', label: 'Торможение двигателем', group: 'Трансмиссия', unit: '%' },
  { key: 'frontCamber', label: 'Развал передних', group: 'Геометрия подвески', unit: '°', step: 0.1 },
  { key: 'rearCamber', label: 'Развал задних', group: 'Геометрия подвески', unit: '°', step: 0.1 },
  { key: 'frontToe', label: 'Схождение передних', group: 'Геометрия подвески', unit: '°', step: 0.01 },
  { key: 'rearToe', label: 'Схождение задних', group: 'Геометрия подвески', unit: '°', step: 0.01 },
  { key: 'frontSuspension', label: 'Передняя подвеска', group: 'Подвеска' },
  { key: 'rearSuspension', label: 'Задняя подвеска', group: 'Подвеска' },
  { key: 'frontAntiRoll', label: 'Передний стабилизатор', group: 'Подвеска' },
  { key: 'rearAntiRoll', label: 'Задний стабилизатор', group: 'Подвеска' },
  { key: 'frontRideHeight', label: 'Клиренс спереди', group: 'Подвеска' },
  { key: 'rearRideHeight', label: 'Клиренс сзади', group: 'Подвеска' },
  { key: 'brakePressure', label: 'Давление тормозов', group: 'Тормоза', unit: '%' },
  { key: 'brakeBias', label: 'Баланс тормозов', group: 'Тормоза', unit: '%' },
  { key: 'frontRightTyre', label: 'Переднее правое', group: 'Давление шин', unit: 'psi', step: 0.1 },
  { key: 'frontLeftTyre', label: 'Переднее левое', group: 'Давление шин', unit: 'psi', step: 0.1 },
  { key: 'rearRightTyre', label: 'Заднее правое', group: 'Давление шин', unit: 'psi', step: 0.1 },
  { key: 'rearLeftTyre', label: 'Заднее левое', group: 'Давление шин', unit: 'psi', step: 0.1 },
]

export const EMPTY_SETUP: SetupData = {
  frontWing: 25,
  rearWing: 25,
  diffOnThrottle: 60,
  diffOffThrottle: 50,
  engineBraking: 50,
  frontCamber: -2.8,
  rearCamber: -1.5,
  frontToe: 0.05,
  rearToe: 0.2,
  frontSuspension: 20,
  rearSuspension: 10,
  frontAntiRoll: 10,
  rearAntiRoll: 8,
  frontRideHeight: 25,
  rearRideHeight: 60,
  brakePressure: 98,
  brakeBias: 57,
  frontRightTyre: 25.5,
  frontLeftTyre: 25.5,
  rearRightTyre: 23.5,
  rearLeftTyre: 23.5,
}

export const conditionLabel = (value: string) =>
  CONDITIONS.find((c) => c.value === value)?.label ?? value

export const GAMES = [
  { value: 'f125', label: 'F1 25' },
  { value: 's2026', label: '2026 Season Pack' },
  { value: 'all', label: 'F1 25 + 2026' },
] as const

export const gameLabel = (value: string) =>
  GAMES.find((g) => g.value === value)?.label ?? packLabel(value)
export const packLabel = (value: string) =>
  PACKS.find((p) => p.value === value)?.label ?? (value === 'classic' ? 'Классика' : value)
export const platformLabel = (value: string) =>
  PLATFORMS.find((p) => p.value === value)?.label ?? value
export const deviceLabel = (value: string) =>
  DEVICES.find((d) => d.value === value)?.label ?? value
