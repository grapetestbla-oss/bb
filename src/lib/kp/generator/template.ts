import { TONES, type Brief } from "@/lib/kp/generator/brief";
import { formatPrice } from "@/lib/kp/plans";

/**
 * Детерминированный сборщик КП. Работает всегда — без ключей и без сети,
 * поэтому продукт остаётся рабочим, даже если LLM-провайдер недоступен.
 */

const TONE_INTRO: Record<keyof typeof TONES, (client: string) => string> = {
  official: (client) =>
    `Уважаемые коллеги из «${client}»! Благодарим за интерес к нашим услугам и направляем коммерческое предложение.`,
  expert: (client) =>
    `Команда подготовила для «${client}» предложение, основанное на разборе вашей задачи и нашем опыте в похожих проектах.`,
  friendly: (client) =>
    `Привет, «${client}»! Разобрались в вашей задаче и собрали предложение — без воды, по делу.`,
};

const STAGES = [
  {
    name: "Погружение и уточнение требований",
    share: 0.15,
    detail: "Фиксируем цели, ограничения и критерии приёмки.",
  },
  {
    name: "Подготовка решения",
    share: 0.2,
    detail: "Собираем план работ, согласуем объём и приоритеты.",
  },
  {
    name: "Основные работы",
    share: 0.45,
    detail: "Выполняем работы по согласованному плану, держим вас в курсе статуса.",
  },
  {
    name: "Сдача и поддержка",
    share: 0.2,
    detail: "Передаём результат, обучаем команду, сопровождаем на старте.",
  },
];

function formatDate(date: Date): string {
  // ru-RU добавляет суффикс « г.» — в тексте КП он лишний и даёт двойную точку.
  return date
    .toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/\s*г\.$/, "");
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function pricingSection(brief: Brief): string {
  if (brief.budget === null || brief.budget === 0) {
    return [
      "## Стоимость",
      "",
      "Итоговая стоимость рассчитывается после уточнения объёма работ. " +
        "Мы фиксируем её в договоре до старта — без изменений по ходу проекта.",
      "",
      "| Вариант | Что входит | Стоимость |",
      "| --- | --- | --- |",
      "| Базовый | Ключевая часть задачи, минимальный объём | по запросу |",
      "| Оптимальный | Полный объём работ из раздела «Что входит» | по запросу |",
      "| Расширенный | Полный объём + сопровождение после сдачи | по запросу |",
    ].join("\n");
  }

  const base = Math.round((brief.budget * 0.7) / 100) * 100;
  const extended = Math.round((brief.budget * 1.35) / 100) * 100;

  return [
    "## Стоимость",
    "",
    "| Вариант | Что входит | Стоимость |",
    "| --- | --- | --- |",
    `| Базовый | Ключевая часть задачи, минимальный объём | ${formatPrice(base)} |`,
    `| Оптимальный | Полный объём работ из раздела «Что входит» | **${formatPrice(brief.budget)}** |`,
    `| Расширенный | Полный объём + сопровождение 3 месяца после сдачи | ${formatPrice(extended)} |`,
    "",
    "Стоимость фиксируется в договоре до старта работ. Оплата — двумя частями: " +
      "аванс на старте и остаток после приёмки результата.",
  ].join("\n");
}

function timelineSection(brief: Brief): string {
  const lines = [
    "## Этапы и сроки",
    "",
    "| Этап | Что происходит | Доля работ |",
    "| --- | --- | --- |",
  ];

  for (const stage of STAGES) {
    lines.push(
      `| ${stage.name} | ${stage.detail} | ${Math.round(stage.share * 100)}% |`,
    );
  }

  if (brief.timeline) {
    lines.push("", `**Общий срок:** ${brief.timeline}.`);
  } else {
    lines.push(
      "",
      "**Общий срок** согласуем после уточнения объёма — ориентир даём на первом созвоне.",
    );
  }

  return lines.join("\n");
}

export function renderTemplateProposal(brief: Brief): string {
  const today = formatDate(new Date());

  const services = brief.services.length
    ? brief.services
    : [
        "Разбор текущей ситуации и постановка задачи",
        "Выполнение работ по согласованному плану",
        "Передача результата и инструкция по работе с ним",
      ];

  const advantages = brief.advantages.length
    ? brief.advantages
    : [
        "Фиксируем стоимость и сроки в договоре до старта",
        "Один ответственный менеджер на всё время проекта",
        "Отчитываемся о статусе на каждом этапе",
      ];

  const parts: string[] = [
    `# Коммерческое предложение для «${brief.clientName}»`,
    "",
    `**От:** ${brief.companyName}  `,
    `**Кому:** ${brief.clientName}  `,
    `**Дата:** ${today}`,
    "",
    "---",
    "",
    TONE_INTRO[brief.tone](brief.clientName),
    "",
    "## Задача",
    "",
    brief.clientTask,
    "",
    "## Что мы предлагаем",
    "",
    brief.companyAbout
      ? `${brief.companyAbout}\n\nПод вашу задачу мы предлагаем следующий состав работ:`
      : "Под вашу задачу мы предлагаем следующий состав работ:",
    "",
    bulletList(services),
    "",
    timelineSection(brief),
    "",
    pricingSection(brief),
    "",
    "## Почему мы",
    "",
    bulletList(advantages),
    "",
    "## Что дальше",
    "",
    "1. Вы подтверждаете подходящий вариант из раздела «Стоимость».",
    "2. Мы созваниваемся на 20–30 минут и уточняем детали.",
    "3. Фиксируем объём, сроки и стоимость в договоре и стартуем.",
    "",
  ];

  if (brief.contacts) {
    parts.push("---", "", `**Контакты:** ${brief.contacts}`, "");
  }

  parts.push(
    `Предложение действительно 14 дней с ${today}.`,
  );

  return parts.join("\n");
}
