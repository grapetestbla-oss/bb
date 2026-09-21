import { getCurrentAccount } from "@/lib/kp/account";
import { KpHeader } from "@/components/kp/kp-header";

/**
 * Шапка для внутренних страниц KPGen. Лендинг её не использует — там свой
 * прозрачный навбар поверх видео (HeroNavbar).
 */
export async function KpTopBar() {
  const account = await getCurrentAccount();
  return <KpHeader account={account} />;
}
