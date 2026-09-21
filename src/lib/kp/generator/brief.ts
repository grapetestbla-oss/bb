import { z } from "zod";

export const TONES = {
  official: "официальный",
  expert: "экспертный",
  friendly: "дружелюбный",
} as const;

export type Tone = keyof typeof TONES;

const trimmedList = z
  .array(z.string().trim().min(1))
  .max(15)
  .default([])
  .transform((items) => items.filter(Boolean));

export const briefSchema = z.object({
  companyName: z.string().trim().min(1, "Укажите название вашей компании").max(120),
  companyAbout: z.string().trim().max(1000).default(""),
  clientName: z.string().trim().min(1, "Укажите, кому адресовано КП").max(120),
  clientTask: z.string().trim().min(10, "Опишите задачу клиента подробнее").max(2000),
  services: trimmedList,
  advantages: trimmedList,
  budget: z.number().nonnegative().max(1_000_000_000).nullable().default(null),
  timeline: z.string().trim().max(120).default(""),
  contacts: z.string().trim().max(300).default(""),
  tone: z.enum(["official", "expert", "friendly"]).default("official"),
});

export type Brief = z.infer<typeof briefSchema>;

export function parseBrief(value: unknown): Brief {
  return briefSchema.parse(value);
}

/** Бриф хранится в БД как JSON-строка; битые данные не должны ронять страницу. */
export function safeParseBrief(raw: string): Brief | null {
  try {
    return briefSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
