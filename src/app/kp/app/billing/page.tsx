"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsageMeter } from "@/components/kp/usage-meter";
import { kpApi, type PaymentRow } from "@/lib/kp/client";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/lib/kp/plans";
import type { AccountState } from "@/lib/kp/account";

const PAYMENT_STATUS: Record<string, string> = {
  pending: "Ожидает оплаты",
  succeeded: "Оплачен",
  failed: "Отклонён",
};

export default function KpBillingPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await kpApi.billing();
      setAccount(data.account);
      setPayments(data.payments);
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        router.push("/kp/login");
        return;
      }
      toast.error("Не удалось загрузить биллинг");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const subscribe = async (planId: PlanId) => {
    setPendingPlan(planId);
    try {
      const { checkout } = await kpApi.checkout(planId);
      router.push(checkout.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка оплаты");
      setPendingPlan(null);
    }
  };

  const cancel = async () => {
    try {
      await kpApi.cancelSubscription();
      toast.success("Подписка отменена — доступ сохранится до конца периода");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отменить");
    }
  };

  if (loading || !account) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  const currentPlan = account.plan.id;
  const subscription = account.subscription;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Тариф и оплата</h1>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Текущий тариф: {account.plan.name}</CardTitle>
            {subscription && (
              <Badge variant={subscription.cancelAtPeriodEnd ? "outline" : "secondary"}>
                {subscription.cancelAtPeriodEnd
                  ? `Отменена, активна до ${new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}`
                  : `Продлится ${new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageMeter account={account} />
          {subscription && !subscription.cancelAtPeriodEnd && (
            <Button variant="outline" size="sm" onClick={cancel}>
              Отменить подписку
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = plan.id === currentPlan;

          return (
            <Card key={plan.id} className={isCurrent ? "border-primary" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Ваш тариф</Badge>}
                </div>
                <p className="pt-1 text-2xl font-bold">
                  {plan.price === 0 ? "0 ₽" : formatPrice(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground">
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
                {plan.paid && !isCurrent && (
                  <Button
                    className="w-full"
                    onClick={() => subscribe(plan.id)}
                    disabled={pendingPlan !== null}
                  >
                    {pendingPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Переходим к оплате
                      </>
                    ) : (
                      "Подключить"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История платежей</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Платежей пока не было
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тариф</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{PLANS[payment.plan as PlanId]?.name ?? payment.plan}</TableCell>
                    <TableCell>{formatPrice(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "succeeded"
                            ? "default"
                            : payment.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {PAYMENT_STATUS[payment.status] ?? payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
