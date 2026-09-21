export interface CheckoutInput {
  userId: string;
  plan: string;
  amount: number;
  currency: string;
}

export interface CheckoutSession {
  /** Идентификатор сессии на стороне провайдера. */
  ref: string;
  /** Куда отправить пользователя платить. */
  url: string;
}

/**
 * Единственная точка, через которую приложение говорит с платёжкой.
 * Сейчас реализован mock-провайдер; чтобы подключить Stripe/ЮKassa, достаточно
 * написать второй класс с этим же интерфейсом и вернуть его из getPaymentProvider().
 * Подтверждение оплаты в любом случае приходит через вебхук
 * (src/lib/kp/billing/webhook.ts) — эта часть от провайдера не зависит.
 */
export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
}
