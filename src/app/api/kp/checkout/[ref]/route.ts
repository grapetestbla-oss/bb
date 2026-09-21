import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";
import { getPlan } from "@/lib/kp/plans";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { ref } = await params;
  const payment = await db.kpPayment.findUnique({ where: { providerRef: ref } });

  if (!payment || payment.userId !== account.user.id) {
    return NextResponse.json({ error: "Платёж не найден" }, { status: 404 });
  }

  return NextResponse.json({
    payment: {
      ref: payment.providerRef,
      plan: payment.plan,
      planName: getPlan(payment.plan).name,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    },
  });
}
