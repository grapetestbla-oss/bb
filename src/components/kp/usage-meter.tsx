"use client";

import { Progress } from "@/components/ui/progress";
import type { AccountState } from "@/lib/kp/account";

export function UsageMeter({ account }: { account: AccountState }) {
  const { usage, plan } = account;
  const unlimited = usage.quota === null;
  const percent = unlimited
    ? 0
    : Math.min(100, Math.round((usage.used / Math.max(1, usage.quota!)) * 100));

  const renewsAt = new Date(usage.periodEnd).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">
          Тариф {plan.name} · счётчик обнулится {renewsAt}
        </span>
        <span className="font-medium">
          {unlimited ? `${usage.used} КП · безлимит` : `${usage.used} / ${usage.quota} КП`}
        </span>
      </div>
      {!unlimited && <Progress value={percent} className="h-2" />}
    </div>
  );
}
