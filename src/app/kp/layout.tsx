import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/kp/account";
import { KpHeader } from "@/components/kp/kp-header";

export const metadata: Metadata = {
  title: "KPGen — генератор коммерческих предложений",
  description:
    "Соберите коммерческое предложение по короткому брифу за пару минут: структура, этапы, стоимость и экспорт в PDF.",
};

export default async function KpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getCurrentAccount();

  return (
    <div className="min-h-screen bg-background">
      <KpHeader account={account} />
      {children}
    </div>
  );
}
