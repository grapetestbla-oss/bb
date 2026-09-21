import crypto from "crypto";
import { db } from "@/lib/db";
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentProvider,
} from "@/lib/kp/billing/provider";

/**
 * Mock-провайдер: создаёт платёж в статусе pending и отдаёт ссылку на
 * внутреннюю страницу оплаты, которая имитирует страницу эквайринга.
 * Успех/отказ оттуда приходит обычным подписанным вебхуком.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    // Пользователь мог уйти со страницы оплаты и вернуться: переиспользуем
    // свежий неоплаченный платёж, чтобы не плодить висящие записи в истории.
    const pending = await db.kpPayment.findFirst({
      where: {
        userId: input.userId,
        plan: input.plan,
        status: "pending",
        provider: "mock",
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (pending) {
      return { ref: pending.providerRef, url: `/kp/checkout/${pending.providerRef}` };
    }

    const ref = `mock_${crypto.randomBytes(12).toString("hex")}`;

    await db.kpPayment.create({
      data: {
        userId: input.userId,
        plan: input.plan,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        provider: "mock",
        providerRef: ref,
      },
    });

    return { ref, url: `/kp/checkout/${ref}` };
  },
};
