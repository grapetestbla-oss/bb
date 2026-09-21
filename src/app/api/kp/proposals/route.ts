import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAccount } from "@/lib/kp/account";
import { parseBrief } from "@/lib/kp/generator/brief";
import { generateProposal, proposalTitle } from "@/lib/kp/generator";

export async function GET(request: Request) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const proposals = await db.kpProposal.findMany({
    where: {
      userId: account.user.id,
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { clientName: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      clientName: true,
      engine: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ proposals });
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (account.usage.remaining !== null && account.usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: `На тарифе ${account.plan.name} доступно ${account.usage.quota} КП в месяц. Лимит исчерпан.`,
        code: "quota_exceeded",
      },
      { status: 402 },
    );
  }

  let brief;
  try {
    brief = parseBrief(await request.json());
  } catch (error) {
    const message =
      error && typeof error === "object" && "issues" in error
        ? (error as { issues: { message: string }[] }).issues[0]?.message
        : null;
    return NextResponse.json(
      { error: message ?? "Проверьте поля брифа" },
      { status: 400 },
    );
  }

  const { content, engine } = await generateProposal(brief);

  const proposal = await db.kpProposal.create({
    data: {
      userId: account.user.id,
      title: proposalTitle(brief),
      clientName: brief.clientName,
      brief: JSON.stringify(brief),
      content,
      engine,
    },
  });

  return NextResponse.json({ proposal }, { status: 201 });
}
