import type { Brief } from "@/lib/kp/generator/brief";
import { renderTemplateProposal } from "@/lib/kp/generator/template";
import { generateWithClaude, isLlmConfigured } from "@/lib/kp/generator/llm";

export type Engine = "claude" | "template";

export interface GeneratedProposal {
  content: string;
  engine: Engine;
}

/**
 * Если задан ANTHROPIC_API_KEY — пишем текст моделью. Если ключа нет или
 * запрос не удался, отдаём шаблонное КП: пользователь в любом случае получает
 * готовый документ, а не ошибку.
 */
export async function generateProposal(brief: Brief): Promise<GeneratedProposal> {
  if (isLlmConfigured()) {
    try {
      return { content: await generateWithClaude(brief), engine: "claude" };
    } catch (error) {
      console.error("[kp] Генерация через Claude не удалась:", error);
    }
  }

  return { content: renderTemplateProposal(brief), engine: "template" };
}

export function proposalTitle(brief: Brief): string {
  return `КП для «${brief.clientName}»`;
}
