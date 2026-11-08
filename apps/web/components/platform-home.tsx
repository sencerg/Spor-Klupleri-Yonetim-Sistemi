import Link from "next/link";
import { notFound } from "next/navigation";
import { duesForMonth, formatTry, todayISO, users, type UserAccount } from "@skys/domain";
import { startSupport, updateClubLook } from "@/app/actions";
import { ClubMark, PageHeader, Panel, Stat, statusLabel, Table, Tag } from "@/components/bits";
import { ClubOpenForm } from "@/components/club-open-form";
import { clubById, listFacilities, listPeople, listStaff, listTeams, managedClubs } from "@/lib/live";
import { readState } from "@/lib/store";
import { headers } from "next/headers";
import { clubLoginUrl, clubPublicHost, hostPortSuffix } from "@/lib/tenant";

function ownerOf(clubId: string) {
  const live = readState().owners.find((owner) => owner.clubId === clubId);
  if (live) return { name: live.name, email: live.email };
  const user = users.find((account) => account.memberships.some((membership) => membership.role === "club_owner" && membership.clubId === clubId));
  return user ? { name: user.name, email: user.email } : undefined;
}

function given(itemId: string) {
  return readState().gearDeliveries
    .filter((row) => row.itemId === itemId)
    .reduce((sum, row) => sum + (row.count && row.count > 0 ? row.count : 1), 0);
}

function usage(clubId: string, user: UserAccount) {
  const viewer = { user };
  const state = readState();
  const people = listPeople(clubId, viewer);
  const athletes = people.filter((person) => person.kind === "athlete");
  const month = todayISO.slice(0, 7);
  const aidat = duesForMonth(athletes, month, todayISO, state.duePayments, state.dueOverrides)
    .reduce((sum, row) => sum + row.remaining, 0);
  const gearDebt = state.gearDeliveries
    .filter((row) => row.clubId === clubId)
    .reduce((sum, row) => {
      const paid = state.extraPayments.filter((item) => item.chargeId === row.chargeId).reduce((total, item) => total + item.amount, 0);
      return sum + Math.max(0, row.price - paid);
    }, 0);
  return {
    people,
    athletes,
    facilities: listFacilities(clubId, viewer),
    teams: listTeams(clubId, viewer),
    staff: listStaff(clubId, viewer),
    gear: state.gearItems.filter((item) => item.clubId === clubId),
    deliveries: state.gearDeliveries.filter((row) => row.clubId === clubId),
    aidat,
    gearDebt,
  };
}

export function Overview() {
  const rows = managedClubs().map((club) => ({ club, owner: ownerOf(club.id) }));
  const totals = rows.map((row) => usage(row.club.id, { id: "platform", name: "Sistem", email: "", memberships: [{ role: "platform_super" }] }));
  const athletes = totals.reduce((sum, row) => sum + row.athletes.length, 0);
  const facilities = totals.reduce((sum, row) => sum + row.facilities.length, 0);
  return (
    <div>
      <PageHeader kicker="Sistem" title="Genel durum" description="Açılan kulüpler burada durur. Bir kulüp kullanmaya başlayınca detayına girilir. İstenirse kulübün kendi ekranı da açılır.">
        <Link href="/platform/kulup/yeni" className="btn-club">Kulüp aç</Link>
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Kulüp" value={String(rows.length)} hint="Sistemde açık kulüpler" soft />
        <Stat label="Sporcu" value={String(athletes)} hint="Kulüplerin kayıtları" />
        <Stat label="Tesis" value={String(facilities)} hint="Depo olarak kullanılan yerler" />
      </div>
      <div className="mt-4">
        <ClubList heading={false} />
      </div>
    </div>
  );
}

export async function ClubList({ heading = true }: { heading?: boolean }) {
  const rows = managedClubs();
  const suffix = hostPortSuffix((await headers()).get("host"));
  return (
    <div>
      {heading ? (
        <PageHeader kicker="Sistem" title="Kulüpler" description="Sistem yöneticisi kulübü açar. Sahip, kendi e-postası ve deneme şifresiyle girer.">
          <Link href="/platform/kulup/yeni" className="btn-club">Kulüp aç</Link>
        </PageHeader>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((club) => {
          const owner = ownerOf(club.id);
          const row = usage(club.id, { id: "platform", name: "Sistem", email: "", memberships: [{ role: "platform_super" }] });
          return (
            <article key={club.id} className="admin-card">
              <div className="h-1.5" style={{ background: club.accent }} />
              <div className="admin-card-body">
                <div className="flex items-center gap-3">
                  <ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} size="lg" />
                  <div>
                    <div className="page-kicker">{club.city}{club.district ? ` · ${club.district}` : ""}</div>
                    <h2 className="mt-1 text-lg font-extrabold text-[var(--heading)]">{club.name}</h2>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {clubPublicHost(club.slug)}.localhost{suffix}
                  {owner ? ` · ${owner.name} · ${owner.email}` : " · Sahip yok"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag>{row.athletes.length} sporcu</Tag>
                  <Tag>{row.facilities.length} tesis</Tag>
                  <Tag>{row.teams.length} takım</Tag>
                  <Tag>{row.staff.length} personel</Tag>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/platform/kulup/${club.id}`} className="btn-line">Detay</Link>
                  <form action={startSupport.bind(null, club.id)}>
                    <button className="btn-club">Kulübün ekranına gir</button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export async function ClubForm({ error }: { error?: string }) {
  const suffix = hostPortSuffix((await headers()).get("host"));
  return (
    <div>
      <PageHeader kicker="Sistem" title="Kulüp aç" description="İl ve ilçe listeden seçilir. Logo yüklenir, renkler logodan gelir. Açılınca kulübün kendi girişi hazır olur.">
        <span className="flex flex-wrap gap-2">
          <button form="kulup-ac" className="btn-club">Kaydet</button>
          <Link href="/platform/kulup" className="admin-text-btn">Liste</Link>
        </span>
      </PageHeader>
      <Panel>
        <ClubOpenForm error={error} portSuffix={suffix} />
      </Panel>
    </div>
  );
}

export async function ClubDetail({ id, user, added, notice, error }: { id: string; user: UserAccount; added?: string; notice?: string; error?: string }) {
  const club = managedClubs().find((item) => item.id === id) ?? clubById(id);
  const loginUrl = club ? clubLoginUrl(club.slug, (await headers()).get("host")) : "";
  if (!club || !managedClubs().some((item) => item.id === club.id)) notFound();
  const owner = ownerOf(club.id);
  const row = usage(club.id, user);
  return (
    <div>
      <PageHeader
        kicker="Sistem"
        title={club.name}
        description={`${club.city}${club.district ? ` · ${club.district}` : ""}. Detay, kulübün girdiği kayıtlardır.`}
        mark={<ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} size="lg" />}
      >
        <span className="flex flex-wrap gap-2">
          <form action={startSupport.bind(null, club.id)}>
            <button className="btn-club">Kulübün ekranına gir</button>
          </form>
          <Link href="/platform/kulup" className="btn-line">Liste</Link>
        </span>
      </PageHeader>
      {added ? (
        <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">
          Kulüp açıldı. Giriş: {loginUrl} · Kullanıcı adı {clubPublicHost(club.slug)} · Sahip {owner?.email}
        </p>
      ) : null}
      {notice ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Görünüm güncellendi.</p> : null}
      {error === "logo" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Logo PNG veya JPEG olmalı. En fazla 2 MB.</p> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Sporcu" value={String(row.athletes.length)} hint="Kayıtlı sporcu" soft />
        <Stat label="Tesis" value={String(row.facilities.length)} hint="Açılmış tesis" />
        <Stat label="Bu ay aidat kalan" value={formatTry(row.aidat)} hint={todayISO.slice(0, 7)} />
        <Stat label="Teslim borcu" value={formatTry(row.gearDebt)} hint="Alınmayan ürün ücreti" />
      </div>
      <div className="mt-4 grid gap-4">
        <Panel title="Sahip">
          <p className="text-sm">{owner ? `${owner.name} · ${owner.email}` : "Sahip yok"}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Kullanıcı adı: <span className="font-semibold text-[var(--heading)]">{clubPublicHost(club.slug)}</span>
            {" · "}Giriş: {loginUrl}
          </p>
        </Panel>
        <Panel title="Görünüm">
          <form action={updateClubLook.bind(null, club.id)} encType="multipart/form-data" className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm md:col-span-2">
              Motto
              <input name="motto" defaultValue={club.motto} maxLength={80} className="field" />
            </label>
            <label className="grid gap-1 text-sm">
              Vurgu
              <input name="accent" type="color" defaultValue={club.accent} className="field h-11" />
            </label>
            <label className="grid gap-1 text-sm">
              Açık
              <input name="accentSoft" type="color" defaultValue={club.accentSoft} className="field h-11" />
            </label>
            <label className="grid gap-1 text-sm">
              Zemin
              <input name="splash" type="color" defaultValue={club.splash} className="field h-11" />
            </label>
            <label className="grid gap-1 text-sm">
              Logo
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="field" />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              {club.logo ? <img src={club.logo} alt="" className="h-14 w-14 rounded-full bg-white object-cover" /> : null}
              <button className="btn-club">Görünümü kaydet</button>
            </div>
          </form>
        </Panel>
        <Panel title="Sporcular">
          {row.athletes.length ? (
            <Table
              columns={["Sporcu", "Takım", "Durum"]}
              rows={row.athletes.map((person) => [
                person.name,
                person.teamId ? row.teams.find((team) => team.id === person.teamId)?.name ?? "Takım" : "Takımsız",
                statusLabel[person.status] ?? person.status,
              ])}
            />
          ) : <p className="text-sm text-[var(--muted)]">Henüz sporcu yok.</p>}
        </Panel>
        <Panel title="Tesisler">
          {row.facilities.length ? (
            <Table columns={["Tesis", "Tür", "Kapasite"]} rows={row.facilities.map((place) => [place.name, place.kind, String(place.capacity)])} />
          ) : <p className="text-sm text-[var(--muted)]">Henüz tesis yok.</p>}
        </Panel>
        <Panel title="Personel">
          {row.staff.length ? (
            <Table columns={["Personel", "Görev"]} rows={row.staff.map((member) => [member.name, member.duty || "—"])} />
          ) : <p className="text-sm text-[var(--muted)]">Henüz personel yok.</p>}
        </Panel>
        <Panel title="Stok">
          {row.gear.length ? (
            <Table
              columns={["Ürün", "Beden", "Adet", "Kalan"]}
              rows={row.gear.map((item) => {
                const handed = given(item.id);
                const qty = item.qty;
                return [item.name, item.size || "—", typeof qty === "number" ? String(qty) : "—", typeof qty === "number" ? String(Math.max(0, qty - handed)) : "—"];
              })}
            />
          ) : <p className="text-sm text-[var(--muted)]">Henüz stok yok.</p>}
        </Panel>
        <Panel title="Teslim">
          <p className="text-sm text-[var(--muted)]">{row.deliveries.length ? `${row.deliveries.length} teslim kaydı.` : "Henüz teslim yok."}</p>
        </Panel>
      </div>
    </div>
  );
}
