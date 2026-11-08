import {
  countsForStudentBill,
  studentBillForMonth,
  todayISO,
  type Club,
  type ClubStudentRate,
  type Person,
  type PlatformAthlete,
  type PlatformMembershipType,
} from "@skys/domain";
import { listPeople, managedClubs } from "@/lib/live";
import { readState, updateState } from "@/lib/store";

function platformViewer() {
  return {
    user: {
      id: "platform",
      name: "Sistem",
      email: "",
      memberships: [{ role: "platform_super" as const }],
    },
  };
}

function clubAthletes(club: Club): Person[] {
  return listPeople(club.id, platformViewer()).filter((person) => person.kind === "athlete");
}

function mirrorFrom(club: Club, person: Person, previous?: PlatformAthlete): PlatformAthlete {
  return {
    id: previous?.id ?? `pa-club-${person.id}`,
    name: person.name,
    birthYear: person.birthYear,
    birthMonth: person.birthMonth,
    birthDay: person.birthDay,
    phone: person.phone,
    status: person.status,
    since: person.since,
    source: "club",
    clubId: club.id,
    clubPersonId: person.id,
    clubName: club.name,
    note: previous?.note,
    membershipTypeId: previous?.membershipTypeId,
    membershipTypeName: previous?.membershipTypeName,
    membershipAmount: previous?.membershipAmount,
  };
}

function sameMirror(a: PlatformAthlete, b: PlatformAthlete) {
  return (
    a.name === b.name
    && a.birthYear === b.birthYear
    && a.birthMonth === b.birthMonth
    && a.birthDay === b.birthDay
    && a.phone === b.phone
    && a.status === b.status
    && a.since === b.since
    && a.clubId === b.clubId
    && a.clubPersonId === b.clubPersonId
    && a.clubName === b.clubName
    && a.note === b.note
  );
}

/** Kulüp sporcularını sistem listesine çeker; kulüp kartına yazmaz. */
export function syncClubAthletesToPlatform() {
  const clubs = managedClubs();
  const state = readState();
  const current = state.platformAthletes ?? [];
  const byPerson = new Map(
    current.filter((row) => row.source === "club" && row.clubPersonId).map((row) => [row.clubPersonId!, row]),
  );
  const next = [...current.filter((row) => row.source !== "club")];
  let changed = current.some((row) => row.source === "club" && !row.clubPersonId);

  for (const club of clubs) {
    for (const person of clubAthletes(club)) {
      const previous = byPerson.get(person.id);
      const mirrored = mirrorFrom(club, person, previous);
      next.push(mirrored);
      if (!previous || !sameMirror(previous, mirrored)) changed = true;
      byPerson.delete(person.id);
    }
  }
  if (byPerson.size) changed = true;
  if (!changed && next.length === current.length) return;
  updateState((draft) => {
    draft.platformAthletes = next;
  });
}

export function ensureClubAthleteOnPlatform(clubId: string, person: Person) {
  const club = managedClubs().find((item) => item.id === clubId);
  if (!club) return;
  updateState((state) => {
    if (!state.platformAthletes) state.platformAthletes = [];
    const index = state.platformAthletes.findIndex((row) => row.source === "club" && row.clubPersonId === person.id);
    const previous = index >= 0 ? state.platformAthletes[index] : undefined;
    const mirrored = mirrorFrom(club, person, previous);
    if (index >= 0) state.platformAthletes[index] = mirrored;
    else state.platformAthletes.push(mirrored);
  });
}

export function listPlatformAthletes(): PlatformAthlete[] {
  syncClubAthletesToPlatform();
  const clubIds = new Set(managedClubs().map((club) => club.id));
  return (readState().platformAthletes ?? [])
    .filter((row) => row.source === "allplay360" || (row.clubId && clubIds.has(row.clubId)))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function findPlatformAthlete(id: string) {
  return listPlatformAthletes().find((row) => row.id === id);
}

export function listMembershipTypes(): PlatformMembershipType[] {
  return [...(readState().platformMembershipTypes ?? [])].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function listStudentRates(month?: string): ClubStudentRate[] {
  const rows = readState().clubStudentRates ?? [];
  return month ? rows.filter((row) => row.month === month) : [...rows];
}

export function rateForClubMonth(clubId: string, month: string) {
  return listStudentRates(month).find((row) => row.clubId === clubId);
}

/** Kulüp öğrenci endeksi yalnız kulüp kopyalarını sayar. AllPlay360 özel üyesi bu faturaya girmez. */
export function billMonth(month = todayISO.slice(0, 7)) {
  const clubs = managedClubs();
  const athletes = listPlatformAthletes();
  return clubs.map((club) => {
    const students = athletes.filter(
      (row) => row.source === "club" && row.clubId === club.id && countsForStudentBill(row.status),
    ).length;
    const rate = rateForClubMonth(club.id, month);
    const unitPrice = rate?.unitPrice ?? 0;
    const bill = studentBillForMonth(students, unitPrice);
    return { club, month, ...bill, rateId: rate?.id };
  });
}

export function isAllPlayMember(row: PlatformAthlete) {
  return row.source === "allplay360" || Boolean(row.membershipTypeId);
}
