import Link from 'next/link'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from '@/components/auth-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Вход' }

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/cabinet')

  return (
    <div className="hero-grid flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.jpg" alt="F1 Icons League" width={72} height={72} className="h-18 w-18 rounded-xl object-cover ring-1 ring-primary/40" />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-gradient-gold">Вход в лигу</h1>
          <p className="mt-1 text-sm text-muted-foreground">Личный кабинет пилота F1 Icons League</p>
        </div>

        <div className="surface p-6">
          <LoginForm />
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
