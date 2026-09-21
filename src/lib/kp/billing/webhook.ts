import crypto from "crypto";
import { db } from "@/lib/db";
import { getPlan, isPlanId } from "@/lib/kp/plans";

const WEBHOOK_SECRET =
  process.env.KP_WEBHOOK_SECRET || "kp-dev-webhook-secret";

const PERIOD_DAYS = 30;

export interface PaymentEvent {
  type: "payment.succeeded" | "payment.failed";
  ref: string;
}

export function signWebhookPayload(rawBody: string): string {
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const expected = signWebhookPayload(rawBody);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export interface WebhookResult {
  ok: boolean;
  status: number;
  message: string;
}

/**
 * Обработка события об оплате. Идемпотентна: повторная доставка того же
 * события не создаст вторую подписку и не продлит период дважды.
 */
export async function processPaymentEvent(
  event: PaymentEvent,
): Promise<WebhookResult> {
  const payment = await db.kpPayment.findUnique({
    where: { providerRef: event.ref },
  });

  if (!payment) {
    return { ok: false, status: 404, message: "Платёж не найден" };
  }

  if (payment.status !== "pending") {
    return { ok: true, status: 200, message: "Событие уже обработано" };
  }

  if (event.type === "payment.failed") {
    await db.kpPayment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    return { ok: true, status: 200, message: "Платёж отклонён" };
  }

  if (!isPlanId(payment.plan) || !getPlan(payment.plan).paid) {
    await db.kpPayment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    return { ok: false, status: 400, message: "Некорректный тариф в платеже" };
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.kpPayment.update({
      where: { id: payment.id },
      data: { status: "succeeded" },
    }),
    // Старые подписки закрываем, чтобы активной всегда была ровно одна.
    db.kpSubscription.updateMany({
      where: { userId: payment.userId, status: { in: ["active", "cancelled"] } },
      data: { status: "expired" },
    }),
    db.kpSubscription.create({
      data: {
        userId: payment.userId,
        plan: payment.plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: payment.provider,
        providerRef: payment.providerRef,
      },
    }),
    db.kpUser.update({
      where: { id: payment.userId },
      data: { plan: payment.plan },
    }),
  ]);

  return { ok: true, status: 200, message: "Подписка активирована" };
}

/** Точка входа для вебхука: проверяет подпись и применяет событие. */
export async function handleWebhook(
  rawBody: string,
  signature: string | null,
): Promise<WebhookResult> {
  if (!verifyWebhookSignature(rawBody, signature)) {
    return { ok: false, status: 401, message: "Неверная подпись вебхука" };
  }

  let event: PaymentEvent;
  try {
    event = JSON.parse(rawBody) as PaymentEvent;
  } catch {
    return { ok: false, status: 400, message: "Некорректный JSON" };
  }

  if (
    (event.type !== "payment.succeeded" && event.type !== "payment.failed") ||
    typeof event.ref !== "string"
  ) {
    return { ok: false, status: 400, message: "Неизвестное событие" };
  }

  return processPaymentEvent(event);
}
