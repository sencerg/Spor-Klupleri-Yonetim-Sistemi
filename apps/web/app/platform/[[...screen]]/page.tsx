import { notFound } from "next/navigation";
import { formatTry, plans } from "@skys/domain";
import { platformClubs } from "@/lib/live";
import { startSupport } from "@/app/actions";
import { PageHeader, Panel, Stat, Tag } from "@/components/bits";

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  const { screen } = await params;
  const segment = screen?.[0] ?? "";
  if (screen && screen.length > 1) notFound();
  if (segment === "") return <Overview />;
  if (segment === "kulupler") return <Clubs />;
  if (segment === "paketler") return <Plans />;
  notFound();
}

function Overview() {
  const rows = platformClubs();
  return (
    <div>
      <section className="section-banner">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-white/70">Platform</div>
          <h1>Yeni Ufuklar</h1>
          <p>Paket, deneme ve kulüp açılışı burada. Sporcu listesi ancak destek oturumuyla açılır.</p>
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Yeni Ufuklar" value={String(rows.length)} hint="Örnek kayıt" soft />
        <Stat label="Deneme" value={String(rows.filter((row) => row.club.status === "trial").length)} hint="Süresi dolmamış deneme" />
        <Stat
          label="Kişi"
          value={String(rows.reduce((sum, row) => sum + row.peopleCount, 0))}
          hint="Kulüplere dağılmış sporcu ve üye"
        />
      </div>
      <div className="mt-4">
        <Clubs />
      </div>
    </div>
  );
}

function Clubs() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {platformClubs().map((row) => (
        <article key={row.club.id} className="admin-card">
          <div className="h-1.5" style={{ background: row.club.accent }} />
          <div className="admin-card-body">
            <div className="flex items-center gap-3">
              {row.club.logo ? (
                <img src={row.club.logo} alt="" className="admin-logo" />
              ) : (
                <span className="admin-mark" style={{ background: row.club.accent }}>{row.club.monogram}</span>
              )}
              <div>
                <div className="page-kicker">{row.club.city}</div>
                <h2 className="mt-1 text-lg font-extrabold text-[var(--heading)]">{row.club.name}</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">{row.club.motto}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag tone={row.club.status === "trial" ? "warn" : "good"}>
                {row.club.status === "trial" ? "Deneme" : "Aktif"}
              </Tag>
              <Tag>{row.plan?.name}</Tag>
              <Tag>
                {row.branchCount} şube · {row.sportCount} branş · {row.peopleCount} kişi
              </Tag>
            </div>
            <form action={startSupport.bind(null, row.club.id)} className="mt-4">
              <button className="btn-club" style={{ background: row.club.accent }}>
                Destek oturumu aç
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}

function Plans() {
  return (
    <div>
      <PageHeader kicker="Platform" title="Paketler" description="Yeni kulüp koda dokunmadan bir pakete bağlanır. Limitler şube, kişi ve push adedidir." />
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((plan) => (
          <Panel key={plan.id} title={plan.name}>
            <div className="kpi-value">{formatTry(plan.monthly)}</div>
            <p className="mt-1 text-xs text-[var(--muted)]">aylık</p>
            <p className="mt-3 text-sm leading-6">{plan.blurb}</p>
            <div className="mt-3 space-y-1 text-sm text-[var(--muted)]">
              <div>{plan.branches} şube</div>
              <div>{plan.people} kişi</div>
              <div>{plan.push} push / ay</div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
