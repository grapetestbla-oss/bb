import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clearSessionCookie, setSessionCookie } from "@/lib/kp/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "logout") {
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 },
      );
    }

    if (action === "register") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const company = typeof body?.company === "string" ? body.company.trim() : "";

      if (!name) {
        return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Пароль должен быть не менее 8 символов" },
          { status: 400 },
        );
      }

      const existing = await db.kpUser.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "Пользователь с таким email уже зарегистрирован" },
          { status: 409 },
        );
      }

      const user = await db.kpUser.create({
        data: {
          email,
          name,
          company,
          password: await bcrypt.hash(password, 12),
        },
      });

      await setSessionCookie(user.id);
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    if (action === "login") {
      const user = await db.kpUser.findUnique({ where: { email } });
      // Одинаковый текст ошибки на «нет пользователя» и «неверный пароль»,
      // чтобы не подсказывать, какие email зарегистрированы.
      const invalid = NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 },
      );

      if (!user) return invalid;
      if (!(await bcrypt.compare(password, user.password))) return invalid;

      await setSessionCookie(user.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Неизвестное действие" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[kp] auth error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
