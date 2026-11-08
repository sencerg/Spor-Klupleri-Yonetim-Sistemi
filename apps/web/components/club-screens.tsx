import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  athleteDevelopment,
  attention,
  can,
  canCollect,
  canComposeNotice,
  canEditRoster,
  canEditStructure,
  clubScreens,
  coachLeave,
  dayLabel,
  defaultGrants,
  duesForMonth,
  duesSeasonMonths,
  feeLabel,
  formatDay,
  monthLabel,
  formatLong,
  formatTry,
  grantsOrDefault,
  isOwner,
  membershipFor,
  rosterFor,
  attendanceFor,
  overdueDues,
  jerseySizes,
  roleLabels,
  scopeLabels,
  staffRoles,
  seasonForSport,
  todayISO,
  productVersions,
  windowDays,
  type Club,
  type Viewer,
} from "@skys/domain";
import { cancelSession, createFacility, createPerson, createPrice, createSport, createTeam, deliverGear, liftAthlete, placeAthlete, placeDrops, planSession, queueNotice, removeFacility, removeGearDelivery, removeGearItem, removePrice, renameSport, removeTitle, saveAthleteTrack, saveBrand, saveGearItem, saveGrants, saveMatchNumber, saveRoll, saveStaff, saveTitle, setSessionCrew, updateFacility, updatePerson, updatePrice } from "@/app/actions";
import { branchName, clubById, conflictIds, directory, facilityName, listBranches, listFacilities, listGuardians, listPeople, listPrices, listSeasons, listSports, listStaff, listTeams, listTitles, listTrainings as liveTrainings, listYearSeasons, nameOf, personProfile, sportName, staffName, teamName } from "@/lib/live";
import { GearProductForm } from "@/components/gear-form";
import { AttendanceBoard } from "@/components/attendance-board";
import { RollWeek } from "@/components/roll-week";
import { FacilityRow } from "@/components/facility-row";
import { AthleteForm, type RegistrationInitial } from "@/components/athlete-form";
import { LeaveLink } from "@/components/leave-link";
import { RosterLift } from "@/components/roster-lift";
import { SeriesPlan } from "@/components/series-plan";
import { SavedPopup } from "@/components/saved-popup";
import { PeopleBrowser, SportSeasonField } from "@/components/roster-search";
import { ClubMark, NoAccess, PageHeader, Panel, Stat, statusLabel, statusTone, Table, Tag } from "@/components/bits";
import { athleteSheet, registrationDate, yearsSince } from "@/lib/athlete-sheet";
import { DuesScreen } from "@/components/dues-board";
import { CoachRows } from "@/components/coach-rows";
import { Planner } from "@/components/planner";
import { RollReportScreen } from "@/components/roll-report-screen";
import { PrivateLessons } from "@/components/private-lessons";
import { guardianLabel } from "@/lib/search";
import { readState } from "@/lib/store";

const loginRoles = [
  { id: "club_manager", label: "Kulüp yöneticisi" },
  { id: "finance", label: "Finans sorumlusu" },
  { id: "warehouse", label: "Depo sorumlusu" },
  { id: "coach", label: "Antrenör" },
] as const;

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
      return <Calendar club={club} viewer={viewer} query={query} />;
    case "yoklama":
      return <RollCall club={club} viewer={viewer} query={query} />;
    case "yoklama-raporu":
      return <RollReportScreen club={club} viewer={viewer} query={query} />;
    case "ozel-ders":
      return <PrivateLessons club={club} viewer={viewer} query={query} />;
    case "stok":
      return <Stock club={club} viewer={viewer} query={query} />;
    case "zimmet":
      return <Custody club={club} viewer={viewer} query={query} />;
    case "fiyatlar":
      return <Prices club={club} viewer={viewer} query={query} />;
    case "aidat":
      return <DuesScreen club={club} viewer={viewer} query={query} />;
    case "personel":
      return <StaffScreen club={club} viewer={viewer} query={query} />;
    case "unvanlar":
      return <Titles club={club} viewer={viewer} query={query} />;
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

function gearDebt(clubId: string, viewer: Viewer) {
  const state = readState();
  const people = new Set(listPeople(clubId, viewer).map((person) => person.id));
  const open = state.gearDeliveries.filter((row) => row.clubId === clubId && people.has(row.personId)).flatMap((row) => {
    const charge = state.extraCharges.find((item) => item.id === row.chargeId);
    if (!charge || charge.amount < 1) return [];
    const paid = state.extraPayments.filter((item) => item.chargeId === charge.id).reduce((sum, item) => sum + item.amount, 0);
    const left = Math.max(0, charge.amount - paid);
    return left > 0 ? [left] : [];
  });
  return { count: open.length, total: open.reduce((sum, item) => sum + item, 0) };
}

function openDues(clubId: string, viewer: Viewer) {
  const state = readState();
  const people = listPeople(clubId, viewer);
  return overdueDues(people, todayISO, state.duePayments ?? [], state.dueOverrides ?? []);
}

function Dashboard({ club, viewer }: { club: Club; viewer: Viewer }) {
  const people = listPeople(club.id, viewer);
  const sessions = liveTrainings(club.id, viewer).filter((session) => session.date === todayISO);
  const overdue = openDues(club.id, viewer);
  const overdueTotal = overdue.reduce((sum, row) => sum + row.remaining, 0);
  const gearOpen = gearDebt(club.id, viewer);
  const items = [
    ...attention(club.id, viewer, directory(), { count: overdue.length, total: overdueTotal }),
    ...(can(viewer, club.id, "finance.view") && gearOpen.count
      ? [{ title: "Teslim borcu", detail: `${gearOpen.count} teslim, ${formatTry(gearOpen.total)} açık.`, href: "aidat" }]
      : []),
  ];
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
          <Stat label="Gecikmiş aidat" value={String(overdue.length)} hint={overdue.length ? formatTry(overdueTotal) : "Açık gecikme yok"} />
        ) : (
          <Stat label="Tesis" value={String(listFacilities(club.id, viewer).length)} hint="Görebileceğin tesis" />
        )}
        <Stat label="Branş" value={String(listSports(club.id).length)} hint="Kulübün tanımlı branşı" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        {can(viewer, club.id, "schedule.view") ? (
          <Week club={club} viewer={viewer} />
        ) : can(viewer, club.id, "finance.view") ? (
          <Panel title="Gecikmiş aidat">
            {overdue.length === 0 ? <p className="text-sm text-[var(--muted)]">Açık gecikme yok.</p> : (
              <div className="space-y-2">
                {overdue.slice(0, 8).map((row) => (
                  <Link key={`${row.personId}-${row.month}`} href={`/aidat?ay=${row.month}`} className="block rounded-xl bg-[var(--paper)] px-3 py-3">
                    <div className="text-sm font-semibold">{nameOf(row.personId)}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{monthLabel(row.month)} · {formatTry(row.remaining)} kalan</div>
                  </Link>
                ))}
              </div>
            )}
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
  const sessions = liveTrainings(club.id, viewer);
  const conflicts = conflictIds(club.id);
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

const extraThemes = [
  { name: "Lacivert", accent: "#12245c", accentSoft: "#e7ecf8" },
  { name: "Parke", accent: "#e4572e", accentSoft: "#fde7df" },
  { name: "Deniz", accent: "#0f766e", accentSoft: "#d7f3ef" },
  { name: "Bordo", accent: "#7a1f3d", accentSoft: "#f8dbe3" },
];

function Settings({ club, viewer }: { club: Club; viewer: Viewer }) {
  const editable = canEditStructure(viewer, club.id);
  const base = clubById(club.id) ?? club;
  const themes = [
    { name: club.name, accent: base.accent, accentSoft: base.accentSoft },
    ...extraThemes.filter((theme) => theme.accent.toLowerCase() !== base.accent.toLowerCase()),
  ];
  const current = club.accent.toLowerCase();
  return (
    <div>
      <PageHeader kicker="Genel yönetim" title={`${club.name} Ayarları`} description="Açık zemin kalır. İlk renk, bu kulübün logosundan veya açılışta seçilen renktir." />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Görünen kimlik">
          <form action={saveBrand.bind(null, club.id)} className="grid gap-4">
            <label className="grid gap-1 text-sm">
              Motto
              <input name="motto" defaultValue={club.motto} disabled={!editable} className="field" />
            </label>
            <div className="grid gap-2">
              {themes.map((theme) => (
                <label key={`${theme.name}-${theme.accent}`} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                  <input type="radio" name="theme" value={`${theme.accent}|${theme.accentSoft}`} defaultChecked={current === theme.accent.toLowerCase()} disabled={!editable} />
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
        <Panel title="İletişim">
          <dl className="grid gap-3 text-sm">
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
  const programIds = new Set([
    ...liveTrainings(club.id, viewer).map((session) => session.facilityId),
    ...readState().privateLessons.filter((lesson) => lesson.clubId === club.id && lesson.status !== "cancelled" && lesson.facilityId).map((lesson) => lesson.facilityId as string),
  ]);
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
  const noted = query.eklendi === "sporcu" || query.guncellendi === "sporcu" ? people.find((person) => person.id === query.kim) : undefined;
  const notedRows = noted ? athleteSummary(noted, guardians) : [];
  const formSports = sports.map((item) => ({ id: item.id, name: item.name }));
  const formTeams = teams.map((item) => ({ id: item.id, name: item.name, kind: item.kind === "school" ? "school" as const : "squad" as const }));
  if (canEdit && (query.kayit === "yeni" || editing)) {
    return (
      <div>
        <PageHeader
          kicker="Spor operasyonları"
          title={editing ? editing.name : "Yeni kayıt"}
          description="Kayıt burada biter. Boy, kilo ve basket geçmişi karttadır."
        >
          <span className="flex flex-wrap gap-2">
            <button type="submit" form="sporcu-kayit" className="btn-club">Kaydet</button>
            <LeaveLink href="/sporcular" formId="sporcu-kayit" className="btn-line">Listeye geri dön</LeaveLink>
          </span>
        </PageHeader>
        <Saved query={query} />
        <Panel>
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
      <PageHeader
        kicker="Spor operasyonları"
        title="Sporcu kaydı"
        description="Liste buradadır. Kart, sporcunun takip sayfasıdır. Düzelt yalnız kayıt formunu açar. Yeni kayıt sağ üstten açılır."
        mark={<ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} />}
      >
        {canEdit ? <Link href="/sporcular?kayit=yeni" className="btn-club">Yeni kayıt</Link> : null}
      </PageHeader>
      {noted ? <SavedPopup title="Kaydedildi" name={noted.name} rows={notedRows} /> : null}
      <Saved query={query} quietAthlete={Boolean(noted)} />
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

const birthMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function athleteSummary(
  person: {
    birthYear: number;
    birthMonth?: number;
    birthDay?: number;
    enrollment?: "school" | "squad";
    status: string;
    sportId: string;
    teamId?: string;
    since: string;
    guardian?: string;
    guardianId?: string;
    phone?: string;
    priceName?: string;
    listAmount?: number;
    discountKind?: "none" | "percent" | "custom";
    discountPercent?: number;
    chargedAmount?: number;
  },
  guardians: { id: string; name: string; phone: string }[],
) {
  const record = person.guardianId ? guardians.find((item) => item.id === person.guardianId) : undefined;
  const birthday = person.birthDay && person.birthMonth ? `${person.birthDay} ${birthMonths[person.birthMonth - 1] ?? ""}`.trim() : "";
  const rows = [
    { label: "Doğum yılı", value: String(person.birthYear) },
    ...(birthday ? [{ label: "Doğum günü", value: birthday }] : []),
    { label: "Tür", value: person.enrollment === "school" ? "Spor okulu" : "Takım oyuncusu" },
    { label: "Durum", value: statusLabel[person.status] ?? person.status },
    { label: "Branş", value: sportName(person.sportId) },
    { label: "Grup", value: person.teamId ? teamName(person.teamId) : "Grup yok" },
    { label: "Kayıt", value: registrationDate(person.since) },
    { label: "Veli", value: [record?.name ?? person.guardian, record?.phone || person.phone].filter(Boolean).join(" · ") || "—" },
    { label: "Ücret", value: feeLabel(person) || "Anlaşma yok" },
  ];
  return rows;
}

function registrationInitial(
  person: {
    name: string;
    birthYear: number;
    birthMonth?: number;
    birthDay?: number;
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
    birthMonth: person.birthMonth,
    birthDay: person.birthDay,
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
  const tabs = [
    ["ozet", "Özet"],
    ["aidat", "Aidat"],
    ["yoklama", "Yoklama"],
    ["olcu", "Ölçü"],
    ["not", "Not"],
    ["gecmis", "Geçmiş"],
  ] as const;
  const tab = tabs.some((item) => item[0] === query.sekme) ? query.sekme! : "ozet";
  return (
    <div>
      <PageHeader
        kicker="Sporcu kartı"
        title={person.name}
        description="Kart takip içindir. Kayıt formu ayrı açılır. Sekmenin içindeki kayıt, kartı açmaktan ayrıdır."
        mark={<ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} size="lg" />}
      >
        <span className="flex flex-wrap gap-2">
          {canEditRoster(viewer, club.id) ? <Link href={`/sporcular?kayit=${person.id}`} className="btn-line">Kaydı düzelt</Link> : null}
          <Link href="/sporcular" className="btn-club">Liste</Link>
        </span>
      </PageHeader>
      <AthletePane
        club={club}
        viewer={viewer}
        person={person}
        profile={profile}
        tab={tab}
        hrefFor={(id) => `/sporcular/${person.id}?sekme=${id}`}
        notice={Boolean(query.takip)}
        error={query.hata}
      />
    </div>
  );
}

function AthletePane({
  club,
  viewer,
  person,
  profile,
  tab,
  hrefFor,
  returnTo,
  notice,
  error,
  editHref,
}: {
  club: Club;
  viewer: Viewer;
  person: NonNullable<ReturnType<typeof personProfile>>["person"];
  profile: NonNullable<ReturnType<typeof personProfile>>;
  tab: string;
  hrefFor: (sekme: string) => string;
  returnTo?: string;
  notice?: boolean;
  error?: string;
  editHref?: string;
}) {
  const tabs = [
    ["ozet", "Özet"],
    ["aidat", "Aidat"],
    ["yoklama", "Yoklama"],
    ["olcu", "Ölçü"],
    ["not", "Not"],
    ["gecmis", "Geçmiş"],
  ] as const;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map(([id, label]) => (
          <Link key={id} href={hrefFor(id)} className={tab === id ? "btn-club" : "admin-text-btn"}>{label}</Link>
        ))}
        {editHref ? <Link href={editHref} className="admin-text-btn">Kaydı düzelt</Link> : null}
      </div>
      {notice ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Bu sekmedeki değişiklik kaydedildi.</p> : null}
      {error === "olcu" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ölçü veya yazı boş olamaz. Boy 40–250, kilo 10–200, kol açıklığı 80–250 arasında yazılır.</p> : null}
      {error === "numara" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Maç forma numarası 1, 2 veya 3 hane yazılır. Teslimden almak için bu sporcuya maç forması numarası işlenmiş olmalı.</p> : null}
      {error === "tarih" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Tarih bugün ya da daha eski bir gün olabilir.</p> : null}
      {tab === "ozet" ? <AthleteSummary club={club} viewer={viewer} person={person} profile={profile} returnTo={returnTo} /> : null}
      {tab === "aidat" ? <AthleteDues club={club} viewer={viewer} person={person} /> : null}
      {tab === "yoklama" ? <AthleteRoll club={club} viewer={viewer} marks={profile.marks} /> : null}
      {tab === "olcu" ? <AthleteMeasure club={club} viewer={viewer} personId={person.id} returnTo={returnTo} /> : null}
      {tab === "not" ? <AthleteNotes club={club} viewer={viewer} personId={person.id} returnTo={returnTo} /> : null}
      {tab === "gecmis" ? <AthletePast club={club} viewer={viewer} personId={person.id} returnTo={returnTo} /> : null}
    </div>
  );
}

function AthleteSummary({
  club,
  viewer,
  person,
  profile,
  returnTo,
}: {
  club: Club;
  viewer: Viewer;
  person: NonNullable<ReturnType<typeof personProfile>>["person"];
  profile: NonNullable<ReturnType<typeof personProfile>>;
  returnTo?: string;
}) {
  const clubId = club.id;
  const guardians = listGuardians(clubId);
  const record = person.guardianId ? guardians.find((item) => item.id === person.guardianId) : undefined;
  const mother = person.motherId ? guardians.find((item) => item.id === person.motherId) : undefined;
  const father = person.fatherId ? guardians.find((item) => item.id === person.fatherId) : undefined;
  const emergency = person.emergencyId ? guardians.find((item) => item.id === person.emergencyId) : undefined;
  const veli = record?.name ?? person.guardian;
  const state = readState();
  const deliveries = state.gearDeliveries
    .filter((row) => row.clubId === clubId && row.personId === person.id)
    .map((row) => {
      const item = state.gearItems.find((gear) => gear.id === row.itemId);
      const paid = state.extraPayments.filter((entry) => entry.chargeId === row.chargeId).reduce((sum, entry) => sum + entry.amount, 0);
      const left = Math.max(0, row.price - paid);
      const giver = staffName(row.staffId);
      return { row, name: item?.name ?? "Ürün", paid, left, giver };
    });
  const debt = deliveries.reduce((sum, line) => sum + line.left, 0);
  const deliveredNumber = state.gearDeliveries
    .filter((row) => row.clubId === clubId && row.personId === person.id && row.number)
    .map((row) => ({ row, item: state.gearItems.find((gear) => gear.id === row.itemId) }))
    .filter((line) => line.item?.kind === "match")
    .sort((left, right) => right.row.date.localeCompare(left.row.date) || right.row.id.localeCompare(left.row.id))[0]?.row.number;
  const canWrite = canEditRoster(viewer, clubId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Kayıt özeti">
        <Row label="Branş" value={sportName(person.sportId)} />
        <Row label="Takım" value={person.teamId ? teamName(person.teamId) : "Takımsız"} />
        <Row label="Doğum" value={String(person.birthYear)} />
        <Row label="Kayıt" value={registrationDate(person.since)} />
        <Row label="Ücret" value={feeLabel(person) || "Anlaşma yok"} />
        <Row label="Referans" value={person.reference || "—"} />
        <div className="mt-3"><Tag tone={statusTone(person.status)}>{statusLabel[person.status]}</Tag></div>
        <p className="mt-3 text-sm text-[var(--muted)]">Boy, not ve geçmiş bu özette yazılmaz. Kendi sekmelerinde kaydedilir.</p>
      </Panel>
      <Panel title="Veli">
        <Row label="Ana veli" value={veli || "—"} />
        <Row label="Telefon" value={record?.phone || person.phone || "—"} />
        <Row label="Anne" value={mother ? `${mother.name} · ${mother.phone}` : "—"} />
        <Row label="Baba" value={father ? `${father.name} · ${father.phone}` : "—"} />
        <Row label="Acil yakın" value={emergency ? `${emergency.name}${emergency.relation ? ` · ${emergency.relation}` : ""} · ${emergency.phone}` : "—"} />
        <Row label="Teslim borcu" value={debt > 0 ? formatTry(debt) : "Yok"} />
      </Panel>
      {person.teamId ? (
        <Panel title="Maç forma numarası">
          <p className="mb-3 text-sm text-[var(--muted)]">Takım oyuncusunun maç numarası. Kart boşsa maç forması teslimindeki numara yazılır. Teslimden alınır ya da elle yazılır.</p>
          {canWrite ? (
            <form action={saveMatchNumber.bind(null, clubId, person.id)} className="flex flex-wrap items-end gap-3">
              {returnTo ? <input type="hidden" name="donus" value={returnTo} /> : null}
              <Field label="Numara"><input name="numara" defaultValue={person.matchNumber ?? ""} placeholder="23" className={fieldClass} /></Field>
              <button name="kaynak" value="elle" className="btn-club">Kaydet</button>
              {deliveredNumber ? <button name="kaynak" value="teslim" className="admin-text-btn">Teslimden al ({deliveredNumber})</button> : null}
            </form>
          ) : <Row label="Numara" value={person.matchNumber || "—"} />}
        </Panel>
      ) : null}
      <Panel title="Teslim">
        {deliveries.length ? deliveries.map((line) => (
          <p key={line.row.id} className="text-sm leading-6">
            {[line.name, line.row.size ? `beden ${line.row.size}` : "", line.row.number ? `no ${line.row.number}` : "", line.row.count && line.row.count > 1 ? `${line.row.count} adet` : "", formatDay(line.row.date), line.giver].filter(Boolean).join(" · ")}
            {" · "}
            {line.row.price === 0 ? "ücretsiz" : line.left === 0 ? `${formatTry(line.paid)} ödendi` : line.paid > 0 ? `${formatTry(line.paid)} alındı, ${formatTry(line.left)} borç` : `${formatTry(line.left)} borç`}
          </p>
        )) : <p className="text-sm text-[var(--muted)]">Bu sporcuya teslim yok.</p>}
      </Panel>
      <Panel title="Hareket">
        {profile.marks.map((mark) => <p key={mark.sessionId} className="text-sm text-[var(--muted)]">Yoklama: {statusLabel[mark.status]}</p>)}
        {profile.bookings.map((booking) => <p key={booking.sessionId} className="text-sm text-[var(--muted)]">Seans: {statusLabel[booking.status]}</p>)}
        {profile.marks.length === 0 && profile.bookings.length === 0 ? <p className="text-sm text-[var(--muted)]">Henüz hareket yok.</p> : null}
      </Panel>
    </div>
  );
}

function AthleteDues({
  club,
  viewer,
  person,
}: {
  club: Club;
  viewer: Viewer;
  person: NonNullable<ReturnType<typeof personProfile>>["person"];
}) {
  const ledger = readState();
  const history = [
    ...ledger.duePayments.filter((item) => item.clubId === club.id && item.personId === person.id),
    ...ledger.dueOverrides.filter((item) => item.clubId === club.id && item.personId === person.id),
  ];
  const span = duesSeasonMonths(person, listYearSeasons(club.id), listTeams(club.id, viewer), listSports(club.id), todayISO, history);
  const rows = span.months.map((month) => duesForMonth([person], month, todayISO, ledger.duePayments, ledger.dueOverrides)[0]).filter(Boolean);
  const charges = ledger.extraCharges.filter((item) => item.clubId === club.id && item.personId === person.id);
  return (
    <Panel title="Aidat geçmişi">
      <p className="mb-3 text-sm text-[var(--muted)]">
        {span.seasonName ? `${span.seasonName} listesi sezon sonuna kadar durur. ` : ""}
        Tahsilat bu kartta yazılmaz. Ayın yönetimi aidat sayfasında açılır.
      </p>
      {rows.length ? (
        <Table
          columns={["Ay", "Ücret", "Ödenen", "Kalan", "Durum", ""]}
          rows={rows.map((due) => [
            monthLabel(due.month),
            due.billed || due.custom ? formatTry(due.amount) : "—",
            formatTry(due.paid),
            due.billed ? formatTry(due.remaining) : "—",
            due.note || due.status,
            <Link key={due.month} href={`/aidat?al=${person.id}&ay=${due.month}`} className="admin-text-btn">Yönet</Link>,
          ])}
        />
      ) : <p className="text-sm text-[var(--muted)]">Aidat satırı yok.</p>}
      {charges.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Teslim ve diğer borç</p>
          <Table
            columns={["Kalem", "Tutar", "Ödenen", "Kalan", ""]}
            rows={charges.map((charge) => {
              const paid = ledger.extraPayments.filter((item) => item.chargeId === charge.id).reduce((sum, item) => sum + item.amount, 0);
              return [
                charge.title,
                formatTry(charge.amount),
                formatTry(paid),
                formatTry(Math.max(0, charge.amount - paid)),
                <Link key={charge.id} href={`/aidat?al=${person.id}&kalem=${charge.id}`} className="admin-text-btn">Yönet</Link>,
              ];
            })}
          />
        </div>
      ) : null}
    </Panel>
  );
}

function measureLine(item: { date: string; heightCm?: number; weightKg?: number; spanCm?: number; shoe?: string }) {
  return `${formatDay(item.date)} · ${item.heightCm ? `${item.heightCm} cm` : "boy yok"} · ${item.weightKg ? `${item.weightKg} kg` : "kilo yok"} · ${item.spanCm ? `kol ${item.spanCm} cm` : "kol yok"} · ${item.shoe ? `ayak ${item.shoe}` : "ayak yok"}`;
}

function AthleteRoll({
  club,
  viewer,
  marks,
}: {
  club: Club;
  viewer: Viewer;
  marks: NonNullable<ReturnType<typeof personProfile>>["marks"];
}) {
  const sessions = liveTrainings(club.id, viewer);
  const rows = marks
    .flatMap((mark) => {
      const session = sessions.find((item) => item.id === mark.sessionId);
      if (!session) return [];
      return [{
        key: `${mark.sessionId}-${mark.personId}`,
        status: statusLabel[mark.status] ?? mark.status,
        when: `${formatDay(session.date)} ${session.start}`,
        title: session.title,
        salon: facilityName(session.facilityId),
        sort: `${session.date} ${session.start}`,
      }];
    })
    .sort((left, right) => right.sort.localeCompare(left.sort));
  return (
    <Panel title="Yoklama">
      <p className="mb-3 text-sm text-[var(--muted)]">Bu liste yoklamadan gelir. Veliye gidecek kopya bildirim merkezinde durur, buradan gönderilmez.</p>
      {rows.length ? (
        <div className="grid gap-2">
          {rows.map((row) => (
            <p key={row.key} className="text-sm">
              <span className="font-semibold">{row.status}</span>
              {` · ${row.title}`}
              {row.when ? ` · ${row.when}` : ""}
              {row.salon ? ` · ${row.salon}` : ""}
            </p>
          ))}
        </div>
      ) : <p className="text-sm text-[var(--muted)]">Henüz yoklama yok.</p>}
    </Panel>
  );
}

function AthleteMeasure({ club, viewer, personId, returnTo }: { club: Club; viewer: Viewer; personId: string; returnTo?: string }) {
  const track = athleteDevelopment(personId, directory());
  const canWrite = canEditRoster(viewer, club.id);
  return (
    <div className="grid gap-4">
      <Panel title="Başlangıç ölçüsü">
        <p className="mb-3 text-sm">{track.start ? measureLine(track.start) : "Henüz başlangıç yok."}</p>
        {canWrite ? (
          <form action={saveAthleteTrack.bind(null, club.id, personId)} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="bolum" value="baslangic" />
            {returnTo ? <input type="hidden" name="donus" value={returnTo} /> : null}
            <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={track.start?.date ?? todayISO} className={fieldClass} /></Field>
            <Field label="Boy"><input name="height" type="number" min={40} max={250} step="0.1" defaultValue={track.start?.heightCm} placeholder="cm" className={fieldClass} /></Field>
            <Field label="Kilo"><input name="weight" type="number" min={10} max={200} step="0.1" defaultValue={track.start?.weightKg} placeholder="kg" className={fieldClass} /></Field>
            <Field label="Kol açıklığı"><input name="span" type="number" min={80} max={250} step="0.1" defaultValue={track.start?.spanCm} placeholder="cm" className={fieldClass} /></Field>
            <Field label="Ayak"><input name="shoe" defaultValue={track.start?.shoe ?? ""} placeholder="38" className={fieldClass} /></Field>
            <div className="md:col-span-3"><button className="btn-club">Başlangıcı kaydet</button></div>
          </form>
        ) : null}
      </Panel>
      <Panel title="Aylık ölçü">
        <div className="mb-3 grid gap-1 text-sm">
          {track.monthly.length ? track.monthly.map((item, index) => <p key={`${item.date}-${index}`}>{measureLine(item)}</p>) : <p className="text-[var(--muted)]">Aylık ölçü yok.</p>}
        </div>
        {canWrite ? (
          <form action={saveAthleteTrack.bind(null, club.id, personId)} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="bolum" value="aylik" />
            {returnTo ? <input type="hidden" name="donus" value={returnTo} /> : null}
            <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={todayISO} className={fieldClass} /></Field>
            <Field label="Boy"><input name="height" type="number" min={40} max={250} step="0.1" placeholder="cm" className={fieldClass} /></Field>
            <Field label="Kilo"><input name="weight" type="number" min={10} max={200} step="0.1" placeholder="kg" className={fieldClass} /></Field>
            <Field label="Kol açıklığı"><input name="span" type="number" min={80} max={250} step="0.1" placeholder="cm" className={fieldClass} /></Field>
            <Field label="Ayak"><input name="shoe" placeholder="38" className={fieldClass} /></Field>
            <div className="md:col-span-3"><button className="btn-club">Ölçüyü kaydet</button></div>
          </form>
        ) : null}
      </Panel>
    </div>
  );
}

function AthleteNotes({ club, viewer, personId, returnTo }: { club: Club; viewer: Viewer; personId: string; returnTo?: string }) {
  const track = athleteDevelopment(personId, directory());
  const canWrite = canEditRoster(viewer, club.id);
  return (
    <Panel title="Notlar">
      <div className="mb-4 grid gap-3">
        {track.notes.length ? track.notes.map((item, index) => (
          <article key={`${item.date}-${index}`} className="rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
            <p className="font-semibold">{item.title || "Not"}</p>
            <p className="text-[var(--muted)]">{formatDay(item.date)}</p>
            <p className="mt-2 whitespace-pre-wrap">{item.text}</p>
          </article>
        )) : <p className="text-sm text-[var(--muted)]">Henüz not yok.</p>}
      </div>
      {canWrite ? (
        <form action={saveAthleteTrack.bind(null, club.id, personId)} className="grid gap-3">
          <input type="hidden" name="bolum" value="not" />
          {returnTo ? <input type="hidden" name="donus" value={returnTo} /> : null}
          <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={todayISO} className={fieldClass} /></Field>
          <Field label="Başlık"><input name="title" maxLength={60} placeholder="Antrenman notu" className={fieldClass} /></Field>
          <Field label="Yazı"><textarea name="text" required maxLength={800} rows={4} className={fieldClass} placeholder="Ne görüldü, ne takip edilecek" /></Field>
          <button className="btn-club w-fit">Notu kaydet</button>
        </form>
      ) : null}
    </Panel>
  );
}

function AthletePast({ club, viewer, personId, returnTo }: { club: Club; viewer: Viewer; personId: string; returnTo?: string }) {
  const track = athleteDevelopment(personId, directory());
  const canWrite = canEditRoster(viewer, club.id);
  return (
    <Panel title="Basket geçmişi">
      <div className="mb-4 grid gap-3">
        {track.basketballHistory.length ? track.basketballHistory.map((item, index) => (
          <article key={`${item.date}-${index}`} className="rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
            <p className="font-semibold">{[item.season, item.place, item.position].filter(Boolean).join(" · ") || "Geçmiş"}</p>
            <p className="text-[var(--muted)]">{formatDay(item.date)}</p>
            <p className="mt-2 whitespace-pre-wrap">{item.text}</p>
          </article>
        )) : <p className="text-sm text-[var(--muted)]">Geçmiş yazılmadı.</p>}
      </div>
      {canWrite ? (
        <form action={saveAthleteTrack.bind(null, club.id, personId)} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="bolum" value="gecmis" />
          {returnTo ? <input type="hidden" name="donus" value={returnTo} /> : null}
          <Field label="Tarih"><input name="date" type="date" required max={todayISO} defaultValue={todayISO} className={fieldClass} /></Field>
          <Field label="Sezon"><input name="season" placeholder="2024-2025" className={fieldClass} /></Field>
          <Field label="Kulüp veya takım"><input name="place" placeholder="Önceki kulüp" className={fieldClass} /></Field>
          <Field label="Pozisyon"><input name="position" placeholder="Gard" className={fieldClass} /></Field>
          <div className="md:col-span-2"><Field label="Yazı"><textarea name="text" required maxLength={800} rows={4} className={fieldClass} placeholder="Oynadığı yer, süre, not" /></Field></div>
          <button className="btn-club w-fit">Geçmişi kaydet</button>
        </form>
      ) : null}
    </Panel>
  );
}

function AthleteCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.7" cy="6.6" r="1.25" fill="currentColor" />
      <path d="M3.6 11c.45-1.15 1.25-1.7 2.1-1.7s1.65.55 2.1 1.7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9.1 6.2h3M9.1 8.3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Teams({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const groups = listTeams(club.id, viewer);
  const people = listPeople(club.id, viewer);
  const guardians = listGuardians(club.id);
  const sports = listSports(club.id);
  const seasons = listYearSeasons(club.id);
  const facilities = listFacilities(club.id, viewer).filter((facility) => !facility.branchId);
  const coaches = listStaff(club.id, viewer);
  const headCoach = coaches.find((member) => member.duty.toLocaleLowerCase("tr") === "başantrenör");
  const canEdit = canEditRoster(viewer, club.id);
  const open = query.kayit === "yeni";
  const opened = groups.find((team) => team.id === query.kart);
  const defaultSeason = seasons.find((season) => season.name === "2026-2027") ?? seasons.find((season) => season.active) ?? seasons[0];
  if (open) {
    return (
      <div>
        <PageHeader kicker="Spor operasyonları" title="Takım aç" description="Takım burada açılır. Kadro, takım kartının içinde ayrıca kaydedilir.">
          <Link href="/takimlar" className="btn-line">Listeye geri dön</Link>
        </PageHeader>
        {query.hata === "antrenor" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bir antrenör seçilir. Liste personelden gelir.</p> : null}
        {query.hata && query.hata !== "antrenor" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Takım açılamadı. Ad, branş, sezon ve antrenör kontrol edilsin.</p> : null}
        <Panel title="Yeni takım" action={<button type="submit" form="takim-ac" className="btn-club">Kaydet</button>}>
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
            <Field label="Tesis">
              <select name="facilityId" className={fieldClass} defaultValue="">
                <option value="">Tesis yok</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>{facility.name}</option>
                ))}
              </select>
            </Field>
            {coaches.length ? <CoachRows staff={coaches.map((item) => ({ id: item.id, name: item.name, duty: item.duty }))} defaultId={headCoach?.id ?? coaches[0].id} /> : (
              <p className="text-sm text-[var(--muted)] md:col-span-2">Personel yok. Önce personel açılır.</p>
            )}
          </form>
        </Panel>
      </div>
    );
  }
  if (opened) {
    const roster = people.filter((person) => person.teamId === opened.id);
    const kind = opened.kind === "school" ? "school" : "squad";
    const candidates = people.filter((person) => person.kind === "athlete" && person.teamId !== opened.id && (person.enrollment === "school" ? "school" : "squad") === kind);
    const athlete = roster.find((person) => person.id === query.sporcu);
    const athleteProfile = athlete ? personProfile(club.id, viewer, athlete.id) : undefined;
    const athleteTabs = ["ozet", "aidat", "yoklama", "olcu", "not", "gecmis"] as const;
    const athleteTab = athleteTabs.some((item) => item === query.sekme) ? query.sekme! : "ozet";
    const teamHref = `/takimlar?kart=${opened.id}`;
    const onAthlete = Boolean(athlete && athleteProfile);
    return (
      <div>
        <PageHeader
          kicker="Takım kartı"
          title={opened.name}
          description={onAthlete ? "Sporcu özellikleri bu sekmede. Takım sekmesi kadroyu ve takım özelliklerini tutar." : "Takım özellikleri bu sekmede. Sporcu kartı, kadro satırındaki simgeden açılır."}
        >
          <Link href="/takimlar" className="btn-line">Listeye geri dön</Link>
        </PageHeader>
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href={teamHref} className={onAthlete ? "admin-text-btn" : "btn-club"}>Takım</Link>
          {onAthlete && athlete ? <Link href={`${teamHref}&sporcu=${athlete.id}`} className="btn-club">{athlete.name}</Link> : null}
        </div>
        {query.kadro === "yazildi" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Sporcu kadroya yazıldı.</p> : null}
        {query.kadro === "cikti" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Sporcu kadrodan çıkarıldı.</p> : null}
        {query.hata === "kadro" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Sporcu bu takımın türüyle uyuşmuyor.</p> : null}
        {onAthlete && athlete && athleteProfile ? (
          <AthletePane
            club={club}
            viewer={viewer}
            person={athlete}
            profile={athleteProfile}
            tab={athleteTab}
            hrefFor={(id) => `${teamHref}&sporcu=${athlete.id}&sekme=${id}`}
            returnTo={`${teamHref}&sporcu=${athlete.id}`}
            notice={Boolean(query.takip)}
            error={query.hata}
            editHref={canEdit ? `/sporcular?kayit=${athlete.id}` : undefined}
          />
        ) : (
          <>
            <Panel title="Takım">
              <Row label="Tür" value={kind === "school" ? "Spor okulu" : "Takım"} />
              <Row label="Branş" value={sportName(opened.sportId)} />
              <Row label="Sezon" value={listSeasons(club.id).find((season) => season.id === opened.seasonId)?.name ?? "—"} />
              <Row label="Tesis" value={opened.facilityId ? facilityName(opened.facilityId) : "Tesis yok"} />
              <Row label="Antrenör" value={[staffName(opened.coachStaffId), ...(opened.extraCoachIds ?? []).map((id) => staffName(id))].join(", ")} />
            </Panel>
            <Panel title="Kadro">
              {roster.length ? (
                <Table
                  columns={["Sporcu", "Veli", "Durum", ""]}
                  rows={roster.map((person) => {
                    const cardHref = `${teamHref}&sporcu=${person.id}`;
                    return [
                      <Link key={person.id} href={cardHref} className="font-semibold">{person.name}</Link>,
                      guardianLabel(person, guardians) || "—",
                      <Tag key={`${person.id}-s`} tone={statusTone(person.status)}>{statusLabel[person.status]}</Tag>,
                      <span key={`${person.id}-a`} className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Link href={cardHref} className="icon-btn" aria-label={`${person.name} kartını aç`} title="Sporcu kartı">
                          <AthleteCardIcon />
                        </Link>
                        {canEdit ? (
                          <RosterLift name={person.name} team={opened.name} action={liftAthlete.bind(null, club.id, opened.id, person.id)} />
                        ) : null}
                      </span>,
                    ];
                  })}
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
          </>
        )}
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
            [staffName(team.coachStaffId), ...(team.extraCoachIds ?? []).map((id) => staffName(id))].join(", "),
            String(people.filter((person) => person.teamId === team.id).length),
            <Link key={team.id} href={`/takimlar?kart=${team.id}`} className="admin-text-btn">Kart</Link>,
          ])}
        />
      </Panel>
    </div>
  );
}

function laterHour(start?: string) {
  if (!start || !/^\d{2}:\d{2}$/.test(start)) return "17:30";
  const [hour, minute] = start.split(":").map(Number);
  const total = Math.min(hour * 60 + minute + 90, 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function Calendar({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  if (query.ayar) return <PlanPage club={club} viewer={viewer} query={query} />;
  const view = query.gorunum === "gun" || query.gorunum === "ay" ? query.gorunum : "hafta";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(query.gun ?? "") ? query.gun! : todayISO;
  const sessions = liveTrainings(club.id, viewer);
  const places = listFacilities(club.id, viewer);
  const teams = listTeams(club.id, viewer);
  const coaches = listStaff(club.id, viewer);
  const notices = readState().planNotices.filter((notice) => notice.clubId === club.id).slice(0, 4).map((notice) => notice.summary);
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Antrenman takvimi" description="Hafta açılır. Grubu günün saatine bırak. Saat ve salon takvimin üstündeki pencerede yazılır." />
      {query.planlandi ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">{query.seri ? `${query.seri} antrenman seri olarak takvime yazıldı.` : "Antrenman takvime yazıldı."}</p> : null}
      {query.iptal ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Antrenman iptal edildi.</p> : null}
      {query.hata === "cakisma" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu salonda aynı saatte kayıt var.</p> : null}
      {query.hata === "gecmis" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Geçmiş seans yeniden yazılmaz.</p> : null}
      {query.hata === "plan" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Takım, salon ve saat yazılır. Bitiş, başlangıçtan sonra olur.</p> : null}
      <Planner
        day={day}
        view={view}
        today={todayISO}
        canPlan={canEditRoster(viewer, club.id)}
        placeDrops={placeDrops.bind(null, club.id)}
        sessions={sessions.map((session) => ({
          id: session.id,
          facilityId: session.facilityId,
          teamId: session.teamId,
          sportId: session.sportId,
          coachStaffId: session.coachStaffId,
          coverStaffIds: session.coverStaffIds,
          title: session.title,
          date: session.date,
          start: session.start,
          end: session.end,
          kind: session.kind,
        }))}
        places={places.map((place) => ({ id: place.id, name: place.name }))}
        teams={teams.map((team) => ({ id: team.id, name: team.name, sportId: team.sportId, sport: sportName(team.sportId), coach: team.coachStaffId ? staffName(team.coachStaffId) : "" }))}
        sports={listSports(club.id).map((sport) => ({ id: sport.id, name: sport.name }))}
        coaches={coaches.map((member) => ({ id: member.id, name: member.name }))}
        notices={notices}
      />
    </div>
  );
}

function PlanPage({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const sessions = liveTrainings(club.id, viewer);
  const editing = query.ayar === "yeni" ? undefined : sessions.find((session) => session.id === query.ayar);
  if (editing?.kind === "private") redirect(`/ozel-ders?ders=${editing.id}`);
  if (query.ayar !== "yeni" && !editing) return <NoAccess label="Bu antrenman" />;
  const teams = listTeams(club.id, viewer);
  const places = listFacilities(club.id, viewer);
  const staff = listStaff(club.id, viewer);
  const date = editing?.date || ((query.gun && /^\d{4}-\d{2}-\d{2}$/.test(query.gun)) ? query.gun : todayISO);
  const past = date < todayISO;
  const view = query.gorunum === "hafta" || query.gorunum === "ay" ? query.gorunum : "gun";
  const team = teams.find((item) => item.id === (editing?.teamId || teams[0]?.id));
  const teamCoaches = [team?.coachStaffId, ...(team?.extraCoachIds ?? [])].filter(Boolean) as string[];
  const canPlan = canEditRoster(viewer, club.id) && !past;
  const back = `/takvim?gun=${date}&gorunum=${view}`;
  return (
    <div>
      <PageHeader kicker="Antrenman ayarı" title={editing?.title || "Antrenman yerleştir"} description={editing ? "Takvim burada kaydetmez. Bu sayfadaki kayıt, salona ve saate yazılır. Takımın antrenörü otomatik gelir." : "Başlangıç ve bitiş boş kalabilir. Günlere ayrı salon verilir. Dolu saat başka gruba yazılmaz."}>
        <span className="flex flex-wrap gap-2">
          {canPlan ? <button form="plan-kayit" className="btn-club">Kaydet</button> : null}
          <Link href={back} className="btn-line">Takvime dön</Link>
        </span>
      </PageHeader>
      {query.kadro ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Bu antrenmanın kadrosu kaydedildi. Takımın antrenör listesi değişmedi.</p> : null}
      {past ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Geçmiş seans yalnız izlenir.</p> : null}
      {!editing && canPlan ? (
        <SeriesPlan
          action={planSession.bind(null, club.id)}
          today={todayISO}
          view={view}
          teams={teams.map((item) => ({
            id: item.id,
            name: item.name,
            coachStaffId: item.coachStaffId,
            coachName: staffName(item.coachStaffId),
          }))}
          places={places.map((place) => ({ id: place.id, name: place.name }))}
          sessions={sessions.map((session) => ({
            id: session.id,
            date: session.date,
            start: session.start,
            end: session.end,
            facilityId: session.facilityId,
            facilityName: facilityName(session.facilityId),
            teamId: session.teamId,
            teamName: session.teamId ? teamName(session.teamId) : session.title,
            coachStaffId: session.coachStaffId,
            coachName: staffName(session.coachStaffId),
          }))}
          pickedDate={query.gun && /^\d{4}-\d{2}-\d{2}$/.test(query.gun) ? query.gun : undefined}
          initialStart={query.saat && /^\d{2}:\d{2}$/.test(query.saat) ? query.saat : "16:00"}
          initialEnd={laterHour(query.saat)}
          initialPlace={query.salon}
          error={query.hata}
        />
      ) : null}
      {editing ? (
      <Panel title="Yerleşim">
        <form id="plan-kayit" action={planSession.bind(null, club.id)} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="assign" value="team" />
          <input type="hidden" name="gorunum" value={view} />
          <input type="hidden" name="eksen" value="salon" />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <Field label="Başlık"><input name="title" defaultValue={editing?.title ?? ""} placeholder="U12 antrenman" className={fieldClass} /></Field>
          <Field label="Takım">
            <select name="teamId" required className={fieldClass} defaultValue={editing?.teamId ?? teams[0]?.id}>
              {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Salon">
            <select name="facilityId" required className={fieldClass} defaultValue={editing?.facilityId ?? query.salon ?? places[0]?.id}>
              {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
            </select>
          </Field>
          <Field label="Gün"><input name="date" type="date" required readOnly={past} defaultValue={date} className={fieldClass} /></Field>
          <Field label="Başlangıç"><input name="start" type="time" required defaultValue={editing?.start ?? query.saat ?? "16:00"} className={fieldClass} /></Field>
          <Field label="Bitiş"><input name="end" type="time" required defaultValue={editing?.end ?? laterHour(query.saat)} className={fieldClass} /></Field>
          <p className="text-sm text-[var(--muted)] md:col-span-2">
            Takım antrenörü: {teamCoaches.length ? teamCoaches.map((id) => staffName(id)).join(", ") : "Takımda antrenör yok"}. {editing?.kind === "match" ? "Bu kayıt maçtır." : "Maç formu sonra açılır. Tür modelde durur."}
          </p>
        </form>
        {editing && canPlan ? (
          <form action={cancelSession.bind(null, club.id, editing.id)} className="mt-4">
            <input type="hidden" name="gorunum" value={view} />
            <button className="admin-text-btn">Bu antrenmanı iptal et</button>
          </form>
        ) : null}
      </Panel>
      ) : null}
      {editing && canPlan ? (
        <Panel title="Bu antrenmanın kadrosu">
          <p className="mb-3 text-sm text-[var(--muted)]">Katılamayan antrenör ve yerine gelen kişi yalnız bu saate yazılır. Takım kartındaki liste durur.</p>
          <form action={setSessionCrew.bind(null, club.id, editing.id)} className="grid gap-3">
            <input type="hidden" name="gorunum" value={view} />
            {teamCoaches.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="yok" value={id} defaultChecked={editing.absentStaffIds?.includes(id)} />
                {staffName(id)} katılamıyor
              </label>
            ))}
            {(editing.coverStaffIds ?? []).map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="kadro" value={id} defaultChecked />
                {staffName(id)} bu antrenmanda
              </label>
            ))}
            <Field label="Ek antrenör">
              <select name="ek" className={fieldClass} defaultValue="">
                <option value="">Ekleme</option>
                {staff.filter((member) => !teamCoaches.includes(member.id) && !editing.coverStaffIds?.includes(member.id)).map((member) => (
                  <option key={member.id} value={member.id}>{member.name} · {member.duty}</option>
                ))}
              </select>
            </Field>
            <button className="btn-club w-fit">Kadroyu kaydet</button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}

function RollCall({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const sessions = liveTrainings(club.id, viewer).filter((session) => session.kind === "training");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(query.gun ?? "") ? query.gun! : todayISO;
  const current = query.seans ? sessions.find((session) => session.id === query.seans) : undefined;
  if (query.seans && !current) return <NoAccess label="Bu antrenman" />;
  if (current) {
    const rows = attendanceFor(current.id, rosterFor(current, viewer, directory()), directory());
    const joined = rows.filter((row) => row.status === "present");
    const missed = rows.filter((row) => row.status === "absent" || row.status === "excused");
    const back = `/yoklama?gun=${day}`;
    return (
      <div>
        <PageHeader
          kicker="Yoklama"
          title={current.title}
          description={`${formatLong(current.date)} · ${current.start}–${current.end} · ${facilityName(current.facilityId)} · ${staffName(current.coachStaffId)}`}
        >
          <span className="flex flex-wrap gap-2">
            {rows.length ? <button form="yoklama-kayit" className="btn-club">Kaydet</button> : null}
            <Link href={back} className="btn-line">Listeye geri dön</Link>
          </span>
        </PageHeader>
        {query.kaydedildi ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">İşaretlenenler kaydedildi. Boş kalanlar duruyor. Veli listesi gönderilmedi.</p> : null}
        {query.hata === "bos" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Kaydetmek için en az bir sporcu işaretlenir.</p> : null}
        {query.hata === "kadro" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu grupta sporcu yok.</p> : null}
        {query.hata === "yetki" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p> : null}
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <Panel title={`Katılanlar · ${joined.length}`}>
            {joined.length ? joined.map((row) => <p key={row.personId} className="text-sm">{row.name}</p>) : <p className="text-sm text-[var(--muted)]">Henüz yok.</p>}
          </Panel>
          <Panel title={`Katılmayanlar · ${missed.length}`}>
            {missed.length ? missed.map((row) => <p key={row.personId} className="text-sm">{row.name}{row.status === "excused" ? " · İzinli" : ""}</p>) : <p className="text-sm text-[var(--muted)]">Henüz yok.</p>}
          </Panel>
        </div>
        <AttendanceBoard key={current.id} rows={rows} gun={day} action={saveRoll.bind(null, club.id, current.id)} />
      </div>
    );
  }
  const dir = directory();
  const places = listFacilities(club.id, viewer);
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Yoklama" description="Haftadaki gruplar takvimdeki yerinde durur. Yoklama al, o saatin kadrosunu açar. Saat ve salon burada değişmez." />
      {query.hata === "seans" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu antrenman yok.</p> : null}
      {sessions.length === 0 ? <p className="mb-4 text-sm text-[var(--muted)]">Yerleşmiş grup yok. Takvime yazılınca burada görünür.</p> : null}
      <RollWeek
        day={day}
        today={todayISO}
        places={places.map((place) => ({ id: place.id, name: place.name }))}
        sports={listSports(club.id).map((sport) => ({ id: sport.id, name: sport.name }))}
        sessions={sessions.map((session) => {
          const rows = attendanceFor(session.id, rosterFor(session, viewer, dir), dir);
          return {
            id: session.id,
            facilityId: session.facilityId,
            sportId: session.sportId,
            title: session.title,
            date: session.date,
            start: session.start,
            coach: staffName(session.coachStaffId),
            salon: facilityName(session.facilityId),
            taken: rows.length > 0 && rows.every((row) => row.status !== "pending"),
          };
        })}
      />
    </div>
  );
}

function gearGiven(rows: { itemId: string; count?: number }[], itemId: string) {
  return rows.filter((row) => row.itemId === itemId).reduce((sum, row) => sum + (row.count && row.count > 0 ? row.count : 1), 0);
}

function soleSize(rows: { itemId: string; size: string }[], itemId: string) {
  const sizes = [...new Set(rows.filter((row) => row.itemId === itemId && row.size).map((row) => row.size))];
  return sizes.length === 1 ? sizes[0] : "";
}

function gearLabel(item: { name: string; size?: string; qty?: number }, place: string, left: number) {
  return [item.name, item.size, place, `${left} kaldı`].filter(Boolean).join(" · ");
}

function Stock({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const state = readState();
  const items = state.gearItems.filter((item) => item.clubId === club.id);
  const places = listFacilities(club.id, viewer);
  const canEdit = canEditStructure(viewer, club.id);
  const editing = items.find((item) => item.id === query.kayit);
  const open = query.kayit === "yeni" || Boolean(editing);
  const used = editing ? state.gearDeliveries.some((row) => row.itemId === editing.id) : false;
  const given = editing ? gearGiven(state.gearDeliveries, editing.id) : 0;
  const hinted = editing?.size || (editing ? soleSize(state.gearDeliveries, editing.id) : "");
  if (open) {
    return (
      <div>
        <PageHeader kicker="İşletme" title={editing ? editing.name : "Yeni ürün"} description={editing ? "Bu satırın adedi düzeltilir. Yeni beden, ürün ekle ile açılır." : "Beden kutusu yok. Antrenman forması ya da maç forması işaretlenirse standart bedenler açılır. İşaret yoksa ürün bedensiz, tek adetle açılır."}>
          <span className="flex flex-wrap gap-2">
            {canEdit ? <button form="stok-kayit" className="btn-club">Kaydet</button> : null}
            <Link href="/stok" className="admin-text-btn">Liste</Link>
          </span>
        </PageHeader>
        {query.hata === "urun" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ad ve tesis yazılır. Forma işaretliyse en az bir bedene adet yazılır. Aynı ürün, aynı beden ve aynı tesiste tekrar açılmaz. Adet, teslim edilenden az olamaz.</p> : null}
        {query.hata === "yetki" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p> : null}
        {places.length === 0 ? <p className="mb-4 text-sm text-[var(--muted)]">Önce bir tesis açılır. Stok o tesiste durur.</p> : null}
        <Panel>
          <GearProductForm
            action={saveGearItem.bind(null, club.id, editing?.id ?? "yeni")}
            places={places.map((place) => ({ id: place.id, name: place.name }))}
            creating={!editing}
            name={editing?.name ?? ""}
            facilityId={editing?.facilityId ?? ""}
            qty={editing?.qty}
            given={given}
            size={hinted}
            sizes={hinted && !(jerseySizes as readonly string[]).includes(hinted) ? [hinted, ...jerseySizes] : [...jerseySizes]}
            training={editing?.kind === "training" || Boolean(editing && editing.kind !== "match" && editing.kind !== "plain" && hinted)}
            match={editing?.kind === "match"}
          />
          {given > 0 ? <p className="mt-3 text-sm text-[var(--muted)]">Bu satırdan {given} adet teslim edildi. Adet bunun altına inmez.</p> : null}
          {editing && canEdit ? (
            used ? <p className="mt-4 text-sm text-[var(--muted)]">Bu üründen teslim var. Silinemez.</p> : query.sil === editing.id ? (
              <form action={removeGearItem.bind(null, club.id, editing.id)} className="mt-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
                <p><span className="font-semibold">{editing.name}</span> silinecek.</p>
                <div className="mt-3 flex gap-3">
                  <input type="hidden" name="onay" value="sil" />
                  <Link href={`/stok?kayit=${editing.id}`} className="admin-text-btn">Vazgeç</Link>
                  <button className="btn-club">Sil</button>
                </div>
              </form>
            ) : <Link href={`/stok?kayit=${editing.id}&sil=${editing.id}`} className="admin-text-btn mt-4 inline-block">Sil</Link>
          ) : null}
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="İşletme" title="Stok ve depolar" description="Depo, açılmış tesistir. Forma işaretlenince her beden ayrı satır olur. Top bedensiz açılır. Kalan, teslim düşünce görünür.">
        {canEdit ? <Link href="/stok?kayit=yeni" className="btn-club">Ürün ekle</Link> : null}
      </PageHeader>
      {query.eklendi === "urun" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Ürün eklendi.</p> : null}
      {query.guncellendi === "urun" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Ürün düzeltildi.</p> : null}
      {query.cikarildi === "urun" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Ürün silindi.</p> : null}
      <Panel>
        {items.length ? (
          <Table
            columns={["Ürün", "Tür", "Beden", "Tesis", "Adet", "Teslim", "Kalan", ""]}
            rows={items.map((item) => {
              const handed = gearGiven(state.gearDeliveries, item.id);
              const written = typeof item.qty === "number";
              return [
                item.name,
                item.kind === "training" ? "Antrenman" : item.kind === "match" ? "Maç" : "—",
                item.size || "—",
                item.facilityId ? facilityName(item.facilityId) : "Tesis yok",
                written ? String(item.qty) : "—",
                String(handed),
                written ? String(Math.max(0, (item.qty ?? 0) - handed)) : "—",
                canEdit ? <Link key={item.id} href={`/stok?kayit=${item.id}`} className="admin-text-btn">Düzelt</Link> : null,
              ];
            })}
          />
        ) : <p className="text-sm text-[var(--muted)]">Henüz ürün yok. Antrenman forması işaretlenip Small bedene 100 yazılır.</p>}
      </Panel>
    </div>
  );
}

function Custody({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const state = readState();
  const items = state.gearItems.filter((item) => item.clubId === club.id);
  const stock = items.filter((item) => item.facilityId && typeof item.qty === "number" && item.qty - gearGiven(state.gearDeliveries, item.id) > 0);
  const people = listPeople(club.id, viewer).filter((person) => person.kind === "athlete" && person.status !== "left");
  const staff = listStaff(club.id, viewer);
  const canWrite = canCollect(viewer, club.id);
  const rows = state.gearDeliveries
    .filter((row) => row.clubId === club.id)
    .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));
  if (query.kayit === "yeni") {
    return (
      <div>
        <PageHeader kicker="İşletme" title="Teslim yaz" description="Stoktaki satır seçilir. Antrenman formasına numara yazılabilir. Maç forması numarası zorunludur ve takım oyuncusunun kartı boşsa karta da yazılır.">
          <span className="flex flex-wrap gap-2">
            {canWrite ? <button form="teslim-kayit" className="btn-club">Kaydet</button> : null}
            <Link href="/zimmet" className="admin-text-btn">Liste</Link>
          </span>
        </PageHeader>
        {query.hata === "teslim" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Kalanı olan bir ürün, sporcu, adet, gün, teslim eden ve fiyat yazılır. Maç forması numarası 1, 2 veya 3 hane yazılır. Antrenman forması numarası boş kalabilir. Ücret alındıysa kanal da seçilir.</p> : null}
        {query.hata === "yetki" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p> : null}
        {stock.length === 0 ? <p className="mb-4 text-sm text-[var(--muted)]">Önce stoktan, tesis ve adet yazılmış bir ürün açılır.</p> : null}
        <Panel>
          <form id="teslim-kayit" action={deliverGear.bind(null, club.id)} className="grid gap-3 md:grid-cols-2">
            <Field label="Ürün">
              <select name="itemId" required className={fieldClass} defaultValue={stock[0]?.id ?? ""}>
                {stock.map((item) => {
                  const left = (item.qty ?? 0) - gearGiven(state.gearDeliveries, item.id);
                  return <option key={item.id} value={item.id}>{gearLabel(item, item.facilityId ? facilityName(item.facilityId) : "", left)}</option>;
                })}
              </select>
            </Field>
            <Field label="Adet"><input name="count" type="number" min={1} required defaultValue={1} className={fieldClass} /></Field>
            <Field label="Forma numarası"><input name="numara" placeholder="23. Antrenman ve maç formasına yazılır" className={fieldClass} /></Field>
            <Field label="Sporcu">
              <select name="personId" required className={fieldClass}>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </Field>
            <Field label="Gün"><input name="date" type="date" required defaultValue={todayISO} max={todayISO} className={fieldClass} /></Field>
            <Field label="Teslim eden">
              <select name="staffId" required className={fieldClass}>
                {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </Field>
            <Field label="Fiyat"><input name="price" type="number" min={0} required placeholder="1500" className={fieldClass} /></Field>
            <Field label="Ücret">
              <select name="paid" className={fieldClass} defaultValue="">
                <option value="">Alınmadı</option>
                <option value="1">Alındı</option>
              </select>
            </Field>
            <Field label="Kanal">
              <select name="method" className={fieldClass} defaultValue="">
                <option value="">Ücret alındıysa seçilir</option>
                <option value="cash">Nakit</option>
                <option value="transfer">Havale</option>
                <option value="card">Kart</option>
              </select>
            </Field>
          </form>
        </Panel>
      </div>
    );
  }
  const confirming = rows.find((row) => row.id === query.sil);
  return (
    <div>
      <PageHeader kicker="İşletme" title="Zimmet işlemleri" description="Teslim burada yazılır. Alınmayan ücret sporcunun kartında ve aidatın kalan hanesinde borç olarak durur.">
        {canWrite ? <Link href="/zimmet?kayit=yeni" className="btn-club">Teslim yaz</Link> : null}
      </PageHeader>
      {query.eklendi === "teslim" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Teslim kaydedildi.</p> : null}
      {query.cikarildi === "teslim" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Teslim silindi. Borç da kalktı.</p> : null}
      {confirming ? (
        <form action={removeGearDelivery.bind(null, club.id, confirming.id)} className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
          <p><span className="font-semibold">{nameOf(confirming.personId)}</span> teslimi silinecek. Alınan ücret ve borç birlikte kalkar.</p>
          <div className="mt-3 flex gap-3">
            <input type="hidden" name="onay" value="sil" />
            <Link href="/zimmet" className="admin-text-btn">Vazgeç</Link>
            <button className="btn-club">Sil</button>
          </div>
        </form>
      ) : null}
      <Panel>
        {rows.length ? (
          <Table
            columns={["Ürün", "Beden", "No", "Adet", "Sporcu", "Gün", "Teslim eden", "Fiyat", "Alınan", "Borç", ""]}
            rows={rows.map((row) => {
              const paid = state.extraPayments.filter((item) => item.chargeId === row.chargeId).reduce((sum, item) => sum + item.amount, 0);
              const left = Math.max(0, row.price - paid);
              const item = items.find((gear) => gear.id === row.itemId);
              return [
                item?.name ?? "Ürün",
                row.size || "—",
                row.number || "—",
                String(row.count && row.count > 0 ? row.count : 1),
                nameOf(row.personId),
                formatDay(row.date),
                staffName(row.staffId),
                formatTry(row.price),
                formatTry(paid),
                formatTry(left),
                canWrite ? <Link key={row.id} href={`/zimmet?sil=${row.id}`} className="admin-text-btn">Sil</Link> : null,
              ];
            })}
          />
        ) : <p className="text-sm text-[var(--muted)]">Henüz teslim yok.</p>}
      </Panel>
    </div>
  );
}

function Titles({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const titles = listTitles(club.id);
  const members = listStaff(club.id, viewer);
  const canEdit = canEditStructure(viewer, club.id);
  const editing = titles.find((title) => title.id === query.kayit);
  const open = query.kayit === "yeni" || Boolean(editing);
  const used = editing ? members.some((member) => member.titleId === editing.id || member.duty === editing.name) : false;
  if (open) {
    return (
      <div>
        <PageHeader kicker="İşletme" title={editing ? editing.name : "Yeni unvan"} description="Unvan burada açılır. Personel bu listeden seçer. Yetki daha sonra bağlanır.">
          <span className="flex flex-wrap gap-2">
            {canEdit ? <button form="unvan-kayit" className="btn-club">Kaydet</button> : null}
            <Link href="/unvanlar" className="admin-text-btn">Liste</Link>
          </span>
        </PageHeader>
        {query.hata === "unvan" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Unvan adı boş olamaz, aynı ad tekrar edemez. Personelde kayıtlı unvan silinemez.</p> : null}
        {query.hata === "yetki" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p> : null}
        <Panel>
          <form id="unvan-kayit" action={saveTitle.bind(null, club.id, editing?.id ?? "yeni")} className="grid gap-3">
            <Field label="Unvan adı"><input name="name" required defaultValue={editing?.name ?? ""} placeholder="Kondisyoner" className={fieldClass} /></Field>
          </form>
          {editing && canEdit ? (
            used ? <p className="mt-4 text-sm text-[var(--muted)]">Bu unvan personelde kayıtlı. Silinemez.</p> : query.sil === editing.id ? (
              <form action={removeTitle.bind(null, club.id, editing.id)} className="mt-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
                <p><span className="font-semibold">{editing.name}</span> silinecek. Bu geri alınamaz.</p>
                <div className="mt-3 flex gap-3">
                  <input type="hidden" name="onay" value="sil" />
                  <Link href={`/unvanlar?kayit=${editing.id}`} className="admin-text-btn">Vazgeç</Link>
                  <button className="btn-club">Sil</button>
                </div>
              </form>
            ) : <Link href={`/unvanlar?kayit=${editing.id}&sil=${editing.id}`} className="admin-text-btn mt-4 inline-block">Sil</Link>
          ) : null}
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="İşletme" title="Unvanlar" description="Liste buradadır. Yeni unvan sağ üstten açılır. Ad yeter. Yetki sonra bağlanır.">
        {canEdit ? <Link href="/unvanlar?kayit=yeni" className="btn-club">Unvan ekle</Link> : null}
      </PageHeader>
      <Saved query={query} />
      <Panel>
        <Table
          columns={["Unvan", ""]}
          rows={titles.map((title) => [
            title.name,
            canEdit ? <Link key={title.id} href={`/unvanlar?kayit=${title.id}`} className="admin-text-btn">Düzelt</Link> : null,
          ])}
        />
      </Panel>
    </div>
  );
}

function StaffScreen({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const members = listStaff(club.id, viewer);
  const titles = listTitles(club.id);
  const sports = listSports(club.id);
  const places = listFacilities(club.id, viewer);
  const canEdit = canEditStructure(viewer, club.id);
  const open = query.kayit === "yeni" || members.some((member) => member.id === query.kayit);
  const editing = members.find((member) => member.id === query.kayit);
  const matched = titles.find((title) => title.id === editing?.titleId) ?? titles.find((title) => title.name === editing?.duty);
  if (open) {
    return (
      <div>
        <PageHeader kicker="İşletme" title={editing ? editing.name : "Yeni personel"} description="Personel burada açılır. Unvan iş adıdır. Giriş rolü hangi ekranın açılacağını belirler. Şifre skys2026.">
          <span className="flex flex-wrap gap-2">
            <button form="personel-kayit" className="btn-club">Kaydet</button>
            <Link href="/personel" className="admin-text-btn">Liste</Link>
          </span>
        </PageHeader>
        {query.hata === "personel" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ad, unvan, branş ve telefon yazılır. Aynı ad tekrar edemez.</p> : null}
        {query.hata === "eposta" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Giriş için e-posta ve rol birlikte yazılır. E-posta başka bir hesapta kullanılamaz.</p> : null}
        {query.hata === "yetki" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p> : null}
        <Panel>
          <form id="personel-kayit" action={saveStaff.bind(null, club.id, editing?.id ?? "yeni")} className="grid gap-3 md:grid-cols-2">
            <Field label="Ad soyad"><input name="name" required defaultValue={editing?.name ?? ""} className={fieldClass} /></Field>
            <Field label="Unvan">
              <select name="titleId" className={fieldClass} defaultValue={matched?.id ?? (editing ? "eski" : titles[0]?.id)}>
                {titles.map((title) => (
                  <option key={title.id} value={title.id}>{title.name}</option>
                ))}
                {editing && !matched ? <option value="eski">{editing.duty}</option> : null}
              </select>
            </Field>
            <Field label="Branş">
              <select name="sportId" required className={fieldClass} defaultValue={editing?.sportId ?? sports[0]?.id}>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Telefon"><input name="phone" required defaultValue={editing?.phone ?? ""} placeholder="05xx xxx xx xx" className={fieldClass} /></Field>
            <Field label="E-posta"><input name="email" type="email" required={query.kayit === "yeni"} defaultValue={editing?.email ?? ""} placeholder="ad@yeniufuklar.com" className={fieldClass} /></Field>
            <Field label="Giriş rolü">
              <select name="loginRole" className={fieldClass} defaultValue={editing?.loginRole ?? (query.kayit === "yeni" ? "coach" : "")}>
                {query.kayit === "yeni" ? null : <option value="">Giriş yok</option>}
                {loginRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Tesis">
              <select name="facilityId" className={fieldClass} defaultValue={editing?.facilityId ?? ""}>
                <option value="">Tesis yok</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>{place.name}</option>
                ))}
              </select>
            </Field>
          </form>
        </Panel>
      </div>
    );
  }
  return (
    <div>
      <PageHeader kicker="İşletme" title="Personel" description="Liste buradadır. Yeni personel sağ üstten açılır.">
        {canEdit ? <Link href="/personel?kayit=yeni" className="btn-club">Yeni personel</Link> : null}
      </PageHeader>
      <Saved query={query} />
      <Panel>
        <Table
          columns={["Ad", "Unvan", "Branş", "Telefon", "Giriş", "Tesis", ""]}
          rows={members.map((member) => [
            member.name,
            member.duty,
            member.sportId ? sportName(member.sportId) : "—",
            member.phone,
            member.email && member.loginRole ? `${member.email} · ${roleLabels[member.loginRole]}` : "Giriş yok",
            member.facilityId ? facilityName(member.facilityId) : "Tesis yok",
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
  return (
    <div>
      <PageHeader kicker="İletişim" title="Bildirim merkezi" description="Yoklama listesi burada kuyrukta durur. Bu ekrandan telefona gitmez. Eski örnek bildirimler kaldırıldı." />
      {canComposeNotice(viewer, club.id) ? (
        <form action={queueNotice.bind(null, club.id)} className="mb-4 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-[1fr_180px_auto]">
          <input name="title" placeholder="Bildirim metni" className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm" />
          <input name="audience" placeholder="Kime" defaultValue="U12 velileri" className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm" />
          <button className="btn-club">Kuyruğa al</button>
        </form>
      ) : null}
      <div className="grid gap-3">
        {readState().rollNotices.filter((notice) => notice.clubId === club.id).map((notice) => (
          <Panel key={notice.id} title={notice.title}>
            <Tag tone="warn">Kuyrukta</Tag>
            <p className="mt-2 text-sm text-[var(--muted)]">{notice.audience} · liste durur, gönderilmedi.</p>
            <div className="mt-3 grid gap-1">
              {notice.lines.map((line) => (
                <p key={line.personId} className="text-sm">{line.name} · {statusLabel[line.status]}</p>
              ))}
            </div>
          </Panel>
        ))}
        {notes.map((note) => (
          <Panel key={note.title} title={note.title}>
            <Tag tone="warn">Kuyrukta</Tag>
            <p className="mt-2 text-sm text-[var(--muted)]">{note.audience} · kayıt durur, teslim ayrı yürür.</p>
          </Panel>
        ))}
        {notes.length === 0 && readState().rollNotices.filter((notice) => notice.clubId === club.id).length === 0 ? (
          <Panel><p className="text-sm text-[var(--muted)]">Kuyrukta bildirim yok.</p></Panel>
        ) : null}
      </div>
    </div>
  );
}

function Reports({ club, viewer }: { club: Club; viewer: Viewer }) {
  const dir = directory();
  const sessions = liveTrainings(club.id, viewer)
    .filter((session) => session.date < todayISO && session.kind === "training")
    .sort((left, right) => right.date.localeCompare(left.date) || right.start.localeCompare(left.start));
  const latest = sessions[0];
  const marks = latest ? attendanceFor(latest.id, rosterFor(latest, viewer, dir), dir) : [];
  const answered = marks.filter((mark) => mark.status !== "pending");
  const present = marks.filter((mark) => mark.status === "present").length;
  const rate = answered.length ? Math.round((present / answered.length) * 100) : 0;
  const overdue = openDues(club.id, viewer);
  const overdueTotal = overdue.reduce((sum, row) => sum + row.remaining, 0);
  return (
    <div>
      <PageHeader kicker="Analiz" title="Raporlar" description="Son işaretlenmiş antrenmanın katılımı ve aidat ekranındaki gecikme. Ayrıntı yoklama raporunda ve aidatta." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={latest ? `${latest.title} katılım` : "Katılım"}>
          <div className="kpi-value">{latest && answered.length ? `${rate}%` : "—"}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {latest
              ? answered.length
                ? `${present}/${answered.length} katıldı · ${formatDay(latest.date)}`
                : `Yoklama işaretlenmedi · ${formatDay(latest.date)}`
              : "Geçmiş antrenman yok."}
          </p>
          <div className="mt-4 h-2 rounded-full bg-[#efeae1]">
            <div className="h-full rounded-full bg-[var(--club)]" style={{ width: `${rate}%` }} />
          </div>
        </Panel>
        <Panel title="Gecikmiş tahsilat">
          <div className="kpi-value">{overdue.length}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{formatTry(overdueTotal)} açık</p>
        </Panel>
      </div>
    </div>
  );
}

function Audit({ support }: { club: Club; support: boolean }) {
  return (
    <div>
      <PageHeader kicker="Analiz" title="İşlem geçmişi" description="Kulüp kaydının eski ve yeni değeri burada duracak. Örnek geçmiş listeden kalktı." />
      {support ? (
        <p className="mb-4 rounded-2xl bg-[var(--club-soft)] px-4 py-3 text-sm">Destek oturumu açık. İşlem düşmeye başlayınca bu giriş de burada görünecek.</p>
      ) : null}
      <Panel>
        <p className="text-sm text-[var(--muted)]">Henüz düşen işlem yok.</p>
      </Panel>
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
      <PageHeader kicker="Yetki" title="Ekran yetkileri" description="Bu matris giriş rolüdür: hangi ekranın açılacağı. Personelin iş unvanı ayrıdır ve Unvanlar sayfasında yönetilir. Şube müdürü kendi şubesini, antrenör atandığı grubu görür." />
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

function Saved({ query, quietAthlete }: { query: Record<string, string | undefined>; quietAthlete?: boolean }) {
  const saved = quietAthlete && (query.eklendi === "sporcu" || query.guncellendi === "sporcu") ? "" :
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
            : query.eklendi === "unvan"
              ? "Unvan eklendi."
              : query.guncellendi === "unvan"
                ? "Unvan düzeltildi."
                : query.cikarildi === "unvan"
                  ? "Unvan silindi."
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
  if (query.hata === "dogum") {
    return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Doğum günü boş kalabilir. Yazılırsa gün ve ay birlikte, o aya uygun seçilir.</p>;
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
