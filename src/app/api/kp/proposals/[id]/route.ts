import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";

async function findOwned(id: string, userId: string) {
  const proposal = await db.kpProposal.findUnique({ where: { id } });
  // Чужое КП отдаём как «не найдено» — не подтверждаем существование id.
  if (!proposal || proposal.userId !== userId) return null;
  return proposal;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const proposal = await findOwned(id, account.user.id);
  if (!proposal) {
    return NextResponse.json({ error: "КП не найдено" }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const proposal = await findOwned(id, account.user.id);
  if (!proposal) {
    return NextResponse.json({ error: "КП не найдено" }, { status: 404 });
  }

  const body = await request.json();
  const data: { content?: string; title?: string } = {};

  if (typeof body?.content === "string") data.content = body.content;
  if (typeof body?.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 200);
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Нечего сохранять" }, { status: 400 });
  }

  const updated = await db.kpProposal.update({ where: { id }, data });
  return NextResponse.json({ proposal: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const proposal = await findOwned(id, account.user.id);
  if (!proposal) {
    return NextResponse.json({ error: "КП не найдено" }, { status: 404 });
  }

  await db.kpProposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
