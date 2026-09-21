import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KPGen — генератор коммерческих предложений",
  description:
    "Соберите коммерческое предложение по короткому брифу за пару минут: структура, этапы, стоимость и экспорт в PDF.",
};

export default function KpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
