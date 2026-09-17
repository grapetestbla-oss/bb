import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getCurrentUser } from '@/lib/auth'

export const metadata = { title: 'Регистрация — FANTASTIQUEBOY SETUPS' }
export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect('/profile')
  return <AuthForm mode="register" />
}
