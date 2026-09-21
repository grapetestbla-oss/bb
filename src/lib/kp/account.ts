import { db } from "@/lib/db";
import { getPlan, type Plan, type PlanId } from "@/lib/kp/plans";
import { getSessionUserId } from "@/lib/kp/session";

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  company: string;
  plan: PlanId;
  createdAt: string;
}

export interface AccountUsage {
  used: number;
  quota: number | null;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
}

export interface AccountState {
  user: AccountUser;
  plan: Plan;
  usage: AccountUsage;
  subscription: {
    id: string;
    plan: PlanId;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
  } | null;
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Активная подписка — та, у которой период ещё не закончился. Подписка со
 * статусом cancelled продолжает действовать до конца оплаченного периода.
 */
async function findActiveSubscription(userId: string) {
  return db.kpSubscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "cancelled"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
  });
}

export async function getAccountState(userId: string): Promise<AccountState | null> {
  const user = await db.kpUser.findUnique({ where: { id: userId } });
  if (!user) return null;

  const subscription = await findActiveSubscription(userId);

  // Подписка истекла, а в профиле остался платный тариф — откатываем на free.
  const effectivePlanId = (subscription?.plan ?? "free") as PlanId;
  if (user.plan !== effectivePlanId) {
    await db.kpUser.update({
      where: { id: user.id },
      data: { plan: effectivePlanId },
    });
    user.plan = effectivePlanId;
  }

  const plan = getPlan(effectivePlanId);

  const now = new Date();
  const periodStart = subscription
    ? subscription.currentPeriodStart
    : startOfMonth(now);
  const periodEnd = subscription
    ? subscription.currentPeriodEnd
    : startOfNextMonth(now);

  const used = await db.kpProposal.count({
    where: { userId, createdAt: { gte: periodStart } },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      plan: effectivePlanId,
      createdAt: user.createdAt.toISOString(),
    },
    plan,
    usage: {
      used,
      quota: plan.quota,
      remaining: plan.quota === null ? null : Math.max(0, plan.quota - used),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    subscription: subscription
      ? {
          id: subscription.id,
          plan: subscription.plan as PlanId,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        }
      : null,
  };
}

/** Текущий залогиненный пользователь KPGen или null. */
export async function getCurrentAccount(): Promise<AccountState | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getAccountState(userId);
}
