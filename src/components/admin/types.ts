export type AdminTrack = {
  id: string
  slug: string
  name: string
  country: string
  flag: string
  pack: string
  round: number
  _count?: { setups: number }
}

export type AdminPilot = {
  id: string
  slug: string
  name: string
  title: string
  bio: string
  contact: string | null
  order: number
  active: boolean
  _count?: { setups: number; packs: number }
}

export type AdminSetupVariant = {
  id: string
  condition: string
  title: string
  notes: string
  data: string | null
  order: number
}

export type AdminSetup = {
  id: string
  trackId: string
  pilotId: string
  title: string
  pack: string
  price: number
  oldPrice: number | null
  description: string
  previewData: string
  sales: number
  featured: boolean
  active: boolean
  track: AdminTrack
  pilot: AdminPilot
  variants: AdminSetupVariant[]
}

export type AdminPack = {
  id: string
  slug: string
  title: string
  description: string
  pilotId: string
  game: string
  price: number
  oldPrice: number | null
  sales: number
  featured: boolean
  active: boolean
  order: number
  pilot: AdminPilot
  setups: { setupId: string; setup?: AdminSetup }[]
}

export type AdminOrder = {
  id: string
  kind: string
  amount: number
  status: string
  provider: string | null
  createdAt: string
  user: { login: string; email: string; contact: string | null }
  setup: { title: string; track: { name: string; flag: string } } | null
  packSet: { title: string } | null
  plan: { title: string } | null
  training: { status: string } | null
}

export type AdminTraining = {
  id: string
  contactType: string
  contact: string
  platform: string
  device: string
  level: string
  comment: string
  status: string
  createdAt: string
  takenBy: { login: string } | null
  user: { login: string; email: string }
  order: { amount: number; status: string; plan: { title: string } | null }
}

export type AdminUser = {
  id: string
  login: string
  email: string
  role: string
  contact: string | null
  createdAt: string
  _count: { orders: number; trainingRequests: number }
}

export type AdminNotification = {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  link: string | null
  createdAt: string
}

export type PaymentsForm = {
  freekassa: { enabled: boolean; merchantId: string; secret1: string; secret2: string; currency: string }
  platega: { enabled: boolean; merchantId: string; secret: string; paymentMethod: number; currency: string }
  manual: { enabled: boolean; instructions: string }
}
