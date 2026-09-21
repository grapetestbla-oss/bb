import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/kp/account";
import { getPaymentProvider } from "@/lib/kp/billing";
import { getPlan, isPlanId } from "@/lib/kp/plans";

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const planId = body?.plan;

  if (!isPlanId(planId) || !getPlan(planId).paid) {
    return NextResponse.json(
      { error: "Выберите платный тариф" },
      { status: 400 },
    );
  }

  const plan = getPlan(planId);

  try {
    const session = await getPaymentProvider().createCheckout({
      userId: account.user.id,
      plan: plan.id,
      amount: plan.price,
      currency: "RUB",
    });
    return NextResponse.json({ checkout: session }, { status: 201 });
  } catch (error) {
    console.error("[kp] checkout error:", error);
    return NextResponse.json(
      { error: "Не удалось создать платёж" },
      { status: 500 },
    );
  }
}
