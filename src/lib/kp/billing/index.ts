import { mockProvider } from "@/lib/kp/billing/mock";
import type { PaymentProvider } from "@/lib/kp/billing/provider";

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.KP_PAYMENTS_PROVIDER || "mock";

  if (configured !== "mock") {
    // Провайдер объявлен в конфиге, но адаптера нет — падать молча нельзя,
    // иначе пользователь уйдёт в оплату, которой не существует.
    throw new Error(
      `Платёжный провайдер "${configured}" не реализован. ` +
        `Добавьте адаптер с интерфейсом PaymentProvider и подключите его здесь.`,
    );
  }

  return mockProvider;
}

export type { PaymentProvider } from "@/lib/kp/billing/provider";
