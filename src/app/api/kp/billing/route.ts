import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const payments = await db.kpPayment.findMany({
    where: { userId: account.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      plan: true,
      amount: true,
      currency: true,
      status: true,
      provider: true,
      providerRef: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ account, payments });
}
