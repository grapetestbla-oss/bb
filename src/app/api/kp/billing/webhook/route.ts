import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/kp/billing/webhook";

/**
 * Вебхук платёжного провайдера. Читаем сырое тело — подпись считается по байтам
 * запроса, повторная сериализация JSON её бы сломала.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-kp-signature");

  const result = await handleWebhook(rawBody, signature);

  return NextResponse.json(
    result.ok ? { ok: true, message: result.message } : { error: result.message },
    { status: result.status },
  );
}
