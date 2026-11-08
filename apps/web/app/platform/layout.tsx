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
      accent="#00b7d6"
      accentSoft="#d9f7fc"
      topbar={<TopBar title="Sistem yöneticisi" userName={session.user.name} userRole="Sistem yöneticisi" />}
      sidebar={
        <SideNav
          brand="AllPlay360"
          monogram="A"
          detail="Sistem"
          logo="/allplay360.png"
          current="/platform"
          items={[
            { href: "/platform", label: "Genel durum", group: "Sistem" },
            { href: "/platform/kulup", label: "Kulüpler", group: "Sistem" },
            { href: "/platform/sporcular", label: "Sporcular", group: "Sistem" },
          ]}
        />
      }
    >
      {children}
    </Frame>
  );
}
