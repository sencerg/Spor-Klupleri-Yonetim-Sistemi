import { redirect } from "next/navigation";
import { isSuper } from "@skys/domain";
import { Frame, SideNav, TopBar } from "@/components/shell";
import { getSession } from "@/lib/session";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSuper(session.user)) redirect("/");
  return (
    <Frame
      accent="#12245c"
      accentSoft="#e7ecf8"
      topbar={<TopBar title="Yeni Ufuklar" userName={session.user.name} userRole="Süper admin" />}
      sidebar={
        <SideNav
          brand="Yeni Ufuklar"
          monogram="YU"
          detail="Platform"
          logo="/yeni-ufuklar.png"
          current="/platform"
          items={[
            { href: "/platform", label: "Genel durum", group: "Platform" },
            { href: "/platform/kulupler", label: "Yeni Ufuklar", group: "Platform" },
            { href: "/platform/paketler", label: "Paketler", group: "Platform" },
          ]}
        />
      }
    >
      {children}
    </Frame>
  );
}
