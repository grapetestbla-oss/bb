"use client";

import { type Order } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

interface OrderTrackerProps {
  order: Order;
}

const statusSteps = [
  { key: "pending", label: "Ожидание", step: 0 },
  { key: "in_progress", label: "В работе", step: 1 },
  { key: "completed", label: "Завершено", step: 2 },
];

export function OrderTracker({ order }: OrderTrackerProps) {
  const currentStep =
    statusSteps.find((s) => s.key === order.status)?.step ?? -1;
  const isDisputed = order.status === "disputed";
  const isCancelled = order.status === "cancelled" || order.status === "refunded";

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("Заказ отменён");
      } else {
        toast.error("Не удалось отменить заказ");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <XCircle className="h-4 w-4 text-destructive" />
        <span>
          {order.status === "refunded" ? "Возврат средств" : "Заказ отменён"}
        </span>
      </div>
    );
  }

  if (isDisputed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="h-4 w-4" />
          <span>Открыт спор</span>
        </div>
        <Progress value={order.progress} className="h-1.5" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress
          value={order.progress}
          className="h-2 flex-1"
        />
        <span className="text-xs font-medium text-muted-foreground min-w-[32px] text-right">
          {order.progress}%
        </span>
      </div>

      {/* Status steps */}
      <div className="flex items-center gap-1">
        {statusSteps.map((step, i) => {
          const isActive = step.step <= currentStep;
          const isCurrent = step.step === currentStep;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1 text-xs ${
                  isActive
                    ? isCurrent
                      ? "text-neon-blue font-medium"
                      : "text-neon-green"
                    : "text-muted-foreground/50"
                }`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? isCurrent
                        ? "bg-neon-blue glow-blue"
                        : "bg-neon-green"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < statusSteps.length - 1 && (
                <div
                  className={`h-px w-4 ${
                    step.step < currentStep
                      ? "bg-neon-green"
                      : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Estimated time + cancel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {order.status === "completed"
              ? "Завершено"
              : order.status === "in_progress"
              ? "В процессе..."
              : "Ожидание бустера"}
          </span>
        </div>
        {order.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-6 text-[11px] text-destructive hover:text-destructive px-2"
          >
            Отменить
          </Button>
        )}
      </div>
    </div>
  );
}
