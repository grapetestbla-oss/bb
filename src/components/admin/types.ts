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

export type AdminSetup = {
  id: string
  trackId: string
  title: string
  type: string
  pack: string
  price: number
  oldPrice: number | null
  description: string
  data: string | null
  previewData: string
  sales: number
  featured: boolean
  active: boolean
  track: AdminTrack
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
