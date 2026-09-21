import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";
import { safeParseBrief } from "@/lib/kp/generator/brief";
import { generateProposal } from "@/lib/kp/generator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (account.plan.id === "free") {
    return NextResponse.json(
      {
        error: "Перегенерация доступна на тарифах Pro и Business",
        code: "plan_required",
      },
      { status: 402 },
    );
  }

  const { id } = await params;
  const proposal = await db.kpProposal.findUnique({ where: { id } });
  if (!proposal || proposal.userId !== account.user.id) {
    return NextResponse.json({ error: "КП не найдено" }, { status: 404 });
  }

  const brief = safeParseBrief(proposal.brief);
  if (!brief) {
    return NextResponse.json(
      { error: "Бриф этого КП повреждён — создайте новое" },
      { status: 422 },
    );
  }

  const { content, engine } = await generateProposal(brief);
  const updated = await db.kpProposal.update({
    where: { id },
    data: { content, engine },
  });

  return NextResponse.json({ proposal: updated });
}
