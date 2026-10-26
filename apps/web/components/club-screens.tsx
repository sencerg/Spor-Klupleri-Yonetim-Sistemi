import type { ReactNode } from "react";
import Link from "next/link";
import {
  athleteDevelopment,
  attention,
  bookedCount,
  can,
  canComposeNotice,
  canEditRoster,
  canEditStructure,
  clubScreens,
  coachLeave,
  clubConflictIds,
  dayLabel,
  defaultGrants,
  duesForMonth,
  feeLabel,
  formatDay,
  monthLabel,
  formatLong,
  formatTry,
  grantsOrDefault,
  isOwner,
  listAudit,
  listCustody,
  listInvoices,
  listNotices,
  isCoachDuty,
  listStock,
  listTrainings,
  listWarehouses,
  membershipFor,
  rosterFor,
  attendanceFor,
  scopeLabels,
  sessionBookings,
  staffRoles,
  staffTitles,
  seasonForSport,
  todayISO,
  productVersions,
  waitlist,
  windowDays,
  type Club,
  type Viewer,
} from "@skys/domain";
import { createFacility, createPerson, createPrice, createSport, createTeam, liftAthlete, markRetried, placeAthlete, queueNotice, removeFacility, removePrice, renameSport, saveAthleteTrack, saveBrand, saveGrants, saveStaff, updateFacility, updatePerson, updatePrice } from "@/app/actions";
import { branchName, directory, facilityName, listBranches, listFacilities, listGuardians, listPeople, listPrices, listSeasons, listSports, listStaff, listTeams, listYearSeasons, nameOf, personProfile, sportName, staffName, teamName } from "@/lib/live";
import { AttendanceBoard } from "@/components/attendance-board";
import { FacilityRow } from "@/components/facility-row";
import { AthleteForm, type RegistrationInitial } from "@/components/athlete-form";
import { PeopleBrowser, SportSeasonField } from "@/components/roster-search";
import { NoAccess, PageHeader, Panel, Stat, statusLabel, statusTone, Table, Tag } from "@/components/bits";
import { athleteSheet, registrationDate, yearsSince } from "@/lib/athlete-sheet";
import { DuesScreen } from "@/components/dues-board";
import { guardianLabel } from "@/lib/search";
import { readState } from "@/lib/store";

const themes = [
  { name: "Yeni Ufuklar", accent: "#c8102e", accentSoft: "#fdecee" },
  { name: "Lacivert", accent: "#12245c", accentSoft: "#e7ecf8" },
  { name: "Parke", accent: "#e4572e", accentSoft: "#fde7df" },
  { name: "Deniz", accent: "#0f766e", accentSoft: "#d7f3ef" },
  { name: "Bordo", accent: "#7a1f3d", accentSoft: "#f8dbe3" },
];

export function ClubScreen({
  club,
  viewer,
  segment,
  personId,
  query,
  notes,
  retried,
}: {
  club: Club;
  viewer: Viewer;
  segment: string;
  personId?: string;
  query: Record<string, string | undefined>;
  notes: { title: string; audience: string }[];
  retried: string[];
}) {
  const permission = clubScreens.find((screen) => screen.href === segment)?.id;
  if (!permission || !can(viewer, club.id, permission)) {
    return <NoAccess label={clubScreens.find((screen) => screen.href === segment)?.label ?? "Ekran"} />;
  }
  if (segment === "sporcular" && personId) return <PersonScreen club={club} viewer={viewer} personId={personId} query={query} />;
  switch (segment) {
    case "":
      return <Dashboard club={club} viewer={viewer} />;
    case "ayarlar":
      return <Settings club={club} viewer={viewer} />;
    case "subeler":
      return <Branches club={club} viewer={viewer} query={query} />;
    case "branslar":
      return <Sports club={club} viewer={viewer} query={query} />;
    case "sporcular":
      return <People club={club} viewer={viewer} query={query} />;
    case "takimlar":
      return <Teams club={club} viewer={viewer} query={query} />;
    case "takvim":
      return <Calendar club={club} viewer={viewer} selected={query.seans} />;
    case "yoklama":
      return <RollCall club={club} viewer={viewer} selected={query.seans} />;
    case "seanslar":
      return <Sessions club={club} viewer={viewer} />;
    case "stok":
      return <Stock club={club} viewer={viewer} />;
    case "zimmet":
      return <Custody club={club} />;
    case "fiyatlar":
      return <Prices club={club} viewer={viewer} query={query} />;
    case "aidat":
      return <DuesScreen club={club} viewer={viewer} query={query} />;
    case "personel":
      return <StaffScreen club={club} viewer={viewer} query={query} />;
    case "bildirimler":
      return <Notices club={club} viewer={viewer} notes={notes} retried={retried} />;
    case "raporlar":
      return <Reports club={club} viewer={viewer} />;
    case "gecmis":
      return <Audit club={club} support={viewer.supportClubId === club.id} />;
    case "yetkiler":
      return <Grants club={club} viewer={viewer} />;
    case "versionlar":
      return <Versions />;
    default:
      return <NoAccess label="Ekran" />;
  }
}

function Dashboard({ club, viewer }: { club: Club; viewer: Viewer }) {
  const people = listPeople(club.id, viewer);
  const sessions = listTrainings(club.id, viewer).filter((session) => session.date === todayISO);
  const overdue = listInvoices(club.id, viewer).filter((invoice) => invoice.status === "overdue");
  const low = listStock(club.id, viewer).filter((item) => item.qty < item.min);
  const items = attention(club.id, viewer);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const membership = membershipFor(viewer.user, club.id);
  return (
    <div>
      <section className="section-banner">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-white/70">{formatLong(todayISO)}</div>
          <h1>
            {hello}, {viewer.user.name.split(" ")[0]}
          </h1>
          <p>{club.motto}</p>
        </div>
        {membership?.branchIds?.length ? (
          <div className="rounded-md bg-white/15 px-3 py-2 text-sm font-semibold">
            {membership.branchIds.map(branchName).join(", ")}
          </div>
        ) : club.logo ? (
          <img src={club.logo} alt="" className="h-16 w-16 rounded-full bg-white object-cover" />
        ) : (
          <div className="font-display text-3xl font-extrabold tracking-tight">{club.monogram}</div>
        )}
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Bugünkü seans" value={String(sessions.length)} hint="Takvimde görünen kayıt" soft />
        <Stat label="Kadro" value={String(people.length)} hint="Bu kapsamda sporcu ve üye" />
        {can(viewer, club.id, "finance.view") ? (
          <Stat label="Gecikmiş aidat" value={String(overdue.length)} hint={overdue.length ? "Tahsilat bekliyor" : "Açık gecikme yok"} />
        ) : (
          <Stat label="Şube" value={String(listBranches(club.id, viewer).length)} hint="Görebileceğin tesis" />
        )}
        {can(viewer, club.id, "stock.view") ? (
          <Stat label="Düşük stok" value={String(low.length)} hint={low.length ? "Minimumun altında" : "Stok eşiği tamam"} />
        ) : (
          <Stat label="Branş" value={String(listSports(club.id).length)} hint="Kulübün tanımlı branşı" />
        )}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        {can(viewer, club.id, "schedule.view") ? (
          <Week club={club} viewer={viewer} />
        ) : can(viewer, club.id, "finance.view") ? (
          <Panel title="Açık tahsilat">
            <InvoiceList club={club} viewer={viewer} onlyOpen />
          </Panel>
        ) : (
          <Panel title="Kapsam">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Bu rol takvimi görmez. Açık işler sağdaki dikkat listesinde ve yetkili ekranlarda durur.
            </p>
          </Panel>
        )}
        <Panel title="Dikkat">
          <div className="space-y-3">
            {items.length === 0 ? <p className="text-sm text-[var(--muted)]">Bu kapsamda bekleyen uyarı yok.</p> : null}
            {items.map((item) => (
              <Link key={item.title} href={`/${item.href}`} className="block rounded-xl bg-[var(--paper)] px-3 py-3">
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="mt-1 text-sm leading-5 text-[var(--muted)]">{item.detail}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Week({ club, viewer }: { club: Club; viewer: Viewer }) {
  const days = windowDays(1, 5);
  const sessions = listTrainings(club.id, viewer);
  const conflicts = clubConflictIds(club.id);
  return (
    <Panel title="Hafta" action={<Link className="text-xs font-semibold text-[var(--muted)]" href={`/takvim`}>Takvimi aç</Link>}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day}>
              <div className="mb-2 text-xs font-semibold text-[var(--muted)]">{dayLabel(day)}</div>
              <div className="space-y-2">
                {sessions
                  .filter((session) => session.date === day)
                  .map((session) => (
                    <Link
                      key={session.id}
                      href={`/takvim?seans=${session.id}`}
                      className="block rounded-xl px-2 py-2 text-xs leading-5"
                      style={{ background: conflicts.has(session.id) ? "#f8e4e1" : "var(--club-soft)" }}
                    >
                      <div className="font-semibold">{session.start}</div>
                      <div>{session.title}</div>
                      <div className="text-[var(--muted)]">{facilityName(session.facilityId)}</div>
                      {conflicts.has(session.id) ? <div className="font-semibold text-[#9f2d2d]">Çakışma</div> : null}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Settings({ club, viewer }: { club: Club; viewer: Viewer }) {
  const editable = membershipFor(viewer.user, club.id)?.role === "club_owner" || membershipFor(viewer.user, club.id)?.role === "club_manager";
  return (
    <div>
      <PageHeader kicker="Genel yönetim" title={`${club.name} Ayarları`} description="Renk ve motto kayıttan okunur. Açık zemin kalır; vurgu kulübün kendi renginden gelir." />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Görünen kimlik">
          <form action={saveBrand.bind(null, club.id)} className="grid gap-4">
            <label className="grid gap-1 text-sm">
              Motto
              <input name="motto" defaultValue={club.motto} disabled={!editable} className="field" />
            </label>
            <div className="grid gap-2">
              {themes.map((theme) => (
                <label key={theme.name} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                  <input type="radio" name="theme" value={`${theme.accent}|${theme.accentSoft}`} defaultChecked={club.accent.toLowerCase() === theme.accent} disabled={!editable} />
                  <span className="h-4 w-4 rounded-full" style={{ background: theme.accent }} />
                  {theme.name}
                </label>
              ))}
            </div>
            {editable ? (
              <button className="btn-club">Rengi kaydet</button>
            ) : (
              <p className="text-sm text-[var(--muted)]">Rengi kulüp sahibi veya yöneticisi değiştirir.</p>
            )}
          </form>
        </Panel>
        <Panel title="Seans kuralları">
          <dl className="grid gap-3 text-sm">
            <Row label="İptal penceresi" value={`Seans saatinden ${club.cancelHours} saat önce`} />
            <Row label="Gelmeme" value={club.noShowConsumesCredit ? "Paket hakkından düşülür" : "Hak düşülmez"} />
            <Row label="Bekleme listesi" value={`İptalde ${club.waitlistMinutes} dakika geçerli hak`} />
            <Row label="İletişim" value={`${club.phone} · ${club.email}`} />
            <Row label="Ünvan" value={club.legalName} />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

const facilityKinds = [
  { id: "salon", label: "Salon" },
  { id: "saha", label: "Saha" },
  { id: "studyo", label: "Stüdyo" },
  { id: "havuz", label: "Havuz" },
] as const;

function Branches({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const facilities = listFacilities(club.id, viewer).filter((facility) => !facility.branchId);
  const owner = isOwner(viewer, club.id);
  const programIds = new Set(listTrainings(club.id, viewer).map((session) => session.facilityId));
  const editing = query.kayit && query.kayit !== "yeni" ? facilities.find((facility) => facility.id === query.kayit) : undefined;
  if (owner && (query.kayit === "yeni" || editing)) {
    return (
      <div>
        <PageHeader kicker="Genel yönetim" title={editing ? editing.name : "Yeni tesis"} description="Ad, tür ve kapasite yazılır. Programı olan tesis silinemez.">
          <Link href="/subeler" className="btn-club">Liste</Link>
        </PageHeader>
        <Saved query={query} />
        <Panel title={editing ? "Tesis düzelt" : "Yeni tesis"} action={<button type="submit" form="tesis-kayit" className="btn-club">Kaydet</button>}>
          <form id="tesis-kayit" action={editing ? updateFacility.bind(null, club.id, editing.id) : createFacility.bind(null, club.id)} className="grid gap-3 md:grid-cols-3">
            <Field label="Ad">
              <input name="name" required defaultValue={editing?.name} placeholder="Ana salon" className={fieldClass} />
            </Field>
            <Field label="Tür">
              <select name="kind" className={fieldClass} defaultValue={editing?.kind ?? "salon"}>
                {facilityKinds.map((kind) => (
                  <option key={kind.id} value={kind.id}>{kind.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Kapasite">
              <input name="capacity" type="number" min={1} max={500} defaultValue={editing?.capacity ?? 30} required className={fieldClass} />
            </Field>
          </form>
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader
        kicker="Genel yönetim"
        title="Tesisler"
        description="Liste buradadır. Yeni tesis sağ üstten açılır. Satırdan düzenlenir. Programı olan tesis silinemez."
      >
        {owner ? <Link href="/subeler?kayit=yeni" className="btn-club">Tesisi ekle</Link> : null}
      </PageHeader>
      <Saved query={query} />
      {!owner ? <p className="mb-4 text-sm text-[var(--muted)]">Tesis kaydını kulüp sahibi açar ve düzenler.</p> : null}
      <section className="admin-card">
        <div className="admin-card-body">
          {facilities.length ? (
            owner ? (
              <div className="space-y-2">
                {facilities.map((facility) => (
                  <FacilityRow
                    key={facility.id}
                    inUse={programIds.has(facility.id)}
                    facility={facility}
                    editHref={`/subeler?kayit=${facility.id}`}
                    removeAction={removeFacility.bind(null, club.id, facility.id)}
                  />
                ))}
              </div>
            ) : (
              <Table
                columns={["Tesis", "Tür", "Kapasite"]}
                rows={facilities.map((facility) => [
                  facility.name,
                  facilityKinds.find((kind) => kind.id === facility.kind)?.label ?? facility.kind,
                  String(facility.capacity),
                ])}
              />
            )
          ) : (
            <p className="text-sm text-[var(--muted)]">Henüz tesis yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Sports({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const sports = listSports(club.id);
  const seasons = listSeasons(club.id);
  const yearSeasons = listYearSeasons(club.id);
  const selected = yearSeasons.find((season) => season.name === "2026-2027") ?? yearSeasons[0];
  const editable = canEditStructure(viewer, club.id);
  const editing = query.kayit && query.kayit !== "yeni" ? sports.find((sport) => sport.id === query.kayit) : undefined;
  if (editable && (query.kayit === "yeni" || editing)) {
    const season = editing ? seasonForSport(editing, seasons) : undefined;
    return (
      <div>
        <PageHeader kicker="Genel yönetim" title={editing ? editing.name : "Yeni branş"} description="Ad yazılır. Yeni branşta sezon listeden seçilir. Sezonu sistem yöneticisi açar.">
          <Link href="/branslar" className="btn-club">Liste</Link>
        </PageHeader>
        <Saved query={query} />
        <Panel title={editing ? "Adı düzelt" : "Yeni branş"} action={<button type="submit" form="brans-kayit" className="btn-club">Kaydet</button>}>
          <form id="brans-kayit" action={editing ? renameSport.bind(null, club.id, editing.id) : createSport.bind(null, club.id)} className="grid gap-3 md:grid-cols-2">
            <Field label="Branş adı">
              <input name="name" required defaultValue={editing?.name} placeholder="Hentbol" className={fieldClass} />
            </Field>
            {editing ? (
              <Field label="Sezon">
                <input readOnly tabIndex={-1} value={season?.name ?? "Sezon seçilmedi"} className={`${fieldClass} text-[var(--muted)]`} />
              </Field>
            ) : (
              <Field label="Sezon">
                <select name="seasonId" className={fieldClass} defaultValue={selected?.id}>
                  {yearSeasons.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <p className="text-sm text-[var(--muted)] md:col-span-2">Sezonu sistem yöneticisi açar. Sezon elle yazılmaz.</p>
          </form>
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="Genel yönetim" title="Branşlar ve sezonlar" description="Liste buradadır. Yeni branş sağ üstten açılır. Ad satırdan düzeltilir. Sezonu sistem yöneticisi açar.">
        {editable ? <Link href="/branslar?kayit=yeni" className="btn-club">Branş ekle</Link> : null}
      </PageHeader>
      <Saved query={query} />
      <section className="admin-card">
        <div className="admin-card-body">
          {sports.length ? (
            <Table
              columns={editable ? ["Branş", "Sezon", ""] : ["Branş", "Sezon"]}
              rows={sports.map((sport) => {
                const season = seasonForSport(sport, seasons);
                const cells = [sport.name, season?.name ?? "Sezon seçilmedi"];
                return editable ? [...cells, <Link key={sport.id} href={`/branslar?kayit=${sport.id}`} className="admin-text-btn">Düzelt</Link>] : cells;
              })}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Henüz branş yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Prices({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const prices = listPrices(club.id);
  const people = listPeople(club.id, viewer);
  const editable = canEditStructure(viewer, club.id);
  const editing = query.kayit && query.kayit !== "yeni" ? prices.find((price) => price.id === query.kayit) : undefined;
  if (editable && (query.kayit === "yeni" || editing)) {
    return (
      <div>
        <PageHeader kicker="İşletme yönetimi" title={editing ? editing.name : "Yeni fiyat"} description="Ad ve tutar yazılır. Sporcu kaydı bu listeden seçer.">
          <Link href="/fiyatlar" className="btn-club">Liste</Link>
        </PageHeader>
        <Saved query={query} />
        <Panel title={editing ? "Fiyatı düzelt" : "Yeni fiyat"} action={<button type="submit" form="fiyat-kayit" className="btn-club">Kaydet</button>}>
          <form id="fiyat-kayit" action={editing ? updatePrice.bind(null, club.id, editing.id) : createPrice.bind(null, club.id)} className="grid gap-3 md:grid-cols-2">
            <Field label="Ad">
              <input name="name" required defaultValue={editing?.name} placeholder="Aylık basketbol" className={fieldClass} />
            </Field>
            <Field label="Tutar">
              <input name="amount" type="number" min={0} required defaultValue={editing?.amount} placeholder="8000" className={fieldClass} />
            </Field>
          </form>
        </Panel>
      </div>
    );
  }
  const confirming = prices.find((price) => price.id === query.sil);
  const confirmingUsed = confirming ? people.some((person) => person.priceId === confirming.id) : false;
  return (
    <div>
      <PageHeader kicker="İşletme yönetimi" title="Fiyatlar" description="Liste buradadır. Yeni fiyat sağ üstten açılır. Satırdan düzeltilir. Kayıtlarda kullanılan fiyat silinemez.">
        {editable ? <Link href="/fiyatlar?kayit=yeni" className="btn-club">Fiyat ekle</Link> : null}
      </PageHeader>
      <Saved query={query} />
      {!editable ? <p className="mb-4 text-sm text-[var(--muted)]">Fiyatı kulüp sahibi veya yöneticisi açar.</p> : null}
      {editable && confirming && !confirmingUsed ? (
        <form action={removePrice.bind(null, club.id, confirming.id)} className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
          <p><span className="font-semibold">“{confirming.name}”</span> silinecek.</p>
          <div className="mt-3 flex gap-3">
            <a className="admin-text-btn" href="/fiyatlar">Vazgeç</a>
            <input type="hidden" name="onay" value="sil" />
            <button className="btn-club">Sil</button>
          </div>
        </form>
      ) : null}
      <section className="admin-card">
        <div className="admin-card-body">
          {prices.length ? (
            <Table
              columns={editable ? ["Fiyat", "Tutar", ""] : ["Fiyat", "Tutar"]}
              rows={prices.map((price) => {
                const used = people.some((person) => person.priceId === price.id);
                const cells = [price.name, formatTry(price.amount)];
                if (!editable) return cells;
                return [
                  ...cells,
                  <span key={price.id} className="flex flex-wrap items-center gap-3">
                    <Link href={`/fiyatlar?kayit=${price.id}`} className="admin-text-btn">Düzelt</Link>
                    {used ? <span className="text-xs font-semibold text-[#9f2d2d]">Bu fiyat kayıtlarda var. Silinemez.</span> : <a className="admin-text-btn" href={`/fiyatlar?sil=${price.id}`}>Sil</a>}
                  </span>,
                ];
              })}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Henüz fiyat yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function People({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const people = listPeople(club.id, viewer);
  const guardians = listGuardians(club.id);
  const sports = listSports(club.id);
  const teams = listTeams(club.id, viewer);
  const prices = listPrices(club.id);
  const canEdit = canEditRoster(viewer, club.id);
  const editing = query.kayit && query.kayit !== "yeni" ? people.find((person) => person.id === query.kayit) : undefined;
  const formSports = sports.map((item) => ({ id: item.id, name: item.name }));
  const formTeams = teams.map((item) => ({ id: item.id, name: item.name, kind: item.kind === "school" ? "school" as const : "squad" as const }));
  if (canEdit && (query.kayit === "yeni" || editing)) {
    return (
      <div>
        <PageHeader
          kicker="Spor operasyonları"
          title={editing ? editing.name : "Yeni kayıt"}
          description="Anne veya babadan biri yeter. Acil yakın isteğe bağlıdır. Boy, kilo ve basket geçmişi burada yok."
        >
          <Link href="/sporcular" className="btn-club">Liste</Link>
        </PageHeader>
        <Saved query={query} />
        <Panel
          title={editing ? "Kaydı düzelt" : "Yeni kayıt"}
          action={<button type="submit" form="sporcu-kayit" className="btn-club">Kaydet</button>}
        >
          <AthleteForm
            key={editing?.id ?? "yeni"}
            action={editing ? updatePerson.bind(null, club.id, editing.id) : createPerson.bind(null, club.id)}
            today={todayISO}
            sports={formSports}
            teams={formTeams}
            prices={prices}
            initial={editing ? registrationInitial(editing, guardians) : undefined}
            submitLabel="Kaydet"
          />
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Sporcu kaydı" description="Liste buradadır. Kart, sporcunun takip sayfasıdır. Düzelt yalnız kayıt formunu açar. Yeni kayıt sağ üstten açılır.">
        {canEdit ? <Link href="/sporcular?kayit=yeni" className="btn-club">Yeni kayıt</Link> : null}
      </PageHeader>
      <Saved query={query} />
      <PeopleBrowser
        people={people.map((person) => ({
          name: person.name,
          enrollment: person.enrollment === "school" ? "Spor okulu" : "Takım oyuncusu",
          guardian: guardianLabel(person, guardians),
          sport: sportName(person.sportId),
          team: teamName(person.teamId),
          since: registrationDate(person.since),
          years: yearsSince(person.since, todayISO),
          fee: feeLabel(person) || "—",
          status: person.status,
          cardHref: `/sporcular/${person.id}`,
          editHref: canEdit ? `/sporcular?kayit=${person.id}` : undefined,
          sheet: athleteSheet(person, guardians, sportName(person.sportId), teamName(person.teamId), todayISO),
        }))}
      />
    </div>
  );
}

function registrationInitial(
  person: {
    name: string;
    birthYear: number;
    enrollment?: "school" | "squad";
    status: string;
    sportId: string;
    teamId?: string;
    since: string;
    reference?: string;
    guardian?: string;
    phone?: string;
    motherId?: string;
    fatherId?: string;
    emergencyId?: string;
    guardianId?: string;
    priceId?: string;
    discountKind?: "none" | "percent" | "custom";
    discountPercent?: number;
    chargedAmount?: number;
  },
  guardians: { id: string; name: string; phone: string; relation?: string }[],
): RegistrationInitial {
  const contact = (id?: string) => {
    const row = id ? guardians.find((item) => item.id === id) : undefined;
    return row ? { id: row.id, name: row.name, phone: row.phone, relation: row.relation } : undefined;
  };
  const mother = contact(person.motherId) ?? (person.guardian
    ? { name: person.guardian.split(" · ")[0] ?? person.guardian, phone: person.phone ?? "" }
    : undefined);
  return {
    name: person.name,
    birthYear: person.birthYear,
    enrollment: person.enrollment === "school" ? "school" : "squad",
    status: person.status,
    sportId: person.sportId,
    teamId: person.teamId ?? "",
    since: person.since,
    reference: person.reference ?? "",
    mother,
    father: contact(person.fatherId),
    emergency: contact(person.emergencyId),
    primary: person.guardianId && person.fatherId && person.guardianId === person.fatherId ? "father" : "mother",
    priceId: person.priceId,
    discount: person.discountKind ?? "none",
    discountPercent: person.discountPercent,
    customAmount: person.discountKind === "custom" && person.chargedAmount != null ? String(person.chargedAmount) : "",
  };
}

function PersonScreen({ club, viewer, personId, query }: { club: Club; viewer: Viewer; personId: string; query: Record<string, string | undefined> }) {
  const profile = personProfile(club.id, viewer, personId);
  if (!profile) return <NoAccess label="Bu kayıt" />;
  const { person } = profile;
  const guardians = listGuardians(club.id);
  const record = person.guardianId ? guardians.find((item) => item.id === person.guardianId) : undefined;
  const mother = person.motherId ? guardians.find((item) => item.id === person.motherId) : undefined;
  const father = person.fatherId ? guardians.find((item) => item.id === person.fatherId) : undefined;
  const emergency = person.emergencyId ? guardians.find((item) => item.id === person.emergencyId) : undefined;
  const veli = record?.name ?? person.guardian;
  return (
    <div>
      <PageHeader kicker="Sporcu kartı" title={person.name} description="Kart takip içindir. Kayıt formu ayrı açılır. Buradaki boy, not ve geçmiş kendi kaydıyla durur.">
        <span className="flex flex-wrap gap-2">
          {canEditRoster(viewer, club.id) ? <Link href={`/sporcular?kayit=${person.id}`} className="admin-text-btn">Kaydı düzelt</Link> : null}
          <Link href="/sporcular" className="btn-club">Liste</Link>
        </span>
      </PageHeader>
      {query.takip ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Karttaki değişiklik kaydedildi.</p> : null}
      {query.hata === "olcu" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ölçü veya not boş olamaz. Boy 40–250, kilo 10–200 arasında yazılır.</p> : null}
      {query.hata === "tarih" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Tarih bugün ya da daha eski bir gün olabilir.</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Bağlantı">
          <Row label="Anne" value={mother?.name || veli || "—"} />
          <Row label="Anne telefonu" value={mother?.phone || (record?.phone ?? person.phone) || "—"} />
          <Row label="Baba" value={father?.name || "—"} />
          <Row label="Baba telefonu" value={father?.phone || "—"} />
          <Row label="Acil yakın" value={emergency ? `${emergency.name}${emergency.relation ? ` · ${emergency.relation}` : ""}` : "—"} />
          <Row label="Acil telefon" value={emergency?.phone || "—"} />
          {record?.email ? <Row label="E-posta" value={record.email} /> : null}
          {person.reference ? <Row label="Oyuncu referansı" value={person.reference} /> : null}
          {record?.reference ? <Row label="Veli referansı" value={record.reference} /> : null}
          <Row label="Ücret" value={feeLabel(person) || "—"} />
          <Row label="Kayıt" value={formatDay(person.since)} />
          <div className="mt-3"><Tag tone={statusTone(person.status)}>{statusLabel[person.status]}</Tag></div>
        </Panel>
        <Panel title="Aidat ve hak">
          {(() => {
            const ledger = readState();
            const due = duesForMonth([person], todayISO.slice(0, 7), todayISO, ledger.duePayments, ledger.dueOverrides)[0];
            if (!due) return null;
            return (
              <div className="mb-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{monthLabel(due.month)} aidatı</span>
                  <Tag tone={due.billed ? statusTone(due.status) : "neutral"}>{due.billed ? formatTry(due.remaining) + " kalan" : "Anlaşma yok"}</Tag>
                </div>
                <Link href={`/aidat?ay=${due.month}`} className="admin-text-btn">Aidat ekranı</Link>
              </div>
            );
          })()}
          {profile.invoices.map((invoice) => (
            <div key={invoice.id} className="mb-2 text-sm">
              <div className="flex justify-between gap-2">
                <span>{invoice.title}</span>
                <Tag tone={statusTone(invoice.status)}>{statusLabel[invoice.status]}</Tag>
              </div>
              <div className="text-[var(--muted)]">{formatTry(invoice.paid)} / {formatTry(invoice.amount)}</div>
            </div>
          ))}
          {profile.credit ? (
            <p className="text-sm">{profile.credit.title}: {profile.credit.remaining}/{profile.credit.total} seans kaldı</p>
          ) : null}
          {profile.invoices.length === 0 && !profile.credit ? <p className="text-sm text-[var(--muted)]">Açık borç yok.</p> : null}
        </Panel>
        <Panel title="Zimmet ve katılım">
          {profile.custody.map((entry) => (
            <p key={entry.id} className="text-sm">{entry.title} · {formatDay(entry.date)}</p>
          ))}
          {profile.marks.map((mark) => (
            <p key={mark.sessionId} className="text-sm text-[var(--muted)]">Yoklama: {statusLabel[mark.status]}</p>
          ))}
          {profile.bookings.map((booking) => (
            <p key={booking.sessionId} className="text-sm text-[var(--muted)]">Seans: {statusLabel[booking.status]}</p>
          ))}
          {profile.custody.length === 0 && profile.marks.length === 0 && profile.bookings.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Henüz hareket yok.</p>
          ) : null}
        </Panel>
      </div>
      <AthleteTrack club={club} viewer={viewer} personId={person.id} />
    </div>
  );
}

function AthleteTrack({ club, viewer, personId }: { club: Club; viewer: Viewer; personId: string }) {
  const track = athleteDevelopment(personId, directory());
  const canWrite = canEditRoster(viewer, club.id);
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Panel title="Başlangıç ölçüsü">
        {track.start ? <p className="mb-3 text-sm">{formatDay(track.start.date)} · {track.start.heightCm ? `${track.start.heightCm} cm` : "—"} · {track.start.weightKg ? `${track.start.weightKg} kg` : "—"}</p> : <p className="mb-3 text-sm text-[var(--muted)]">Henüz başlangıç yok.</p>}
        {canWrite ? (
          <form action={saveAthleteTrack.bind(null, club.id, personId)} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="bolum" value="baslangic" />
            <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={track.start?.date ?? todayISO} className={fieldClass} /></Field>
            <Field label="Boy"><input name="height" type="number" min={40} max={250} step="0.1" defaultValue={track.start?.heightCm} placeholder="cm" className={fieldClass} /></Field>
            <Field label="Kilo"><input name="weight" type="number" min={10} max={200} step="0.1" defaultValue={track.start?.weightKg} placeholder="kg" className={fieldClass} /></Field>
            <div className="sm:col-span-3"><button className="btn-club">Başlangıcı kaydet</button></div>
          </form>
        ) : null}
      </Panel>
      <Panel title="Aylık ölçü">
        <div className="mb-3 grid gap-1 text-sm">
          {track.monthly.length ? track.monthly.map((item, index) => (
            <p key={`${item.date}-${index}`}>{formatDay(item.date)} · {item.heightCm ? `${item.heightCm} cm` : "—"} · {item.weightKg ? `${item.weightKg} kg` : "—"}</p>
          )) : <p className="text-[var(--muted)]">Aylık ölçü yok.</p>}
        </div>
        {canWrite ? (
          <form action={saveAthleteTrack.bind(null, club.id, personId)} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="bolum" value="aylik" />
            <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={todayISO} className={fieldClass} /></Field>
            <Field label="Boy"><input name="height" type="number" min={40} max={250} step="0.1" placeholder="cm" className={fieldClass} /></Field>
            <Field label="Kilo"><input name="weight" type="number" min={10} max={200} step="0.1" placeholder="kg" className={fieldClass} /></Field>
            <div className="sm:col-span-3"><button className="btn-club">Ölçüyü kaydet</button></div>
          </form>
        ) : null}
      </Panel>
      <TrackNotes clubId={club.id} personId={personId} title="Notlar" section="not" rows={track.notes} canWrite={canWrite} />
      <TrackNotes clubId={club.id} personId={personId} title="Basket geçmişi" section="gecmis" rows={track.basketballHistory} canWrite={canWrite} />
    </div>
  );
}

function TrackNotes({
  clubId,
  personId,
  title,
  section,
  rows,
  canWrite,
}: {
  clubId: string;
  personId: string;
  title: string;
  section: string;
  rows: { date: string; text: string }[];
  canWrite: boolean;
}) {
  return (
    <Panel title={title}>
      <div className="mb-3 grid gap-2 text-sm">
        {rows.length ? rows.map((item, index) => (
          <p key={`${item.date}-${index}`}><span className="text-[var(--muted)]">{formatDay(item.date)}</span> · {item.text}</p>
        )) : <p className="text-[var(--muted)]">Henüz yazı yok.</p>}
      </div>
      {canWrite ? (
        <form action={saveAthleteTrack.bind(null, clubId, personId)} className="grid gap-3">
          <input type="hidden" name="bolum" value={section} />
          <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={todayISO} className={fieldClass} /></Field>
          <Field label="Yazı"><input name="text" required maxLength={240} placeholder="Kısa not" className={fieldClass} /></Field>
          <button className="btn-club">Yazıyı kaydet</button>
        </form>
      ) : null}
    </Panel>
  );
}

function Teams({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const groups = listTeams(club.id, viewer);
  const people = listPeople(club.id, viewer);
  const guardians = listGuardians(club.id);
  const sports = listSports(club.id);
  const seasons = listYearSeasons(club.id);
  const branches = listBranches(club.id, viewer);
  const coaches = listStaff(club.id, viewer).filter((member) => isCoachDuty(member.duty));
  const canEdit = canEditRoster(viewer, club.id);
  const open = query.kayit === "yeni";
  const opened = groups.find((team) => team.id === query.kart);
  const defaultSeason = seasons.find((season) => season.name === "2026-2027") ?? seasons.find((season) => season.active) ?? seasons[0];
  if (open) {
    return (
      <div>
        <PageHeader kicker="Spor operasyonları" title="Takım aç" description="Takım burada açılır. Kadro, takım kartının içinde ayrıca kaydedilir.">
          <span className="flex flex-wrap gap-2">
            {coaches.length && sports.length && defaultSeason ? <button form="takim-ac" className="btn-club">Kaydet</button> : null}
            <Link href="/takimlar" className="admin-text-btn">Liste</Link>
          </span>
        </PageHeader>
        {query.hata === "antrenor" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Antrenör, personelde Başantrenör veya Antrenör unvanıyla kayıtlı olmalıdır.</p> : null}
        {query.hata && query.hata !== "antrenor" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Takım açılamadı. Ad, branş, sezon ve antrenör kontrol edilsin.</p> : null}
        <Panel>
          <form id="takim-ac" action={createTeam.bind(null, club.id)} className="grid gap-3 md:grid-cols-2">
            <Field label="Takım adı"><input name="name" required placeholder="U10 Basketbol" className={fieldClass} /></Field>
            <Field label="Tür">
              <select name="kind" className={fieldClass} defaultValue="squad">
                <option value="school">Spor okulu</option>
                <option value="squad">Takım</option>
              </select>
            </Field>
            <Field label="Branş">
              <select name="sportId" required className={fieldClass} defaultValue={sports[0]?.id}>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sezon">
              <select name="seasonId" required className={fieldClass} defaultValue={defaultSeason?.id}>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Şube">
              <select name="branchId" className={fieldClass} defaultValue="">
                <option value="">Şube yok</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Antrenör">
              <select name="coachStaffId" required className={fieldClass} defaultValue={coaches[0]?.id ?? ""}>
                {coaches.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.duty}</option>
                ))}
              </select>
            </Field>
            {coaches.length ? null : <p className="text-sm text-[var(--muted)] md:col-span-2">Antrenör listesi boş. Personelde Başantrenör veya Antrenör açılınca burada seçilir.</p>}
          </form>
        </Panel>
      </div>
    );
  }
  if (opened) {
    const roster = people.filter((person) => person.teamId === opened.id);
    const kind = opened.kind === "school" ? "school" : "squad";
    const candidates = people.filter((person) => person.kind === "athlete" && person.teamId !== opened.id && (person.enrollment === "school" ? "school" : "squad") === kind);
    return (
      <div>
        <PageHeader kicker="Takım kartı" title={opened.name} description="Takım açmak bitti. Kadroya alma ve çıkarma bu kartta ayrıca kaydedilir.">
          <Link href="/takimlar" className="btn-club">Liste</Link>
        </PageHeader>
        {query.kadro === "yazildi" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Sporcu kadroya yazıldı.</p> : null}
        {query.kadro === "cikti" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Sporcu kadrodan çıkarıldı.</p> : null}
        {query.hata === "kadro" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Sporcu bu takımın türüyle uyuşmuyor.</p> : null}
        <Panel title="Takım">
          <Row label="Tür" value={kind === "school" ? "Spor okulu" : "Takım"} />
          <Row label="Branş" value={sportName(opened.sportId)} />
          <Row label="Sezon" value={listSeasons(club.id).find((season) => season.id === opened.seasonId)?.name ?? "—"} />
          <Row label="Şube" value={opened.branchId ? branchName(opened.branchId) : "Şube yok"} />
          <Row label="Antrenör" value={staffName(opened.coachStaffId)} />
        </Panel>
        <Panel title="Kadro">
          {roster.length ? (
            <Table
              columns={["Sporcu", "Veli", "Durum", ""]}
              rows={roster.map((person) => [
                <Link key={person.id} href={`/sporcular/${person.id}`} className="font-semibold">{person.name}</Link>,
                guardianLabel(person, guardians) || "—",
                <Tag key={`${person.id}-s`} tone={statusTone(person.status)}>{statusLabel[person.status]}</Tag>,
                canEdit ? (
                  <form key={`${person.id}-c`} action={liftAthlete.bind(null, club.id, opened.id, person.id)}>
                    <button className="admin-text-btn">Kadrodan çıkar</button>
                  </form>
                ) : null,
              ])}
            />
          ) : <p className="text-sm text-[var(--muted)]">Kadro boş.</p>}
          {canEdit && candidates.length ? (
            <form action={placeAthlete.bind(null, club.id, opened.id)} className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Sporcu ekle">
                <select name="personId" className={fieldClass} defaultValue={candidates[0]?.id}>
                  {candidates.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </Field>
              <button className="btn-club">Kadroyu kaydet</button>
            </form>
          ) : null}
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Takımlar ve gruplar" description="Takım açmak ayrıdır. Kartın içindeki kadro değişikliği ayrıca kaydedilir.">
        {canEdit ? <Link href="/takimlar?kayit=yeni" className="btn-club">Takım aç</Link> : null}
      </PageHeader>
      <Saved query={query} />
      <Panel>
        <Table
          columns={["Takım", "Tür", "Branş", "Antrenör", "Kadro", ""]}
          rows={groups.map((team) => [
            team.name,
            team.kind === "school" ? "Spor okulu" : "Takım",
            sportName(team.sportId),
            staffName(team.coachStaffId),
            String(people.filter((person) => person.teamId === team.id).length),
            <Link key={team.id} href={`/takimlar?kart=${team.id}`} className="admin-text-btn">Kart</Link>,
          ])}
        />
      </Panel>
    </div>
  );
}

function Calendar({ club, viewer, selected }: { club: Club; viewer: Viewer; selected?: string }) {
  const sessions = listTrainings(club.id, viewer);
  const conflicts = clubConflictIds(club.id);
  const current = sessions.find((session) => session.id === selected) ?? sessions.find((session) => conflicts.has(session.id));
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Antrenman takvimi" description="Salon ve antrenör çakışması kayıtla birlikte hesaplanır. Geçmiş seans sessizce yeniden yazılmaz." />
      <Week club={club} viewer={viewer} />
      {current ? (
        <div className="mt-4">
          <Panel title={current.title}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <Row label="Saat" value={`${dayLabel(current.date)} ${current.start}–${current.end}`} />
              <Row label="Tesis" value={`${facilityName(current.facilityId)} · ${branchName(current.branchId)}`} />
              <Row label="Antrenör" value={staffName(current.coachStaffId)} />
              <Row label="Grup" value={teamName(current.teamId)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {conflicts.has(current.id) ? <Tag tone="bad">Salon veya antrenör çakışması</Tag> : <Tag tone="good">Çakışma yok</Tag>}
              {coachLeave(current) ? <Tag tone="warn">Antrenör izinde</Tag> : null}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function RollCall({ club, viewer, selected }: { club: Club; viewer: Viewer; selected?: string }) {
  const sessions = listTrainings(club.id, viewer).filter((session) => session.kind === "training");
  const current = sessions.find((session) => session.id === selected) ?? sessions.find((session) => session.date === todayISO) ?? sessions[0];
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Yoklama" description="Katılım antrenmana yazılır. Geçmiş bir yoklamayı düzeltmek eski kaydı silmez." />
      <div className="mb-4 flex flex-wrap gap-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/yoklama?seans=${session.id}`}
            className={`rounded-full px-3 py-1.5 text-sm ${session.id === current?.id ? "bg-[var(--club)] text-white" : "bg-white"}`}
          >
            {dayLabel(session.date)} {session.start} {session.title}
          </Link>
        ))}
      </div>
      {current ? (
        <AttendanceBoard
          key={current.id}
          past={current.date < todayISO}
          rows={attendanceFor(current.id, rosterFor(current, viewer))}
        />
      ) : (
        <Panel><p className="text-sm text-[var(--muted)]">Bu kapsamda antrenman yok.</p></Panel>
      )}
    </div>
  );
}

function Sessions({ club, viewer }: { club: Club; viewer: Viewer }) {
  const classes = listTrainings(club.id, viewer).filter((session) => session.kind === "class");
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Seans rezervasyonları" description="Pilates ve yüzme, sabit kadro yerine kapasite ve paket hakkıyla işler. Kontenjan dolunca sıradaki üye bekleme listesine alınır." />
      {classes.length === 0 ? (
        <Panel>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Bu kulübün branşları takım kadrosuyla yürüyor. Seans modeli, pilates veya stüdyo branşı eklendiğinde aynı ekranda açılır.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {classes.map((session) => {
            const capacity = session.capacity ?? 0;
            const taken = bookedCount(session.id);
            const waiting = waitlist(session.id);
            const people = sessionBookings(session.id);
            return (
              <Panel key={session.id} title={session.title}>
                <p className="text-sm text-[var(--muted)]">{dayLabel(session.date)} {session.start}–{session.end} · {facilityName(session.facilityId)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#efeae1]">
                  <div className="h-full bg-[var(--club)]" style={{ width: `${capacity ? Math.min(100, (taken / capacity) * 100) : 0}%` }} />
                </div>
                <p className="mt-2 text-sm">{taken}/{capacity} dolu{waiting.length ? ` · ${waiting.length} beklemede` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {people.map((booking) => (
                    <Tag key={booking.personId} tone={statusTone(booking.status)}>
                      {booking.person?.name} · {statusLabel[booking.status]}
                    </Tag>
                  ))}
                </div>
                {waiting[0] ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {waiting[0].name} sırada. İptal olursa {club.waitlistMinutes} dakika içinde onaylarsa yer ona geçer. Katılım bitince paket hakkından düşülür.
                  </p>
                ) : null}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stock({ club, viewer }: { club: Club; viewer: Viewer }) {
  const items = listStock(club.id, viewer);
  const places = listWarehouses(club.id, viewer);
  return (
    <div>
      <PageHeader kicker="İşletme" title="Stok ve depolar" description="Minimumun altındaki varyant teslimat sırasında yetersiz sayılır. Yetersiz stokla zimmet işlemi kapanmaz." />
      {places.map((place) => (
        <p key={place.id} className="mb-3 text-sm text-[var(--muted)]">{place.name} · {branchName(place.branchId)}</p>
      ))}
      <Panel>
        <Table
          columns={["Ürün", "Varyant", "Elde", "Minimum", "Durum"]}
          rows={items.map((item) => [
            item.name,
            item.variant,
            String(item.qty),
            String(item.min),
            <Tag key={item.id} tone={item.qty < item.min ? "bad" : "good"}>{item.qty < item.min ? "Düşük" : "Yeterli"}</Tag>,
          ])}
        />
      </Panel>
    </div>
  );
}

function Custody({ club }: { club: Club }) {
  const entries = listCustody(club.id);
  return (
    <div>
      <PageHeader kicker="İşletme" title="Zimmet işlemleri" description="Teslim, stok hareketi ve sporcu zimmeti aynı işlemde oluşur. Yarıda kalırsa ikisi birden geri alınır." />
      {entries.length === 0 ? <Panel><p className="text-sm text-[var(--muted)]">Bu kulüpte tamamlanmış zimmet yok.</p></Panel> : null}
      {entries.map((entry) => (
        <Panel key={entry.id} title={entry.title}>
          <p className="text-sm text-[var(--muted)]">{formatDay(entry.date)} · {entry.actor} · {entry.lines.length} kişi</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.lines.map((line) => (
              <Tag key={line.personId}>{nameOf(line.personId)} · {line.qty}</Tag>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function InvoiceList({ club, viewer, onlyOpen }: { club: Club; viewer: Viewer; onlyOpen?: boolean }) {
  const rows = listInvoices(club.id, viewer).filter((invoice) => (onlyOpen ? invoice.status !== "paid" : true));
  return (
    <Table
      columns={["Kişi", "Kalem", "Tutar", "Ödenen", "Durum"]}
      rows={rows.map((invoice) => [
        <Link key={invoice.id} href={`/sporcular/${invoice.personId}`} className="font-semibold">{nameOf(invoice.personId)}</Link>,
        invoice.title,
        formatTry(invoice.amount),
        formatTry(invoice.paid),
        <Tag key={`${invoice.id}-t`} tone={statusTone(invoice.status)}>{statusLabel[invoice.status]}</Tag>,
      ])}
    />
  );
}

function StaffScreen({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const members = listStaff(club.id, viewer);
  const branches = listBranches(club.id, viewer);
  const canEdit = canEditStructure(viewer, club.id);
  const open = query.kayit === "yeni" || members.some((member) => member.id === query.kayit);
  const editing = members.find((member) => member.id === query.kayit);
  const knownDuty = staffTitles.includes((editing?.duty ?? "") as (typeof staffTitles)[number]);
  if (open) {
    return (
      <div>
        <PageHeader kicker="İşletme" title={editing ? editing.name : "Yeni personel"} description="Personel burada açılır. Unvan kaydedilince takım ve tahsilat seçimleri bu unvana göre dolar.">
          <span className="flex flex-wrap gap-2">
            <button form="personel-kayit" className="btn-club">Kaydet</button>
            <Link href="/personel" className="admin-text-btn">Liste</Link>
          </span>
        </PageHeader>
        {query.hata === "personel" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ad, telefon ve unvan yazılır. Aynı ad tekrar edemez.</p> : null}
        {query.hata === "yetki" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p> : null}
        <Panel>
          <form id="personel-kayit" action={saveStaff.bind(null, club.id, editing?.id ?? "yeni")} className="grid gap-3 md:grid-cols-2">
            <Field label="Ad soyad"><input name="name" required defaultValue={editing?.name ?? ""} className={fieldClass} /></Field>
            <Field label="Unvan">
              <select name="duty" className={fieldClass} defaultValue={knownDuty ? editing?.duty : staffTitles[0]}>
                {staffTitles.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </Field>
            <Field label="Telefon"><input name="phone" required defaultValue={editing?.phone ?? ""} placeholder="05xx xxx xx xx" className={fieldClass} /></Field>
            <Field label="Şube">
              <select name="branchId" className={fieldClass} defaultValue={editing?.branchId ?? ""}>
                <option value="">Şube yok</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
            <p className="text-sm text-[var(--muted)] md:col-span-2">Takım antrenörü Başantrenör veya Antrenör olur. Aidat tahsilatındaki personel unvanı Mali İşler Yetkili’dir. Kulüp başkanı personel kaydıdır.</p>
            {editing && !knownDuty ? <p className="text-sm text-[var(--muted)] md:col-span-2">Kayıtlı unvan: {editing.duty}. Kaydedilince unvan yukarıdaki listeden yazılır.</p> : null}
          </form>
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="İşletme" title="Personel" description="Liste buradadır. Yeni personel sağ üstten açılır. Unvan, satırdaki düzeltme kaydedilince değişir.">
        {canEdit ? <Link href="/personel?kayit=yeni" className="btn-club">Yeni personel</Link> : null}
      </PageHeader>
      <Saved query={query} />
      <Panel>
        <Table
          columns={["Ad", "Unvan", "Telefon", "Şube", ""]}
          rows={members.map((member) => [
            member.name,
            member.duty,
            member.phone,
            member.branchId ? branchName(member.branchId) : "—",
            canEdit ? <Link key={member.id} href={`/personel?kayit=${member.id}`} className="admin-text-btn">Düzelt</Link> : null,
          ])}
        />
      </Panel>
    </div>
  );
}

function Notices({
  club,
  viewer,
  notes,
  retried,
}: {
  club: Club;
  viewer: Viewer;
  notes: { title: string; audience: string }[];
  retried: string[];
}) {
  const items = listNotices(club.id).map((notice) =>
    retried.includes(notice.id) ? { ...notice, state: "sent" as const, failed: 0, delivered: notice.delivered + notice.failed, failureNote: undefined } : notice,
  );
  return (
    <div>
      <PageHeader kicker="İletişim" title="Bildirim merkezi" description="Gönderim düşerse antrenman veya tahsilat geri alınmaz. Aynı kayıt ikinci kez bildirim üretmez; başarısız alıcı yeniden denenir." />
      {canComposeNotice(viewer, club.id) ? (
        <form action={queueNotice.bind(null, club.id)} className="mb-4 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-[1fr_180px_auto]">
          <input name="title" placeholder="Bildirim metni" className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm" />
          <input name="audience" placeholder="Kime" defaultValue="U12 velileri" className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm" />
          <button className="btn-club">Kuyruğa al</button>
        </form>
      ) : null}
      <div className="grid gap-3">
        {notes.map((note) => (
          <Panel key={note.title} title={note.title}>
            <Tag tone="warn">Kuyrukta</Tag>
            <p className="mt-2 text-sm text-[var(--muted)]">{note.audience} · kayıt durur, teslim ayrı yürür.</p>
          </Panel>
        ))}
        {items.map((notice) => (
          <Panel key={notice.id} title={notice.title}>
            <p className="text-sm leading-6">{notice.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag tone={statusTone(notice.state)}>{statusLabel[notice.state]}</Tag>
              <span className="text-sm text-[var(--muted)]">{notice.audience} · {notice.delivered} iletildi · {notice.failed} başarısız</span>
            </div>
            {notice.failureNote ? <p className="mt-2 text-sm text-[#9f2d2d]">{notice.failureNote}</p> : null}
            {notice.state === "retrying" ? (
              <form action={markRetried.bind(null, notice.id)} className="mt-3">
                <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm">Yeniden dene</button>
              </form>
            ) : null}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Reports({ club, viewer }: { club: Club; viewer: Viewer }) {
  const sessions = listTrainings(club.id, viewer).filter((session) => session.date < todayISO && session.kind === "training");
  const latest = sessions[0];
  const marks = latest ? attendanceFor(latest.id, rosterFor(latest, viewer)) : [];
  const present = marks.filter((mark) => mark.status === "present").length;
  const rate = marks.length ? Math.round((present / marks.length) * 100) : 0;
  const overdue = listInvoices(club.id, viewer).filter((invoice) => invoice.status === "overdue");
  return (
    <div>
      <PageHeader kicker="Analiz" title="Raporlar" description="İlk sürüm operasyon özeti. Finans ve katılım, yetkin olan kayıtlarla sınırlı." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={latest ? `${latest.title} katılım` : "Katılım"}>
          <div className="kpi-value">{rate}%</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{present}/{marks.length || 0} geldi</p>
          <div className="mt-4 h-2 rounded-full bg-[#efeae1]">
            <div className="h-full rounded-full bg-[var(--club)]" style={{ width: `${rate}%` }} />
          </div>
        </Panel>
        <Panel title="Gecikmiş tahsilat">
          <div className="kpi-value">{overdue.length}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {formatTry(overdue.reduce((sum, invoice) => sum + (invoice.amount - invoice.paid), 0))} açık
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Audit({ club, support }: { club: Club; support: boolean }) {
  const rows = listAudit(club.id);
  return (
    <div>
      <PageHeader kicker="Analiz" title="İşlem geçmişi" description="Eski değer ve yeni değer birlikte durur. Destek erişimi kulüp verisine ancak bu iz düşerek bakar." />
      {support ? (
        <p className="mb-4 rounded-2xl bg-[var(--club-soft)] px-4 py-3 text-sm">Destek oturumu açık. Bu giriş kulüp personelinin geçmişinde ayrıca görünür.</p>
      ) : null}
      <div className="grid gap-3">
        {rows.map((entry) => (
          <Panel key={entry.id} title={entry.action}>
            <p className="text-sm font-medium">{entry.entity}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{entry.summary}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{entry.actor} · {formatDay(entry.at)}</p>
            {entry.before ? (
              <p className="mt-2 text-sm">{entry.before} → {entry.after}</p>
            ) : null}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function versionDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Versions() {
  const current = productVersions[0];
  return (
    <div>
      <PageHeader
        kicker="Ürün"
        title="Versionlar"
        description="Her kulüp sitesi aynı ürün sürümünü taşır. Yeni özellikler ve yapılan değişiklikler sürüm sürüm durur."
      >
        <Tag tone="club">Güncel {current.version}</Tag>
      </PageHeader>
      <div className="grid gap-3">
        {productVersions.map((release) => (
          <Panel
            key={release.version}
            title={release.version}
            action={
              <span className="flex items-center gap-2">
                {release.version === current.version ? <Tag tone="club">Güncel</Tag> : null}
                <span className="text-xs font-semibold text-[var(--muted)]">{versionDate(release.date)}</span>
              </span>
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-extrabold tracking-[0.08em] text-[var(--heading)] uppercase">Özellikler</h3>
                <ul className="mt-2 space-y-2 text-sm leading-6">
                  {release.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-extrabold tracking-[0.08em] text-[var(--heading)] uppercase">Değişiklikler</h3>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                  {release.changes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Grants({ club, viewer }: { club: Club; viewer: Viewer }) {
  const owner = isOwner(viewer, club.id);
  return (
    <div>
      <PageHeader kicker="Yetki" title="Ekran yetkileri" description="Rol adı yetmez. Her satır bir ekrandır; şube müdürü aynı ekranı yalnız kendi şubesinin kayıtlarıyla görür, antrenör yalnız atandığı grubu görür." />
      <form action={saveGrants.bind(null, club.id)}>
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-2 py-2">Ekran</th>
                  {staffRoles.map((role) => (
                    <th key={role} className="px-2 py-2 font-semibold">{scopeLabels[role] === "Tüm kulüp" ? roleLabel(role) : roleLabel(role)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubScreens.map((screen) => (
                  <tr key={screen.id} className="border-t border-[var(--line)]">
                    <td className="px-2 py-2">
                      <div className="font-medium">{screen.label}</div>
                      <div className="text-xs text-[var(--muted)]">{screen.group}</div>
                    </td>
                    {staffRoles.map((role) => {
                      const checked = (role === "club_owner" ? defaultGrants.club_owner : grantsOrDefault(viewer.grants, role)).includes(screen.id);
                      return (
                        <td key={role} className="px-2 py-2 text-center">
                          {role === "club_owner" ? (
                            <input type="checkbox" defaultChecked disabled />
                          ) : (
                            <input type="checkbox" name={`${role}__${screen.id}`} defaultChecked={checked} disabled={!owner} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {owner ? (
              <button className="btn-club">Yetkileri kaydet</button>
            ) : (
              <p className="text-sm text-[var(--muted)]">Matrisi kulüp sahibi kaydeder.</p>
            )}
            <p className="text-xs text-[var(--muted)]">
              Kapsam: sahip ve yönetici tüm kulüp, şube müdürü yetkili şubeler, antrenör atandığı gruplar.
            </p>
          </div>
        </Panel>
      </form>
    </div>
  );
}

const fieldClass = "field";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}

function Saved({ query }: { query: Record<string, string | undefined> }) {
  const saved =
    query.eklendi === "brans"
      ? "Branş bu kulübe eklendi."
      : query.eklendi === "ad"
        ? "Branş adı güncellendi."
        : query.eklendi === "grup"
        ? "Takım açıldı."
        : query.eklendi === "personel"
          ? "Personel eklendi."
          : query.guncellendi === "personel"
            ? "Personel kaydı düzeltildi."
              : query.eklendi === "sporcu"
          ? "Kayıt listeye eklendi."
          : query.guncellendi === "sporcu"
            ? "Kayıt düzeltildi."
          : query.eklendi === "sube"
            ? "Şube eklendi."
            : query.eklendi === "tesis"
              ? "Tesis eklendi."
              : query.cikarildi === "sube"
                ? "Şube çıkarıldı."
                : query.cikarildi === "tesis"
                  ? "Tesis çıkarıldı."
                  : query.guncellendi === "tesis"
                    ? "Tesis güncellendi."
                    : query.eklendi === "fiyat"
                      ? "Fiyat eklendi."
                      : query.guncellendi === "fiyat"
                        ? "Fiyat güncellendi."
                        : query.cikarildi === "fiyat"
                          ? "Fiyat çıkarıldı."
                          : "";
  if (query.hata === "yetki") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p>;
  }
  if (query.hata === "kullanim") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu kayıt kadro, seans, depo veya tesise bağlı. Önce bağlı kaydı çıkar.</p>;
  }
  if (query.hata === "ad") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ad boş olamaz ve aynı ad tekrar edemez.</p>;
  }
  if (query.hata === "veli") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Listede görünecek velinin adı ve telefonu yazılır. Diğer veli ve acil yakın boş kalabilir.</p>;
  }
  if (query.hata === "tarih") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Kayıt tarihi bugün ya da daha eski bir gün olabilir.</p>;
  }
  if (query.hata === "fiyat") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Fiyat seçilmeli. Yüzde listeden seçilir veya özel fiyat yazılır.</p>;
  }
  if (query.hata === "sezon") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu branşın açık sezonu yok. Sezonu sistem yöneticisi açar.</p>;
  }
  if (query.hata) {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Kayıt eklenemedi. Adı, branşı ve tarihleri kontrol et.</p>;
  }
  if (!saved) return null;
  return <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">{saved}</p>;
}

function roleLabel(role: (typeof staffRoles)[number]) {
  const labels = {
    club_owner: "Sahip",
    club_manager: "Yönetici",
    branch_manager: "Şube",
    finance: "Finans",
    warehouse: "Depo",
    coach: "Antrenör",
  };
  return labels[role];
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
