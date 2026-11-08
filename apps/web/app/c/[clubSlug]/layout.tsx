import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  canEnterClub,
  clubScreens,
  can,
  isSuper,
  membershipFor,
  roleLabels,
} from "@skys/domain";
import { stopSupport } from "@/app/actions";
import { Frame, SideNav, TopBar } from "@/components/shell";
import { getSession, viewerFor } from "@/lib/session";
import { readState } from "@/lib/store";
import { branchName } from "@skys/domain";
import { clubBySlug } from "@/lib/live";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const current = (await headers()).get("x-pathname") ?? "/";
  const session = await getSession();
  if (!session) redirect("/login");
  const club = clubBySlug(clubSlug);
  if (!club) notFound();
  if (isSuper(session.user) && session.supportClubId !== club.id) redirect("/platform");
  const viewer = viewerFor(session, club.id);
  if (!canEnterClub(viewer, club.id)) redirect("/login");
  const brand = readState().brands[club.id];
  const accent = brand?.accent ?? club.accent;
  const accentSoft = brand?.accentSoft ?? club.accentSoft;
  const membership = membershipFor(session.user, club.id);
  const items = clubScreens
    .filter((screen) => can(viewer, club.id, screen.id))
    .map((screen) => ({
      href: screen.href ? `/${screen.href}` : "/",
      label: screen.id === "club.settings" ? `${club.name} Ayarları` : screen.label,
      group: screen.group,
    }));
  const support = viewer.supportClubId === club.id;

  const role = support ? "Platform destek" : membership ? roleLabels[membership.role] : "Kulüp";
  const scope = membership?.branchIds?.length ? membership.branchIds.map((id) => branchName(id)).join(", ") : club.district;

  return (
    <Frame
      accent={accent}
      accentSoft={accentSoft}
      topbar={
        <TopBar
          title={club.name}
          userName={session.user.name}
          userRole={role}
        />
      }
      banner={
        support ? (
          <form action={stopSupport} className="flex items-center justify-between gap-3 bg-[#101a42] px-6 py-2 text-sm text-white">
            <span>Destek oturumu · {club.name} kayıtları denetimli olarak açık</span>
            <button className="rounded-md bg-white/15 px-3 py-1">Kapat</button>
          </form>
        ) : null
      }
      sidebar={<SideNav brand={club.name} monogram={club.monogram} detail={scope} items={items} logo={club.logo} current={current} />}
    >
      {children}
    </Frame>
  );
}
