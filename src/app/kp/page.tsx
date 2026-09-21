import Link from "next/link";
import { Check, Clock, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentAccount } from "@/lib/kp/account";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/kp/plans";

const STEPS = [
  {
    icon: FileText,
    title: "Заполняете бриф",
    text: "Кто клиент, какая задача, что входит в работу, срок и бюджет. Одна форма, две минуты.",
  },
  {
    icon: Sparkles,
    title: "Получаете готовое КП",
    text: "Задача, решение, состав работ, этапы, таблица стоимости с вариантами и следующий шаг.",
  },
  {
    icon: Clock,
    title: "Правите и отправляете",
    text: "Текст можно отредактировать, сохранить, скачать в Markdown или распечатать в PDF.",
  },
];

export default async function KpLandingPage() {
  const account = await getCurrentAccount();
  const ctaHref = account ? "/kp/app/new" : "/kp/login?mode=register";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          Коммерческие предложения без «напишу завтра»
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          КП для клиента — за две минуты, а не за вечер
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Заполните короткий бриф — получите готовое коммерческое предложение со
          структурой, этапами и таблицей стоимости. Редактируйте, скачивайте,
          отправляйте.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href={ctaHref}>
              {account ? "Создать КП" : "Попробовать бесплатно"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#pricing">Тарифы</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Первые 3 КП — бесплатно, без карты.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <step.icon className="h-6 w-6 text-primary" />
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {step.text}
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="pricing" className="scroll-mt-20 pt-24">
        <h2 className="text-center text-3xl font-bold">Тарифы</h2>
        <p className="mt-3 text-center text-muted-foreground">
          Помесячно, без договора и минимального срока. Отменить можно в один клик.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const highlighted = plan.id === "pro";

            return (
              <Card
                key={plan.id}
                className={highlighted ? "border-primary shadow-lg" : undefined}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {highlighted && <Badge>Популярный</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  <p className="pt-2 text-3xl font-bold">
                    {plan.price === 0 ? "0 ₽" : formatPrice(plan.price)}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / мес
                    </span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={highlighted ? "default" : "outline"}
                  >
                    <Link
                      href={
                        account
                          ? "/kp/app/billing"
                          : `/kp/login?mode=register&plan=${plan.id}`
                      }
                    >
                      {plan.paid ? "Подключить" : "Начать бесплатно"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
