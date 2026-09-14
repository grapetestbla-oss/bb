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
  title: {
    default: 'F1 Icons League — киберспортивная лига по F1 25',
    template: '%s · F1 Icons League',
  },
  description:
    'Официальный сайт лиги F1 Icons League по игре F1 25: новости, календарь сезона, личный и командный зачёт, подача заявок и личный кабинет пилота.',
  keywords: ['F1 25', 'F1 Icons League', 'лига', 'киберспорт', 'формула 1', 'чемпионат'],
  icons: { icon: '/logo.jpg' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <html lang="ru" suppressHydrationWarning className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
