import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/kp/account";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  return NextResponse.json(account);
}
