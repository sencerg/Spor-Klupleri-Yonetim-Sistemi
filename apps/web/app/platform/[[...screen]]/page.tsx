import { notFound } from "next/navigation";
import { AthleteCreate, AthleteDetail, AthleteOverview } from "@/components/platform-athletes";
import { ClubDetail, ClubForm, ClubList, Overview } from "@/components/platform-home";
import { getSession } from "@/lib/session";

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ screen?: string[] }>;
  searchParams: Promise<{ hata?: string; eklendi?: string; guncellendi?: string; ay?: string }>;
}) {
  const { screen } = await params;
  const query = await searchParams;
  const session = await getSession();
  if (!session) notFound();
  if (!screen?.length) return <Overview />;

  if (screen[0] === "kulup") {
    if (screen.length > 2) notFound();
    if (!screen[1]) return <ClubList />;
    if (screen[1] === "yeni") return <ClubForm error={query.hata} />;
    return <ClubDetail id={screen[1]} user={session.user} added={query.eklendi} notice={query.guncellendi} error={query.hata} />;
  }

  if (screen[0] === "sporcular") {
    if (screen.length > 2) notFound();
    if (!screen[1]) {
      return (
        <AthleteOverview
          month={query.ay}
          notice={query.eklendi || query.guncellendi}
          error={query.hata}
        />
      );
    }
    if (screen[1] === "yeni") return <AthleteCreate error={query.hata} />;
    return <AthleteDetail id={screen[1]} notice={query.guncellendi || query.eklendi} error={query.hata} />;
  }

  notFound();
}
