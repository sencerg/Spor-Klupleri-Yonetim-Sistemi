import Link from "next/link";
import { redirect } from "next/navigation";
import { channelClubs, clubById, roleLabels } from "@skys/domain";
import { getSession } from "@/lib/session";

export default async function PickClubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const memberships = channelClubs(session.user, "web");
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <div className="auth-kicker">Yeni Ufuklar</div>
      <h1 className="page-title mt-2">Hangi kayıt?</h1>
      <p className="page-subtitle">
        {session.user.name}, aynı kişi birden fazla kulüpte farklı rolle durabilir. Seçtiğin kulübün rengi ve kayıtları açılır.
      </p>
      <div className="mt-5 grid gap-3">
        {memberships.map((membership) => {
          const club = clubById(membership.clubId ?? "");
          if (!club) return null;
          return (
            <Link key={club.id} href={`/c/${club.slug}`} className="demo-row">
              {club.logo ? (
                <img src={club.logo} alt="" className="admin-logo" />
              ) : (
                <span className="admin-mark" style={{ background: club.accent }}>
                  {club.monogram}
                </span>
              )}
              <span>
                <span className="block text-sm font-semibold text-[var(--heading)]">{club.name}</span>
                <span className="block text-xs text-[var(--muted)]">{roleLabels[membership.role]}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
