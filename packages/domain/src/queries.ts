import { can, membershipFor } from "./access";
import {
  attendance,
  audit,
  bookings,
  branches,
  clubs,
  credits,
  custodies,
  facilities,
  invoices,
  notices,
  people,
  plans,
  seasons,
  sports,
  staff,
  stock,
  teams,
  todayISO,
  trainings,
  warehouses,
} from "./catalog";
import type { AthleteDevelopment, AttendanceStatus, Directory, DueOverride, DuePayment, Person, StaffTitle, TitleScope, Training, UserAccount, Viewer } from "./types";

function withExtra<T>(base: T[], extra?: T[]) {
  return extra?.length ? base.concat(extra) : base;
}

export const staffTitles = ["Kulüp başkanı", "Başantrenör", "Antrenör", "Mali İşler Yetkili"] as const;

export const titleScopeLabels: Record<TitleScope, string> = {
  lead: "Yönetim",
  coach: "Antrenör kadrosu",
  finance: "Tahsilat",
};

export function starterTitles(clubId: string): StaffTitle[] {
  return [
    { id: `ut-${clubId}-baskan`, clubId, name: "Kulüp başkanı", scope: "lead" },
    { id: `ut-${clubId}-bas`, clubId, name: "Başantrenör", scope: "coach" },
    { id: `ut-${clubId}-antrenor`, clubId, name: "Antrenör", scope: "coach" },
    { id: `ut-${clubId}-mali`, clubId, name: "Mali İşler Yetkili", scope: "finance" },
  ];
}

export function listTitles(clubId: string, dir?: Directory) {
  const hidden = new Set(dir?.hiddenTitleIds ?? []);
  const extras = dir?.titles ?? [];
  const edited = new Map(extras.map((title) => [title.id, title]));
  const starters = starterTitles(clubId);
  const starterIds = new Set(starters.map((title) => title.id));
  return [
    ...starters.filter((title) => !hidden.has(title.id)).map((title) => edited.get(title.id) ?? title),
    ...extras.filter((title) => title.clubId === clubId && !starterIds.has(title.id) && !hidden.has(title.id)),
  ];
}

export function isCoachDuty(duty: string, titles?: StaffTitle[]) {
  if (titles) return titles.some((title) => title.name === duty && title.scope === "coach");
  return duty === "Başantrenör" || duty === "Antrenör";
}

function mergeStaff(dir?: Directory) {
  const extras = dir?.staff ?? [];
  const edited = new Map(extras.map((member) => [member.id, member]));
  const baseIds = new Set(staff.map((member) => member.id));
  return [
    ...staff.map((member) => edited.get(member.id) ?? member),
    ...extras.filter((member) => !baseIds.has(member.id)),
  ];
}

function mergePeople(dir?: Directory) {
  const extras = dir?.people ?? [];
  const edited = new Map(extras.map((person) => [person.id, person]));
  const baseIds = new Set(people.map((person) => person.id));
  return [
    ...people.map((person) => edited.get(person.id) ?? person),
    ...extras.filter((person) => !baseIds.has(person.id)),
  ];
}

export function clubBySlug(slug: string) {
  return clubs.find((club) => club.slug === slug);
}

export function clubById(id: string) {
  return clubs.find((club) => club.id === id);
}

export function planById(id: string) {
  return plans.find((plan) => plan.id === id);
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function overlaps(left: Training, right: Training) {
  return minutes(left.start) < minutes(right.end) && minutes(right.start) < minutes(left.end);
}

function branchIds(viewer: Viewer, clubId: string) {
  const membership = membershipFor(viewer.user, clubId);
  if (!membership?.branchIds?.length) return null;
  return new Set(membership.branchIds);
}

function inBranch<T extends { branchId?: string }>(rows: T[], viewer: Viewer, clubId: string) {
  const allowed = branchIds(viewer, clubId);
  if (!allowed) return rows;
  return rows.filter((row) => !row.branchId || allowed.has(row.branchId));
}

function coachSees(viewer: Viewer, clubId: string, row: { teamId?: string; sportId: string; coachStaffId?: string }, dir?: Directory) {
  const membership = membershipFor(viewer.user, clubId);
  if (!membership || membership.role !== "coach") return true;
  if (row.coachStaffId) {
    const coach = mergeStaff(dir).find((member) => member.id === row.coachStaffId);
    if (coach && coach.name.toLocaleLowerCase("tr-TR") === viewer.user.name.toLocaleLowerCase("tr-TR")) return true;
  }
  if (membership.teamIds?.length) return Boolean(row.teamId && membership.teamIds.includes(row.teamId));
  if (membership.sportIds?.length) return membership.sportIds.includes(row.sportId);
  return false;
}

function placeRows<T extends { id: string; clubId: string }>(
  base: T[],
  extra: T[] | undefined,
  hidden: string[] | undefined,
  clubId: string,
) {
  const gone = new Set(hidden ?? []);
  return withExtra(base, extra).filter((row) => row.clubId === clubId && !gone.has(row.id));
}

export function listBranches(clubId: string, viewer: Viewer, dir?: Directory) {
  const rows = placeRows(branches, dir?.branches, dir?.hiddenBranchIds, clubId);
  const allowed = branchIds(viewer, clubId);
  if (!allowed) return rows;
  return rows.filter((branch) => allowed.has(branch.id));
}

export function listFacilities(clubId: string, viewer: Viewer, dir?: Directory) {
  return inBranch(
    placeRows(facilities, dir?.facilities, dir?.hiddenFacilityIds, clubId),
    viewer,
    clubId,
  );
}

export function athleteDevelopment(personId: string, dir?: Directory): AthleteDevelopment {
  return (
    dir?.developments?.find((record) => record.personId === personId) ?? {
      personId,
      monthly: [],
      notes: [],
      basketballHistory: [],
    }
  );
}

export function listSports(clubId: string, dir?: Directory) {
  return withExtra(sports, dir?.sports)
    .filter((sport) => sport.clubId === clubId)
    .map((sport) => {
      const name = dir?.sportNames?.[sport.id];
      return name ? { ...sport, name } : sport;
    });
}

function blankSeason(clubId: string) {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    id: `sz-${clubId}-${year}`,
    clubId,
    name: `${year}-${year + 1}`,
    start: `${year}-09-01`,
    end: `${year + 1}-06-20`,
    active: true,
  };
}

export function listSeasons(clubId: string, dir?: Directory) {
  const rows = withExtra(seasons, dir?.seasons).filter((season) => season.clubId === clubId);
  return rows.length ? rows : [blankSeason(clubId)];
}

export function listYearSeasons(clubId: string, dir?: Directory) {
  const seen = new Set<string>();
  return listSeasons(clubId, dir)
    .filter((season) => {
      const match = /^(\d{4})-(\d{4})$/.exec(season.name);
      if (!match || Number(match[2]) !== Number(match[1]) + 1) return false;
      if (seen.has(season.name)) return false;
      seen.add(season.name);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function seasonForSport<T extends { id: string; sportId?: string }>(
  sport: { id: string; seasonId?: string },
  rows: T[],
) {
  if (sport.seasonId) {
    const chosen = rows.find((season) => season.id === sport.seasonId);
    if (chosen) return chosen;
  }
  return rows.find((season) => season.sportId === sport.id);
}

export function listStaff(clubId: string, viewer: Viewer, dir?: Directory) {
  return inBranch(
    mergeStaff(dir).filter((member) => member.clubId === clubId),
    viewer,
    clubId,
  );
}

export function listTeams(clubId: string, viewer: Viewer, dir?: Directory) {
  return inBranch(
    withExtra(teams, dir?.teams).filter((team) => team.clubId === clubId),
    viewer,
    clubId,
  ).filter((team) => coachSees(viewer, clubId, team, dir));
}

export function listPeople(clubId: string, viewer: Viewer, dir?: Directory) {
  return inBranch(
    mergePeople(dir).filter((person) => person.clubId === clubId),
    viewer,
    clubId,
  ).filter((person) => coachSees(viewer, clubId, person, dir));
}

export function listGuardians(clubId: string, dir?: Directory) {
  return (dir?.guardians ?? []).filter((guardian) => guardian.clubId === clubId);
}

export function clubSessions(clubId: string, dir?: Directory) {
  const hidden = new Set(dir?.hiddenTrainingIds ?? []);
  const merged = new Map<string, Training>();
  for (const session of trainings) {
    if (session.clubId === clubId && !hidden.has(session.id)) merged.set(session.id, session);
  }
  for (const session of dir?.trainings ?? []) {
    if (session.clubId === clubId && !hidden.has(session.id)) merged.set(session.id, session);
  }
  return [...merged.values()];
}

export function listTrainings(clubId: string, viewer: Viewer, dir?: Directory) {
  return inBranch(clubSessions(clubId, dir), viewer, clubId).filter((session) => coachSees(viewer, clubId, session, dir));
}

export function listInvoices(clubId: string, viewer: Viewer) {
  const visible = new Set(listPeople(clubId, viewer).map((person) => person.id));
  return invoices.filter((invoice) => invoice.clubId === clubId && visible.has(invoice.personId));
}

export function listStock(clubId: string, viewer: Viewer) {
  const visible = new Set(listBranches(clubId, viewer).map((branch) => branch.id));
  return stock.filter((item) => {
    if (item.clubId !== clubId) return false;
    const warehouse = warehouses.find((place) => place.id === item.warehouseId);
    return Boolean(warehouse && visible.has(warehouse.branchId));
  });
}

export function listWarehouses(clubId: string, viewer: Viewer) {
  return inBranch(
    warehouses.filter((place) => place.clubId === clubId),
    viewer,
    clubId,
  );
}

export function listCustody(clubId: string) {
  return custodies.filter((entry) => entry.clubId === clubId);
}

export function listNotices(clubId: string) {
  return notices.filter((notice) => notice.clubId === clubId);
}

export function listAudit(clubId: string) {
  return audit.filter((entry) => entry.clubId === clubId);
}

export function nameOf(personId: string, dir?: Directory) {
  return mergePeople(dir).find((person) => person.id === personId)?.name ?? "Kayıt";
}

export function branchName(id: string, dir?: Directory) {
  return withExtra(branches, dir?.branches).find((branch) => branch.id === id)?.name ?? "Şube";
}

export function facilityName(id: string, dir?: Directory) {
  return withExtra(facilities, dir?.facilities).find((facility) => facility.id === id)?.name ?? "Tesis";
}

export function sportName(id: string, dir?: Directory) {
  const sport = withExtra(sports, dir?.sports).find((item) => item.id === id);
  if (!sport) return "Branş";
  return dir?.sportNames?.[id] || sport.name;
}

export function teamName(id?: string, dir?: Directory) {
  if (!id) return "Takımsız";
  return withExtra(teams, dir?.teams).find((team) => team.id === id)?.name ?? "Takım";
}

export function staffName(id: string, dir?: Directory) {
  return mergeStaff(dir).find((member) => member.id === id)?.name ?? "Personel";
}

export function clubConflictIds(clubId: string, dir?: Directory) {
  return conflictsFor(clubSessions(clubId, dir));
}

export function sessionClash(candidate: Training, sessions: Training[]) {
  return sessions.find((session) => {
    if (session.id === candidate.id || session.date !== candidate.date) return false;
    const samePlace = session.facilityId === candidate.facilityId;
    const sameCoach = session.coachStaffId === candidate.coachStaffId;
    return (samePlace || sameCoach) && overlaps(session, candidate);
  });
}

export function conflictsFor(sessions: Training[]) {
  const ids = new Set<string>();
  for (const left of sessions) {
    for (const right of sessions) {
      if (left.id >= right.id || left.date !== right.date) continue;
      const samePlace = left.facilityId === right.facilityId;
      const sameCoach = left.coachStaffId === right.coachStaffId;
      if ((samePlace || sameCoach) && overlaps(left, right)) {
        ids.add(left.id);
        ids.add(right.id);
      }
    }
  }
  return ids;
}

export function coachLeave(session: Training, dir?: Directory) {
  const coach = mergeStaff(dir).find((member) => member.id === session.coachStaffId);
  if (!coach?.leave) return null;
  if (session.date >= coach.leave.from && session.date <= coach.leave.to) return coach;
  return null;
}

export function bookedCount(sessionId: string) {
  return bookings.filter((booking) => booking.sessionId === sessionId && booking.status === "booked").length;
}

export function waitlist(sessionId: string) {
  return bookings
    .filter((booking) => booking.sessionId === sessionId && booking.status === "waitlist")
    .map((booking) => people.find((person) => person.id === booking.personId))
    .filter((person): person is Person => Boolean(person));
}

export function sessionBookings(sessionId: string) {
  return bookings
    .filter((booking) => booking.sessionId === sessionId)
    .map((booking) => ({
      ...booking,
      person: people.find((person) => person.id === booking.personId),
    }))
    .filter((booking) => booking.person);
}

function rollMarks(dir?: Directory) {
  const extra = dir?.rollMarks ?? [];
  const keys = new Set(extra.map((mark) => `${mark.sessionId}:${mark.personId}`));
  return [...attendance.filter((mark) => !keys.has(`${mark.sessionId}:${mark.personId}`)), ...extra];
}

export function attendanceFor(sessionId: string, roster: Person[], dir?: Directory) {
  const marks = rollMarks(dir);
  return roster.map((person) => {
    const mark = marks.find((item) => item.sessionId === sessionId && item.personId === person.id);
    return {
      personId: person.id,
      name: person.name,
      team: teamName(person.teamId, dir),
      status: (mark?.status ?? "pending") as AttendanceStatus,
    };
  });
}

export function rosterFor(session: Training, viewer: Viewer, dir?: Directory) {
  const athletes = listPeople(session.clubId, viewer, dir).filter((person) => person.kind === "athlete" && person.status !== "left");
  if (session.teamId) return athletes.filter((person) => person.teamId === session.teamId);
  return athletes.filter((person) => person.sportId === session.sportId);
}

export function windowDays(before = 1, after = 5) {
  const days: string[] = [];
  for (let offset = -before; offset <= after; offset += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    days.push(`${date.getFullYear()}-${month}-${day}`);
  }
  return days;
}

export const discountRates = [
  { percent: 10, label: "%10" },
  { percent: 20, label: "%20" },
  { percent: 25, label: "%25" },
  { percent: 40, label: "%40" },
  { percent: 50, label: "%50" },
  { percent: 75, label: "%75" },
  { percent: 100, label: "Ücretsiz (%100 burslu)" },
] as const;

export function quoteFee(list: number, kind: "none" | "percent" | "custom", percent?: number, custom?: number) {
  const base = Math.max(0, Math.round(list));
  if (kind === "percent") {
    const rate = discountRates.some((item) => item.percent === percent) ? percent ?? 0 : 0;
    return Math.round((base * (100 - rate)) / 100);
  }
  if (kind === "custom") return Math.max(0, Math.round(custom ?? base));
  return base;
}

export function feeLabel(person: {
  priceName?: string;
  listAmount?: number;
  discountKind?: "none" | "percent" | "custom";
  discountPercent?: number;
  chargedAmount?: number;
}) {
  if (person.listAmount == null || !person.priceName) return "";
  const charged = formatTry(person.chargedAmount ?? person.listAmount);
  if (person.discountKind === "percent" && person.discountPercent === 100) {
    return `${person.priceName} · Ücretsiz (%100 burslu)`;
  }
  if (person.discountKind === "percent" && person.discountPercent) {
    return `${person.priceName} · İndirimli ${charged} (%${person.discountPercent})`;
  }
  if (person.discountKind === "custom" && (person.chargedAmount ?? person.listAmount) < person.listAmount) {
    return `${person.priceName} · İndirimli ${charged} (özel fiyat)`;
  }
  if (person.discountKind === "custom") return `${person.priceName} · Özel fiyat ${charged}`;
  return `${person.priceName} · ${charged}`;
}

export function formatTry(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Ay içinde hizmet verilen öğrenci: aktif veya deneme (ayrılan / ara veren sayılmaz). */
export function countsForStudentBill(status: string) {
  return status === "active" || status === "trial";
}

export function studentBillForMonth(studentCount: number, unitPrice: number) {
  const count = Math.max(0, Math.floor(studentCount));
  const unit = Math.max(0, Math.round(unitPrice));
  return { studentCount: count, unitPrice: unit, total: count * unit };
}

export function formatDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatLong(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function dayLabel(iso: string) {
  if (iso === todayISO) return "Bugün";
  const yesterday = windowDays(1, 0)[0];
  const tomorrow = windowDays(0, 1)[1];
  if (iso === yesterday) return "Dün";
  if (iso === tomorrow) return "Yarın";
  return formatLong(iso);
}

export function personProfile(clubId: string, viewer: Viewer, personId: string, dir?: Directory) {
  const person = listPeople(clubId, viewer, dir).find((item) => item.id === personId);
  if (!person) return null;
  return {
    person,
    invoices: invoices.filter((invoice) => invoice.personId === person.id && invoice.clubId === clubId),
    marks: rollMarks(dir).filter((mark) => mark.personId === person.id),
    custody: custodies.filter(
      (entry) => entry.clubId === clubId && entry.lines.some((line) => line.personId === person.id),
    ),
    credit: credits.find((credit) => credit.personId === person.id) ?? null,
    bookings: bookings.filter((booking) => booking.personId === person.id),
  };
}

export function overdueDues(
  people: Person[],
  today: string,
  payments: DuePayment[],
  overrides: DueOverride[],
): MonthDue[] {
  const current = today.slice(0, 7);
  const starts = people
    .filter((person) => person.kind === "athlete")
    .map((person) => person.since.slice(0, 7))
    .filter((month) => /^\d{4}-\d{2}$/.test(month) && month <= current)
    .sort();
  if (!starts.length) return [];
  return monthsBetween(starts[0], current).flatMap((month) =>
    duesForMonth(people, month, today, payments, overrides).filter((row) => row.status === "overdue"),
  );
}

export function attention(
  clubId: string,
  viewer: Viewer,
  dir?: Directory,
  finance?: { count: number; total: number },
) {
  const sessions = listTrainings(clubId, viewer, dir);
  const items: { title: string; detail: string; href: string }[] = [];
  const conflicts = [...clubConflictIds(clubId, dir)].filter((id) => sessions.some((session) => session.id === id));
  if (can(viewer, clubId, "schedule.view") && conflicts.length) {
    const session = sessions.find((item) => item.id === conflicts[0]);
    items.push({
      title: "Salon çakışması",
      detail: session ? `${session.title} aynı salonda başka bir seansla örtüşüyor.` : "Saat çakışması var.",
      href: "takvim",
    });
  }
  const leave = sessions.map((session) => coachLeave(session, dir)).find(Boolean);
  if (can(viewer, clubId, "schedule.view") && leave) {
    items.push({
      title: "Antrenör izinde",
      detail: `${leave.name} raporlu. Yarınki seans ayrıca işaretli.`,
      href: "takvim",
    });
  }
  const pending = sessions.filter((session) => session.date === todayISO && session.kind === "training");
  if (can(viewer, clubId, "attendance.view") && pending.length) {
    items.push({
      title: "Yoklama açık",
      detail: `${pending.length} antrenmanın katılımı henüz kapanmadı.`,
      href: "yoklama",
    });
  }
  if (finance) {
    if (can(viewer, clubId, "finance.view") && finance.count) {
      items.push({
        title: "Gecikmiş aidat",
        detail: `${finance.count} kayıt, ${formatTry(finance.total)} açık.`,
        href: "aidat",
      });
    }
  } else {
    const overdue = listInvoices(clubId, viewer).filter((invoice) => invoice.status === "overdue");
    if (can(viewer, clubId, "finance.view") && overdue.length) {
      const total = overdue.reduce((sum, invoice) => sum + (invoice.amount - invoice.paid), 0);
      items.push({
        title: "Gecikmiş aidat",
        detail: `${overdue.length} kayıt, ${formatTry(total)} açık.`,
        href: "aidat",
      });
    }
  }
  if (dir) {
    const queued = (dir.rollNotices ?? []).filter((notice) => notice.clubId === clubId);
    if (can(viewer, clubId, "notifications.view") && queued.length) {
      items.push({
        title: "Yoklama listesi kuyrukta",
        detail: `${queued.length} liste duruyor, gönderilmedi.`,
        href: "bildirimler",
      });
    }
  } else {
    const low = listStock(clubId, viewer).filter((item) => item.qty < item.min);
    if (can(viewer, clubId, "stock.view") && low.length) {
      items.push({
        title: "Düşük stok",
        detail: low.map((item) => `${item.name} ${item.variant}`).join(", "),
        href: "stok",
      });
    }
    const retry = listNotices(clubId).filter((notice) => notice.state === "retrying");
    if (can(viewer, clubId, "notifications.view") && retry.length) {
      items.push({
        title: "Bildirim yeniden denenecek",
        detail: retry[0].failureNote ?? retry[0].title,
        href: "bildirimler",
      });
    }
  }
  return items;
}

export function mobileHome(user: UserAccount, clubId: string) {
  const membership = membershipFor(user, clubId);
  if (!membership?.clubId) return null;
  const person = membership.personId
    ? people.find((item) => item.id === membership.personId && item.clubId === clubId) ?? null
    : null;
  const viewer: Viewer = { user };
  let sessions = trainings.filter((session) => session.clubId === clubId);
  if (membership.role === "coach") sessions = listTrainings(clubId, viewer);
  else if (person?.teamId) sessions = sessions.filter((session) => session.teamId === person.teamId);
  else if (person) sessions = sessions.filter((session) => session.sportId === person.sportId && session.kind === "class");
  const bills = person
    ? invoices.filter((invoice) => invoice.personId === person.id && invoice.clubId === clubId)
    : [];
  const credit = person ? credits.find((item) => item.personId === person.id) ?? null : null;
  const mine = person ? bookings.filter((booking) => booking.personId === person.id) : [];
  const rows = notices.filter((notice) => notice.clubId === clubId);
  const visibleNotices =
    membership.role === "coach"
      ? rows
      : rows.filter((notice) => {
          const blob = `${notice.title} ${notice.audience} ${notice.body}`;
          if (person && (blob.includes(person.name) || (person.guardian && blob.includes(person.guardian)))) return true;
          if (person?.teamId && blob.includes(teamName(person.teamId).split(" ")[0])) return true;
          return false;
        });
  return { membership, person, sessions, bills, credit, bookings: mine, notices: visibleNotices };
}

export function platformClubs(dir?: Directory) {
  const sportRows = withExtra(sports, dir?.sports);
  const peopleRows = mergePeople(dir);
  return clubs.map((club) => ({
    club,
    plan: planById(club.planId),
    branchCount: branches.filter((branch) => branch.clubId === club.id).length,
    sportCount: sportRows.filter((sport) => sport.clubId === club.id).length,
    peopleCount: peopleRows.filter((person) => person.clubId === club.id).length,
  }));
}

const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function shiftMonth(month: string, delta: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year, index - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  return `${monthNames[index - 1] ?? month} ${year}`;
}

export function monthsBetween(start: string, end: string) {
  const months: string[] = [];
  let cursor = start;
  while (cursor <= end && months.length < 80) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return months;
}

export function duesSeasonMonths(
  person: { since: string; teamId?: string; sportId?: string },
  seasons: { id: string; name: string; start: string; end: string }[],
  teams: { id: string; seasonId?: string }[],
  sports: { id: string; seasonId?: string }[],
  today: string,
  history: { month: string }[] = [],
) {
  const team = person.teamId ? teams.find((item) => item.id === person.teamId) : undefined;
  const sport = person.sportId ? sports.find((item) => item.id === person.sportId) : undefined;
  const pinned = seasons.find((item) => item.id === (team?.seasonId || sport?.seasonId));
  const month = today.slice(0, 7);
  const covering = seasons.find((item) => item.start.slice(0, 7) <= month && item.end.slice(0, 7) >= month);
  const named = seasons.find((item) => item.name === "2026-2027");
  const season = pinned ?? covering ?? named ?? seasons[0];
  const since = person.since.slice(0, 7);
  if (!season) return { seasonName: "", months: since ? [since] : [] };
  const seasonStart = season.start.slice(0, 7);
  const seasonEnd = season.end.slice(0, 7);
  const start = since > seasonStart ? since : seasonStart;
  const months = start <= seasonEnd ? monthsBetween(start, seasonEnd) : [];
  const older = history
    .map((item) => item.month)
    .filter((item) => /^\d{4}-\d{2}$/.test(item) && item >= since && !months.includes(item) && item < start);
  return {
    seasonName: season.name,
    months: [...new Set([...older, ...months])].sort((left, right) => left.localeCompare(right)),
  };
}

export interface MonthDue {
  personId: string;
  teamId?: string;
  personStatus: string;
  month: string;
  agreed: number | null;
  priceName?: string;
  amount: number;
  custom: boolean;
  billed: boolean;
  note: string;
  payments: DuePayment[];
  paid: number;
  remaining: number;
  status: "paid" | "partial" | "overdue" | "open";
  when: "past" | "current" | "future";
}

export function duesForMonth(
  people: Person[],
  month: string,
  today: string,
  payments: DuePayment[],
  overrides: DueOverride[],
): MonthDue[] {
  const current = today.slice(0, 7);
  const when = month < current ? "past" : month > current ? "future" : "current";
  return people
    .filter((person) => person.kind === "athlete" && person.since.slice(0, 7) <= month)
    .map((person) => {
      const agreed = person.chargedAmount != null && person.priceName ? person.chargedAmount : null;
      const override = overrides.find((item) => item.personId === person.id && item.month === month && item.clubId === person.clubId);
      const stopped = (person.status === "paused" || person.status === "left") && month >= current;
      const rows = payments
        .filter((item) => item.personId === person.id && item.month === month && item.clubId === person.clubId)
        .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
      const paid = rows.reduce((sum, item) => sum + item.amount, 0);
      let amount = 0;
      let billed = false;
      let custom = false;
      let note = "";
      if (override) {
        amount = override.amount;
        billed = override.amount > 0;
        custom = true;
        note = override.amount > 0 ? "Bu ayın tutarı elle yazıldı." : "Bu ay aidat yok.";
      } else if (stopped) {
        note = person.status === "paused" ? "Ara verdi. Bu ay ve sonrası otomatik açılmaz." : "Ayrıldı. Bu ay ve sonrası otomatik açılmaz.";
      } else if (agreed == null) {
        note = "Anlaşma yok. Fiyat sporcu kaydından gelir.";
      } else if (agreed === 0) {
        billed = true;
        note = "Anlaşma ücretsiz.";
      } else {
        amount = agreed;
        billed = true;
      }
      const status = !billed ? "open" : paid >= amount ? "paid" : paid > 0 ? "partial" : when === "past" ? "overdue" : "open";
      return {
        personId: person.id,
        teamId: person.teamId,
        personStatus: person.status,
        month,
        agreed,
        priceName: person.priceName,
        amount,
        custom,
        billed,
        note,
        payments: rows,
        paid,
        remaining: Math.max(0, amount - paid),
        status,
        when,
      };
    });
}

export { plans, clubs, todayISO };
