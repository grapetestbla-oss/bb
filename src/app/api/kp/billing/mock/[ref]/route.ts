import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";
import { handleWebhook, signWebhookPayload } from "@/lib/kp/billing/webhook";

/**
 * Имитация действия на стороне эквайринга: пользователь нажал «оплатить» или
 * «отклонить» на mock-странице. Результат мы не применяем напрямую, а
 * отправляем сами себе подписанное событие — ровно тем же путём, которым
 * придёт вебхук от настоящего провайдера.
 */
export async function POST(
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

  if (payment.provider !== "mock") {
    return NextResponse.json(
      { error: "Этот платёж обрабатывает внешний провайдер" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const success = body?.outcome !== "fail";

  const rawBody = JSON.stringify({
    type: success ? "payment.succeeded" : "payment.failed",
    ref,
  });

  const result = await handleWebhook(rawBody, signWebhookPayload(rawBody));

  return NextResponse.json(
    result.ok ? { ok: true, message: result.message } : { error: result.message },
    { status: result.status },
  );
}
