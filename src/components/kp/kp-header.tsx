"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { kpApi } from "@/lib/kp/client";
import type { AccountState } from "@/lib/kp/account";

export function KpHeader({ account }: { account: AccountState | null }) {
  const router = useRouter();

  const logout = async () => {
    await kpApi.logout();
    router.push("/kp");
    router.refresh();
  };

  return (
    <header className="kp-no-print border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/kp" className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5 text-primary" />
          <span>KPGen</span>
        </Link>

        <nav className="flex items-center gap-2">
          {account ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kp/app">Мои КП</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kp/app/billing">
                  Тариф
                  <Badge variant="secondary" className="ml-2">
                    {account.plan.name}
                  </Badge>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} title="Выйти">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kp/login">Войти</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/kp/login?mode=register">Начать бесплатно</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
