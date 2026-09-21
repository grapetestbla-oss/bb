import Anthropic from "@anthropic-ai/sdk";
import { TONES, type Brief } from "@/lib/kp/generator/brief";
import { formatPrice } from "@/lib/kp/plans";

const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `Ты — опытный B2B-копирайтер, который пишет коммерческие предложения на русском языке.

Требования к результату:
- Только Markdown, без преамбул вроде «Вот ваше КП» и без блоков кода вокруг текста.
- Структура: заголовок с адресатом, задача клиента, предлагаемое решение и состав работ, этапы и сроки (таблица), стоимость (таблица с 2–3 вариантами), почему мы, следующий шаг.
- Пиши конкретно и от лица исполнителя. Не выдумывай факты, которых нет в брифе: цифры, кейсы, названия клиентов, сертификаты.
- Если данных для блока не хватает — сформулируй его так, чтобы деталь уточнялась на созвоне, а не придумывай её.
- Объём — 400–700 слов.`;

function briefToPrompt(brief: Brief): string {
  const lines = [
    `Исполнитель: ${brief.companyName}`,
    brief.companyAbout ? `О исполнителе: ${brief.companyAbout}` : null,
    `Клиент: ${brief.clientName}`,
    `Задача клиента: ${brief.clientTask}`,
    brief.services.length
      ? `Состав работ: ${brief.services.join("; ")}`
      : "Состав работ: не задан, предложи разумный исходя из задачи",
    brief.advantages.length
      ? `Преимущества исполнителя: ${brief.advantages.join("; ")}`
      : null,
    brief.budget !== null && brief.budget > 0
      ? `Ориентир по стоимости основного варианта: ${formatPrice(brief.budget)}`
      : "Стоимость не задана — оформи варианты с пометкой «по запросу»",
    brief.timeline ? `Срок: ${brief.timeline}` : null,
    brief.contacts ? `Контакты для связи: ${brief.contacts}` : null,
    `Тон текста: ${TONES[brief.tone]}`,
  ].filter(Boolean);

  return `Составь коммерческое предложение по этому брифу.\n\n${lines.join("\n")}`;
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Генерация через Claude. Бросает исключение при любой проблеме — вызывающий
 * код (generator/index.ts) сам решает, откатываться ли на шаблон.
 */
export async function generateWithClaude(brief: Brief): Promise<string> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    // КП — типовая задача генерации по структурированному брифу: medium
    // держит качество и заметно сокращает время ответа для пользователя.
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: briefToPrompt(brief) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Модель отклонила запрос");
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Пустой ответ модели");
  }

  return text;
}
