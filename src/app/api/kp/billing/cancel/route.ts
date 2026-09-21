import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";

export async function POST() {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (!account.subscription) {
    return NextResponse.json(
      { error: "Активной подписки нет" },
      { status: 400 },
    );
  }

  // Доступ сохраняем до конца оплаченного периода — деньги уже получены.
  await db.kpSubscription.update({
    where: { id: account.subscription.id },
    data: { status: "cancelled", cancelAtPeriodEnd: true },
  });

  return NextResponse.json({ ok: true });
}
