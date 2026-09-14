import Link from 'next/link'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import { RegisterForm } from '@/components/auth-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Регистрация' }

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect('/cabinet')

  return (
    <div className="hero-grid flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.jpg" alt="F1 Icons League" width={72} height={72} className="h-18 w-18 rounded-xl object-cover ring-1 ring-primary/40" />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-gradient-gold">Регистрация</h1>
          <p className="mt-1 text-sm text-muted-foreground">Создай аккаунт, чтобы подать заявку в лигу</p>
        </div>

        <div className="surface p-6">
          <RegisterForm />
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  )
}
