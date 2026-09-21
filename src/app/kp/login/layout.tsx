import { KpTopBar } from "@/components/kp/kp-top-bar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <KpTopBar />
      {children}
    </>
  );
}
