"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { kpApi } from "@/lib/kp/client";
import { formatPrice } from "@/lib/kp/plans";

interface CheckoutPayment {
  ref: string;
  plan: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Страница оплаты mock-провайдера — имитация формы эквайринга.
 * При подключении настоящего провайдера пользователь уйдёт на его домен,
 * а этот маршрут просто перестанет использоваться.
 */
export default function KpCheckoutPage() {
  const router = useRouter();
  const { ref } = useParams<{ ref: string }>();

  const [payment, setPayment] = useState<CheckoutPayment | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kpApi
      .getCheckout(ref)
      .then((data) => setPayment(data.payment))
      .catch((error) => {
        const status = (error as { status?: number }).status;
        if (status === 401) router.push("/kp/login");
        else {
          toast.error("Платёж не найден");
          router.push("/kp/app/billing");
        }
      })
      .finally(() => setLoading(false));
  }, [ref, router]);

  const pay = async (outcome: "success" | "fail") => {
    setBusy(true);
    try {
      await kpApi.payMock(ref, outcome);
      if (outcome === "success") {
        toast.success("Оплата прошла, тариф подключён");
      } else {
        toast.error("Банк отклонил платёж");
      }
      router.push("/kp/app/billing");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка оплаты");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-4 py-20">
        <Skeleton className="h-72 w-full" />
      </main>
    );
  }

  if (!payment) return null;

  const done = payment.status !== "pending";

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">
              Тестовый платёжный шлюз
            </span>
          </div>
          <CardTitle>Оплата тарифа {payment.planName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">К оплате</span>
              <span className="text-2xl font-bold">{formatPrice(payment.amount)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Подписка на 30 дней · автопродления нет
            </p>
          </div>

          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Платёж уже обработан со статусом «{payment.status}».
              </p>
              <Button className="w-full" onClick={() => router.push("/kp/app/billing")}>
                Вернуться в биллинг
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => pay("success")}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Оплатить {formatPrice(payment.amount)}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => pay("fail")}
                  disabled={busy}
                >
                  Смоделировать отказ банка
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Деньги не списываются. Результат приходит в приложение подписанным
                вебхуком — так же, как от настоящего эквайринга.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
