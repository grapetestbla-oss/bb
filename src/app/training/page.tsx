import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'
import { availableProviders } from '@/lib/payments'
import { getPaymentSettings } from '@/lib/settings'
import { TrainingView } from '@/components/training-view'

export const metadata = { title: 'Обучение — FANTASTIQUEBOY SETUPS' }
export const dynamic = 'force-dynamic'

export default async function TrainingPage() {
  const [plans, user, providers, payments] = await Promise.all([
    db.trainingPlan.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { price: 'asc' }] }),
    getCurrentUser(),
    availableProviders(),
    getPaymentSettings(),
  ])

  return (
    <TrainingView
      plans={plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        price: plan.price,
        duration: plan.duration,
        features: parseJson<string[]>(plan.features, []),
      }))}
      user={user}
      providers={providers}
      manualInstructions={payments.manual.instructions}
    />
  )
}
