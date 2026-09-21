"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { kpApi } from "@/lib/kp/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const initialMode = params.get("mode") === "register" ? "register" : "login";
  const plan = params.get("plan");
  // Пришёл с карточки платного тарифа — после регистрации ведём сразу в биллинг.
  const nextUrl = plan && plan !== "free" ? "/kp/app/billing" : "/kp/app";

  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    company: "",
  });

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        await kpApi.register(form);
        toast.success("Аккаунт создан");
      } else {
        await kpApi.login(form.email, form.password);
        toast.success("С возвращением");
      }
      router.push(nextUrl);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "register" ? "Создать аккаунт" : "Вход в KPGen"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="space-y-4">
              <TabsContent value="register" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ваше имя</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name")(e.target.value)}
                    required={mode === "register"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Компания</Label>
                  <Input
                    id="company"
                    placeholder="Необязательно"
                    value={form.company}
                    onChange={(e) => update("company")(e.target.value)}
                  />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email")(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  value={form.password}
                  onChange={(e) => update("password")(e.target.value)}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                />
                {mode === "register" && (
                  <p className="text-xs text-muted-foreground">
                    Минимум 8 символов
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? "Подождите…"
                  : mode === "register"
                    ? "Создать аккаунт"
                    : "Войти"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

export default function KpLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
