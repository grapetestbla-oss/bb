"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kpApi } from "@/lib/kp/client";

/** Многострочные поля вводятся построчно — так быстрее, чем список инпутов. */
function toList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-–•\s]+/, "").trim())
    .filter(Boolean);
}

export default function KpNewProposalPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    companyAbout: "",
    clientName: "",
    clientTask: "",
    services: "",
    advantages: "",
    budget: "",
    timeline: "",
    contacts: "",
    tone: "official",
  });

  useEffect(() => {
    // Подставляем компанию из профиля — её не нужно вводить каждый раз.
    kpApi
      .account()
      .then((account) => {
        setForm((prev) => ({
          ...prev,
          companyName: prev.companyName || account.user.company || account.user.name,
        }));
      })
      .catch((error) => {
        if ((error as { status?: number }).status === 401) router.push("/kp/login");
      });
  }, [router]);

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);

    const parsedBudget = Number(form.budget.replace(/\s/g, ""));

    try {
      const { proposal } = await kpApi.createProposal({
        companyName: form.companyName,
        companyAbout: form.companyAbout,
        clientName: form.clientName,
        clientTask: form.clientTask,
        services: toList(form.services),
        advantages: toList(form.advantages),
        budget: form.budget.trim() && Number.isFinite(parsedBudget) ? parsedBudget : null,
        timeline: form.timeline,
        contacts: form.contacts,
        tone: form.tone,
      });

      toast.success("КП готово");
      router.push(`/kp/app/p/${proposal.id}`);
    } catch (error) {
      const err = error as Error & { code?: string };
      toast.error(err.message, {
        action:
          err.code === "quota_exceeded"
            ? {
                label: "Тарифы",
                onClick: () => router.push("/kp/app/billing"),
              }
            : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Новое коммерческое предложение</h1>
      <p className="mb-8 text-muted-foreground">
        Чем конкретнее бриф, тем меньше придётся править текст.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Кто предлагает</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Ваша компания *</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set("companyName")(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAbout">Чем занимаетесь</Label>
              <Textarea
                id="companyAbout"
                rows={3}
                placeholder="Студия веб-разработки, 6 лет на рынке, делаем интернет-магазины на 1С-Битрикс"
                value={form.companyAbout}
                onChange={(e) => set("companyAbout")(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Кому и зачем</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Клиент *</Label>
              <Input
                id="clientName"
                placeholder="ООО «Ромашка»"
                value={form.clientName}
                onChange={(e) => set("clientName")(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientTask">Задача клиента *</Label>
              <Textarea
                id="clientTask"
                rows={4}
                placeholder="Текущий сайт не принимает заявки с телефонов, конверсия упала вдвое. Нужен новый каталог и корзина."
                value={form.clientTask}
                onChange={(e) => set("clientTask")(e.target.value)}
                required
                minLength={10}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Что входит</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="services">Состав работ — по одному в строке</Label>
              <Textarea
                id="services"
                rows={5}
                placeholder={"Аудит текущего сайта\nДизайн каталога и корзины\nВёрстка и интеграция с 1С"}
                value={form.services}
                onChange={(e) => set("services")(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advantages">Ваши преимущества — по одному в строке</Label>
              <Textarea
                id="advantages"
                rows={4}
                placeholder={"Фиксируем смету в договоре\nПередаём проект с документацией"}
                value={form.advantages}
                onChange={(e) => set("advantages")(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Условия</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Стоимость, ₽</Label>
              <Input
                id="budget"
                inputMode="numeric"
                placeholder="350000"
                value={form.budget}
                onChange={(e) => set("budget")(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым — варианты будут «по запросу»
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline">Срок</Label>
              <Input
                id="timeline"
                placeholder="8 недель"
                value={form.timeline}
                onChange={(e) => set("timeline")(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Тон текста</Label>
              <Select value={form.tone} onValueChange={set("tone")}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">Официальный</SelectItem>
                  <SelectItem value="expert">Экспертный</SelectItem>
                  <SelectItem value="friendly">Дружелюбный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacts">Контакты</Label>
              <Input
                id="contacts"
                placeholder="Иван Петров, +7 900 000-00-00"
                value={form.contacts}
                onChange={(e) => set("contacts")(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Собираем предложение…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Сгенерировать КП
            </>
          )}
        </Button>
      </form>
    </main>
  );
}
