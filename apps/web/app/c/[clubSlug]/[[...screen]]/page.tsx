import { notFound, redirect } from "next/navigation";
import { clubBySlug, screenPermission } from "@skys/domain";
import { ClubScreen } from "@/components/club-screens";
import { getSession, viewerFor } from "@/lib/session";
import { readState } from "@/lib/store";

export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string; screen?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubSlug, screen } = await params;
  const raw = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  const club = clubBySlug(clubSlug);
  if (!club) notFound();
  const segment = screen?.[0] ?? "";
  const personId = screen?.[1];
  if ((screen && screen.length > 2) || (personId && segment !== "sporcular")) notFound();
  if (!screenPermission(segment)) notFound();
  const state = readState();
  const brand = state.brands[club.id];
  const themed = {
    ...club,
    accent: brand?.accent ?? club.accent,
    accentSoft: brand?.accentSoft ?? club.accentSoft,
    motto: brand?.motto || club.motto,
  };
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    query[key] = Array.isArray(value) ? value[0] : value;
  }
  return (
    <ClubScreen
      club={themed}
      viewer={viewerFor(session, club.id)}
      segment={segment}
      personId={personId}
      query={query}
      notes={state.notes[club.id] ?? []}
      retried={state.retries}
    />
  );
}
