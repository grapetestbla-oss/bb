export type PlanId = "free" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  /** Цена за месяц в рублях. */
  price: number;
  /** Сколько КП можно сгенерировать за расчётный период. null — без лимита. */
  quota: number | null;
  tagline: string;
  features: string[];
  /** Платные тарифы показываем с кнопкой оплаты. */
  paid: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    quota: 3,
    tagline: "Попробовать на реальной сделке",
    features: [
      "3 коммерческих предложения в месяц",
      "Все блоки структуры КП",
      "Экспорт в Markdown и печать в PDF",
    ],
    paid: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 990,
    quota: 50,
    tagline: "Для фрилансера и небольшой студии",
    features: [
      "50 коммерческих предложений в месяц",
      "Редактирование и перегенерация текста",
      "История всех КП с поиском",
      "Экспорт в Markdown и печать в PDF",
    ],
    paid: true,
  },
  business: {
    id: "business",
    name: "Business",
    price: 2990,
    quota: null,
    tagline: "Для отдела продаж",
    features: [
      "Безлимит коммерческих предложений",
      "Приоритетная генерация",
      "Редактирование и перегенерация текста",
      "История всех КП с поиском",
      "Экспорт в Markdown и печать в PDF",
    ],
    paid: true,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function getPlan(id: string): Plan {
  return isPlanId(id) ? PLANS[id] : PLANS.free;
}

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}
