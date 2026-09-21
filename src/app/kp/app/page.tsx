"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMeter } from "@/components/kp/usage-meter";
import { kpApi, type ProposalSummary } from "@/lib/kp/client";
import type { AccountState } from "@/lib/kp/account";

export default function KpDashboardPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (search: string) => {
      try {
        const [accountData, listData] = await Promise.all([
          kpApi.account(),
          kpApi.listProposals(search),
        ]);
        setAccount(accountData);
        setProposals(listData.proposals);
      } catch (error) {
        if ((error as { status?: number }).status === 401) {
          router.push("/kp/login");
          return;
        }
        toast.error("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    // Поиск по мере ввода, с паузой — чтобы не дёргать API на каждый символ.
    const timer = setTimeout(() => load(query), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  const quotaLeft = account?.usage.remaining;
  const outOfQuota = quotaLeft !== null && quotaLeft !== undefined && quotaLeft <= 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Мои коммерческие предложения</h1>
          {account && (
            <p className="text-sm text-muted-foreground">
              {account.user.company || account.user.name}
            </p>
          )}
        </div>
        <Button asChild disabled={outOfQuota}>
          <Link href="/kp/app/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать КП
          </Link>
        </Button>
      </div>

      {account && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <UsageMeter account={account} />
            {outOfQuota && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
                <p className="text-sm">
                  Лимит тарифа {account.plan.name} исчерпан. Подключите Pro —
                  50 КП в месяц и перегенерация текста.
                </p>
                <Button asChild size="sm">
                  <Link href="/kp/app/billing">Сменить тариф</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Поиск по названию или клиенту"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {query ? "Ничего не нашлось" : "Пока ни одного КП"}
              </p>
              <p className="text-sm text-muted-foreground">
                {query
                  ? "Попробуйте другой запрос"
                  : "Создайте первое — это займёт пару минут"}
              </p>
            </div>
            {!query && (
              <Button asChild>
                <Link href="/kp/app/new">Создать КП</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <Link key={proposal.id} href={`/kp/app/p/${proposal.id}`}>
              <Card className="transition-colors hover:border-primary/60">
                <CardContent className="flex items-center justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{proposal.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(proposal.createdAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {proposal.engine === "claude" ? "AI" : "шаблон"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
