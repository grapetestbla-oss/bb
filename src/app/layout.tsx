import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { getCurrentUser } from '@/lib/auth'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'cyrillic'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FANTASTIQUEBOY SETUPS — сетапы для F1 25 и 2026 Season Pack',
  description:
    'Магазин профессиональных сетапов для F1 25: все трассы сезона и 2026 Season Pack. Квалификация, гонка, дождь, а также индивидуальное обучение.',
  keywords: ['F1 25', 'сетапы', 'setups', '2026 Season Pack', 'обучение', 'F1 25 setup'],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser()

  return (
    <html lang="ru" suppressHydrationWarning className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  )
}
