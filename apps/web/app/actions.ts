"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  can,
  canCollect,
  canEditRoster,
  canEditStructure,
  duesForMonth,
  isCoachDuty,
  findUserByEmail,
  clubScreens,
  isOwner,
  listSeasons,
  listSports,
  discountRates,
  listYearSeasons,
  quoteFee,
  listTitles,
  listWarehouses,
  sessionClash,
  membershipFor,
  staffRoles,
  todayISO,
  jerseySizes,
  type Branch,
  type DuePayment,
  type ExtraCharge,
  type ExtraPayment,
  type GearDelivery,
  type GearItem,
  type Facility,
  type PayMethod,
  type Guardian,
  type Person,
  type Price,
  type PrivateLesson,
  type PrivatePrice,
  type Sport,
  type Staff,
  type StaffTitle,
  type StaffRole,
  type Viewer,
  type TitleScope,
  type AthleteDevelopment,
  type Team,
  type Training,
  type PlatformAthlete,
  type PlatformMembershipType,
  type ClubStudentRate,
  isSuper,
} from "@skys/domain";
import { clubById, directory, listBranches, listFacilities, listGuardians, listPeople, listPrices, listStaff, listTeams, listTrainings, managedClubs } from "@/lib/live";
import { ensureClubAthleteOnPlatform } from "@/lib/platform-athletes";
import { trPhone } from "@/lib/phone";
import { getSession, viewerFor } from "@/lib/session";
import { readState, updateState } from "@/lib/store";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function nid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function isoDate(value: FormDataEntryValue | null, fallback: string) {
  const raw = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
}

export async function saveGrants(clubId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const viewer = viewerFor(session, clubId);
  if (!isOwner(viewer, clubId)) return;
  const grants: Partial<Record<StaffRole, string[]>> = {};
  for (const role of staffRoles) {
    if (role === "club_owner") continue;
    grants[role] = clubScreens
      .filter((screen) => formData.get(`${role}__${screen.id}`) === "on")
      .map((screen) => screen.id);
  }
  updateState((state) => {
    state.grants[clubId] = grants;
  });
  revalidatePath(`/c`, "layout");
}

export async function saveBrand(clubId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const membership = membershipFor(session.user, clubId);
  if (!membership || (membership.role !== "club_owner" && membership.role !== "club_manager")) return;
  const [accent, accentSoft] = String(formData.get("theme") ?? "").split("|");
  const motto = String(formData.get("motto") ?? "").slice(0, 80);
  if (!/^#[0-9a-fA-F]{6}$/.test(accent) || !/^#[0-9a-fA-F]{6}$/.test(accentSoft)) return;
  updateState((state) => {
    state.brands[clubId] = { accent, accentSoft, motto };
  });
  revalidatePath(`/c`, "layout");
}

export async function saveRoll(clubId: string, sessionId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const gun = /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("gun") ?? "")) ? String(formData.get("gun")) : todayISO;
  const back = `/yoklama?seans=${sessionId}&gun=${gun}`;
  if (!can(viewer, clubId, "attendance.view")) redirect(`${back}&hata=yetki`);
  const training = listTrainings(clubId, viewer).find((item) => item.id === sessionId && item.kind === "training");
  if (!training) redirect("/yoklama?hata=seans");
  const athletes = listPeople(clubId, viewer).filter((person) => person.kind === "athlete" && person.status !== "left" && (training.teamId ? person.teamId === training.teamId : person.sportId === training.sportId));
  if (!athletes.length) redirect(`${back}&hata=kadro`);
  const marks: { sessionId: string; personId: string; status: "present" | "absent" | "excused" }[] = [];
  for (const person of athletes) {
    const status = String(formData.get(`durum-${person.id}`) ?? "");
    if (status !== "present" && status !== "absent" && status !== "excused") continue;
    marks.push({ sessionId, personId: person.id, status });
  }
  if (!marks.length) redirect(`${back}&hata=bos`);
  const teamName = listTeams(clubId, viewer).find((team) => team.id === training.teamId)?.name || training.title;
  const names = new Map(athletes.map((person) => [person.id, person.name]));
  updateState((state) => {
    const incoming = new Set(marks.map((mark) => mark.personId));
    const kept = state.rollMarks.filter((mark) => mark.sessionId === sessionId && names.has(mark.personId) && !incoming.has(mark.personId));
    const next = [...kept, ...marks];
    state.rollMarks = [...state.rollMarks.filter((mark) => mark.sessionId !== sessionId), ...next];
    const previous = state.rollNotices.find((notice) => notice.sessionId === sessionId);
    const notice = {
      id: previous?.id ?? nid("yn"),
      clubId,
      sessionId,
      at: new Date().toISOString(),
      title: `${teamName} yoklaması ${training.date.split("-").reverse().join(".")} ${training.start}`,
      audience: `${teamName} velileri`,
      lines: next.map((mark) => ({
        personId: mark.personId,
        name: names.get(mark.personId) ?? "",
        status: mark.status,
      })).filter((line) => line.name),
    };
    state.rollNotices = [notice, ...state.rollNotices.filter((item) => item.sessionId !== sessionId)].slice(0, 40);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&kaydedildi=1`);
}

export async function queueNotice(clubId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const audience = String(formData.get("audience") ?? "Kulüp").slice(0, 40);
  if (!title) return;
  updateState((state) => {
    const list = state.notes[clubId] ?? [];
    list.unshift({ title, audience });
    state.notes[clubId] = list.slice(0, 6);
  });
  revalidatePath(`/c`, "layout");
}

export async function markRetried(noticeId: string) {
  const session = await getSession();
  if (!session) return;
  updateState((state) => {
    if (!state.retries.includes(noticeId)) state.retries.push(noticeId);
  });
  revalidatePath(`/c`, "layout");
}

function sameName(left: string, right: string) {
  return left.toLocaleLowerCase("tr") === right.toLocaleLowerCase("tr");
}

function validBirthday(year: number, month: number, day: number) {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}

function phoneKey(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function startedContact(formData: FormData, role: "mother" | "father" | "emergency") {
  const name = clean(formData.get(`${role}Name`), 60);
  const phone = clean(formData.get(`${role}Phone`), 24);
  const relation = role === "emergency" ? clean(formData.get("emergencyRelation"), 40) : "";
  return Boolean(name || phone || relation);
}

function linkGuardian(
  known: Guardian[],
  pending: Guardian[],
  clubId: string,
  role: "mother" | "father" | "emergency",
  formData: FormData,
) {
  const name = clean(formData.get(`${role}Name`), 60);
  const phone = trPhone(clean(formData.get(`${role}Phone`), 24));
  const relation = role === "emergency" ? clean(formData.get("emergencyRelation"), 40) : "";
  if (!name || !phone) return undefined;
  const pool = [...known, ...pending];
  const idRaw = clean(formData.get(`${role}Id`), 48);
  const linked = idRaw ? pool.find((item) => item.id === idRaw && item.clubId === clubId) : undefined;
  if (linked && sameName(linked.name, name)) return linked;
  const key = phoneKey(phone);
  const byName = pool.find((item) => item.clubId === clubId && phoneKey(item.phone) === key && sameName(item.name, name));
  if (byName) return byName;
  const created: Guardian = { id: nid("vl"), clubId, name, phone, role, relation: relation || undefined };
  pending.push(created);
  return created;
}

function hideId(list: string[], id: string) {
  if (!list.includes(id)) list.push(id);
}

export async function createBranch(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/subeler";
  if (!isOwner(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const district = clean(formData.get("district"), 40) || club.district;
  const address = clean(formData.get("address"), 120);
  const taken = listBranches(clubId, viewer).some((branch) => sameName(branch.name, name));
  if (!name || !address || taken) redirect(`${back}?hata=ad`);
  const branch: Branch = { id: nid("br"), clubId, name, district, address };
  updateState((state) => {
    state.branches.push(branch);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?eklendi=sube`);
}

export async function removeBranch(clubId: string, branchId: string) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/subeler";
  if (!isOwner(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const known = listBranches(clubId, viewer).some((branch) => branch.id === branchId);
  const busy =
    listFacilities(clubId, viewer).some((facility) => facility.branchId === branchId) ||
    listPeople(clubId, viewer).some((person) => person.branchId === branchId) ||
    listTeams(clubId, viewer).some((team) => team.branchId === branchId) ||
    listStaff(clubId, viewer).some((member) => member.branchId === branchId) ||
    listTrainings(clubId, viewer).some((session) => session.branchId === branchId) ||
    listWarehouses(clubId, viewer).some((place) => place.branchId === branchId);
  if (!known || busy) redirect(`${back}?hata=kullanim`);
  updateState((state) => {
    state.branches = state.branches.filter((branch) => branch.id !== branchId);
    hideId(state.hiddenBranchIds, branchId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?cikarildi=sube`);
}

export async function createFacility(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/subeler";
  if (!isOwner(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const kindRaw = String(formData.get("kind") ?? "salon");
  const kind = kindRaw === "saha" || kindRaw === "studyo" || kindRaw === "havuz" ? kindRaw : "salon";
  const capacity = Math.min(500, Math.max(1, Number(formData.get("capacity")) || 0));
  const taken = listFacilities(clubId, viewer).some(
    (facility) => !facility.branchId && sameName(facility.name, name),
  );
  if (!name || !capacity || taken) redirect(`${back}?hata=ad`);
  const facility: Facility = { id: nid("tf"), clubId, name, kind, capacity };
  updateState((state) => {
    state.facilities.push(facility);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?eklendi=tesis`);
}

export async function updateFacility(clubId: string, facilityId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/subeler";
  if (!isOwner(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const current = listFacilities(clubId, viewer).find((facility) => facility.id === facilityId);
  if (!current) redirect(`${back}?hata=ad`);
  const name = clean(formData.get("name"), 48);
  const kindRaw = String(formData.get("kind") ?? "salon");
  const kind = kindRaw === "saha" || kindRaw === "studyo" || kindRaw === "havuz" ? kindRaw : "salon";
  const capacity = Math.min(500, Math.max(1, Number(formData.get("capacity")) || 0));
  const taken = listFacilities(clubId, viewer).some(
    (facility) => facility.id !== facilityId && !facility.branchId && sameName(facility.name, name),
  );
  if (!name || !capacity || taken) redirect(`${back}?hata=ad`);
  let saved = false;
  updateState((state) => {
    const facility = state.facilities.find((item) => item.id === facilityId && item.clubId === clubId);
    if (!facility) return;
    facility.name = name;
    facility.kind = kind;
    facility.capacity = capacity;
    saved = true;
  });
  if (!saved) redirect(`${back}?hata=ad`);
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?guncellendi=tesis`);
}

export async function removeFacility(clubId: string, facilityId: string, formData?: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/subeler";
  if (!isOwner(viewer, clubId)) redirect(`${back}?hata=yetki`);
  if (formData?.get("onay") !== "sil") redirect(back);
  const known = listFacilities(clubId, viewer).some((facility) => facility.id === facilityId);
  const busy =
    listTrainings(clubId, viewer).some((session) => session.facilityId === facilityId) ||
    readState().privateLessons.some((lesson) => lesson.clubId === clubId && lesson.facilityId === facilityId && lesson.status !== "cancelled");
  if (!known || busy) redirect(`${back}?hata=kullanim`);
  updateState((state) => {
    state.facilities = state.facilities.filter((facility) => facility.id !== facilityId);
    hideId(state.hiddenFacilityIds, facilityId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?cikarildi=tesis`);
}

export async function createSport(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = `/c/${club.slug}/branslar`;
  if (!canEditStructure(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const dir = directory();
  const seasonId = String(formData.get("seasonId") ?? "");
  const season = listYearSeasons(clubId, dir).find((item) => item.id === seasonId);
  const taken = listSports(clubId, dir).some((sport) => sameName(sport.name, name));
  if (!name || !season || taken) redirect(`${back}?hata=1`);
  const sport: Sport = { id: nid("sp"), clubId, name, model: "team", seasonId: season.id };
  updateState((state) => {
    state.sports.push(sport);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?eklendi=brans`);
}

export async function renameSport(clubId: string, sportId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = `/c/${club.slug}/branslar`;
  if (!canEditStructure(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const dir = directory();
  const sports = listSports(clubId, dir);
  const current = sports.find((sport) => sport.id === sportId);
  const taken = sports.some((sport) => sport.id !== sportId && sameName(sport.name, name));
  if (!current || !name || taken) redirect(`${back}?hata=1`);
  updateState((state) => {
    if (!state.sportNames) state.sportNames = {};
    state.sportNames[sportId] = name;
    const row = state.sports.find((sport) => sport.id === sportId);
    if (row) row.name = name;
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?eklendi=ad`);
}

export async function createTeam(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/takimlar";
  const fail = "/takimlar?kayit=yeni";
  if (!canEditRoster(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const kindRaw = String(formData.get("kind") ?? "");
  const kind = kindRaw === "school" || kindRaw === "squad" ? kindRaw : "";
  const facilityRaw = String(formData.get("facilityId") ?? "");
  const coachStaffId = String(formData.get("coachStaffId") ?? "");
  const sportId = String(formData.get("sportId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const dir = directory();
  const facility = facilityRaw ? listFacilities(clubId, viewer).find((item) => item.id === facilityRaw && !item.branchId) : undefined;
  const sport = listSports(clubId, dir).find((item) => item.id === sportId);
  const season = listYearSeasons(clubId, dir).find((item) => item.id === seasonId);
  const staff = listStaff(clubId, viewer);
  const coach = staff.find((member) => member.id === coachStaffId);
  const extraCoachIds = [...new Set(
    formData.getAll("extraCoachId").map((value) => String(value)).filter((id) => id && id !== coach?.id && staff.some((member) => member.id === id)),
  )];
  const taken = listTeams(clubId, viewer).some((team) => sameName(team.name, name));
  if (facilityRaw && !facility) redirect(`${fail}&hata=1`);
  if (!season) redirect(`${fail}&hata=sezon`);
  if (!coach) redirect(`${fail}&hata=antrenor`);
  if (!name || !kind || !sport || taken) redirect(`${fail}&hata=1`);
  const team: Team = {
    id: nid("tm"),
    clubId,
    facilityId: facility?.id,
    sportId,
    seasonId: season.id,
    name,
    category: "",
    coachStaffId: coach.id,
    extraCoachIds,
    kind,
  };
  updateState((state) => {
    state.teams.push(team);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?eklendi=grup`);
}

export async function saveStaff(clubId: string, staffId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const creating = staffId === "yeni";
  const fail = creating ? "/personel?kayit=yeni" : `/personel?kayit=${staffId}`;
  if (!canEditStructure(viewer, clubId)) redirect("/personel?hata=yetki");
  const name = clean(formData.get("name"), 60);
  const existing = creating ? undefined : listStaff(clubId, viewer).find((member) => member.id === staffId);
  const titleChoice = String(formData.get("titleId") ?? "");
  const titles = listTitles(clubId, directory());
  const chosen = titles.find((title) => title.id === titleChoice);
  const duty = titleChoice === "eski" && existing ? existing.duty : chosen?.name ?? "";
  const titleId = titleChoice === "eski" ? existing?.titleId : chosen?.id;
  const phone = clean(formData.get("phone"), 24);
  const sportId = String(formData.get("sportId") ?? "");
  const sport = listSports(clubId, directory()).find((item) => item.id === sportId);
  const facilityRaw = String(formData.get("facilityId") ?? "");
  const facility = facilityRaw ? listFacilities(clubId, viewer).find((item) => item.id === facilityRaw) : undefined;
  const taken = listStaff(clubId, viewer).some((member) => member.id !== existing?.id && sameName(member.name, name));
  if (!creating && !existing) redirect("/personel?hata=1");
  if (facilityRaw && !facility) redirect(`${fail}&hata=1`);
  if (!name || !phoneKey(phone) || !duty || !sport || taken) redirect(`${fail}&hata=personel`);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("loginRole") ?? "");
  const loginRoles: StaffRole[] = ["club_manager", "finance", "warehouse", "coach"];
  const loginRole = loginRoles.includes(roleRaw as StaffRole) ? (roleRaw as StaffRole) : undefined;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (creating && (!emailOk || !loginRole)) redirect(`${fail}&hata=eposta`);
  if (!creating && ((email && !loginRole) || (!email && loginRole) || (email && !emailOk))) redirect(`${fail}&hata=eposta`);
  const emailTaken = email
    ? Boolean(findUserByEmail(email)) || readState().staff.some((member) => member.id !== existing?.id && member.email === email) || readState().owners.some((owner) => owner.email === email)
    : false;
  if (emailTaken) redirect(`${fail}&hata=eposta`);
  const member: Staff = {
    id: existing?.id ?? nid("st"),
    clubId,
    branchId: existing?.branchId,
    facilityId: facility?.id,
    sportId: sport.id,
    name,
    duty,
    titleId,
    phone,
    email: email || undefined,
    loginRole,
    leave: existing?.leave,
  };
  updateState((state) => {
    if (!state.staff) state.staff = [];
    const index = state.staff.findIndex((item) => item.id === member.id);
    if (index >= 0) state.staff[index] = member;
    else state.staff.push(member);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(creating ? "/personel?eklendi=personel" : "/personel?guncellendi=personel");
}

export async function saveTitle(clubId: string, titleId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const creating = titleId === "yeni";
  const fail = creating ? "/unvanlar?kayit=yeni" : `/unvanlar?kayit=${titleId}`;
  if (!canEditStructure(viewer, clubId)) redirect("/unvanlar?hata=yetki");
  const name = clean(formData.get("name"), 48);
  const existing = creating ? undefined : listTitles(clubId, directory()).find((title) => title.id === titleId);
  const scope: TitleScope = existing?.scope ?? "lead";
  const taken = listTitles(clubId, directory()).some((title) => title.id !== existing?.id && sameName(title.name, name));
  if (!creating && !existing) redirect("/unvanlar?hata=1");
  if (!name || taken) redirect(`${fail}&hata=unvan`);
  const title: StaffTitle = { id: existing?.id ?? nid("ut"), clubId, name, scope };
  const previous = existing?.name;
  const affected = previous && previous !== name
    ? listStaff(clubId, viewer).filter((member) => member.titleId === title.id || member.duty === previous)
    : [];
  updateState((state) => {
    if (!state.titles) state.titles = [];
    const index = state.titles.findIndex((item) => item.id === title.id);
    if (index >= 0) state.titles[index] = title;
    else state.titles.push(title);
    for (const member of affected) {
      const next = { ...member, duty: name, titleId: title.id };
      const at = state.staff.findIndex((item) => item.id === member.id);
      if (at >= 0) state.staff[at] = next;
      else state.staff.push(next);
    }
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(creating ? "/unvanlar?eklendi=unvan" : "/unvanlar?guncellendi=unvan");
}

export async function removeTitle(clubId: string, titleId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = `/unvanlar?kayit=${titleId}`;
  if (!canEditStructure(viewer, clubId)) redirect("/unvanlar?hata=yetki");
  if (String(formData.get("onay") ?? "") !== "sil") redirect(back);
  const title = listTitles(clubId, directory()).find((item) => item.id === titleId);
  const used = title
    ? listStaff(clubId, viewer).some((member) => member.titleId === title.id || member.duty === title.name)
    : false;
  if (!title || used) redirect(`${back}&hata=unvan`);
  updateState((state) => {
    state.titles = state.titles.filter((item) => item.id !== titleId);
    if (!state.hiddenTitleIds.includes(titleId)) state.hiddenTitleIds.push(titleId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect("/unvanlar?cikarildi=unvan");
}

export async function placeAthlete(clubId: string, teamId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = `/takimlar?kart=${teamId}`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const team = listTeams(clubId, viewer).find((item) => item.id === teamId);
  const personId = clean(formData.get("personId"), 48);
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  const teamKind = team?.kind === "school" ? "school" : "squad";
  const personKind = person?.enrollment === "school" ? "school" : "squad";
  if (!team || !person || personKind !== teamKind) redirect(`${back}&hata=kadro`);
  updateState((state) => {
    const next = { ...person, teamId: team.id };
    const index = state.people.findIndex((item) => item.id === person.id);
    if (index >= 0) state.people[index] = next;
    else state.people.push(next);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&kadro=yazildi`);
}

export async function liftAthlete(clubId: string, teamId: string, personId: string) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = `/takimlar?kart=${teamId}`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.teamId === teamId);
  if (!person) redirect(back);
  updateState((state) => {
    const next = { ...person, teamId: undefined };
    const index = state.people.findIndex((item) => item.id === person.id);
    if (index >= 0) state.people[index] = next;
    else state.people.push(next);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&kadro=cikti`);
}

export async function saveAthleteTrack(clubId: string, personId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const section = String(formData.get("bolum") ?? "");
  const tab = section === "not" ? "not" : section === "gecmis" ? "gecmis" : "olcu";
  const back = teamCardReturn(formData.get("donus"), personId, tab) || `/sporcular/${personId}?sekme=${tab}`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const person = listPeople(clubId, viewer).find((item) => item.id === personId);
  if (!person) redirect("/sporcular?hata=1");
  const date = isoDate(formData.get("date"), todayISO);
  if (date > todayISO) redirect(`${back}&hata=tarih`);
  const height = optionalMeasure(formData.get("height"), 40, 250);
  const weight = optionalMeasure(formData.get("weight"), 10, 200);
  const span = optionalMeasure(formData.get("span"), 80, 250);
  const shoe = clean(formData.get("shoe"), 12);
  const text = clean(formData.get("text"), 800);
  const title = clean(formData.get("title"), 60);
  const season = clean(formData.get("season"), 24);
  const place = clean(formData.get("place"), 60);
  const position = clean(formData.get("position"), 32);
  const measureEmpty = height == null && weight == null && span == null && !shoe;
  if ((section === "baslangic" || section === "aylik") && (height === null || weight === null || span === null || measureEmpty)) {
    redirect(`${back}&hata=olcu`);
  }
  if ((section === "not" || section === "gecmis") && !text) redirect(`${back}&hata=olcu`);
  if (section !== "baslangic" && section !== "aylik" && section !== "not" && section !== "gecmis") redirect(`${back}&hata=olcu`);
  const point = { date, heightCm: height ?? undefined, weightKg: weight ?? undefined, spanCm: span ?? undefined, shoe: shoe || undefined };
  updateState((state) => {
    if (!state.developments) state.developments = [];
    const row = ensureTrack(state.developments, personId);
    if (section === "baslangic") row.start = point;
    if (section === "aylik") row.monthly.unshift(point);
    if (section === "not") row.notes.unshift({ date, text, title: title || undefined });
    if (section === "gecmis") row.basketballHistory.unshift({ date, text, season: season || undefined, place: place || undefined, position: position || undefined });
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&takip=1`);
}

function teamCardReturn(raw: FormDataEntryValue | null, personId: string, tab: string) {
  const value = String(raw ?? "").trim();
  const match = value.match(/^\/takimlar\?kart=([A-Za-z0-9_-]{1,48})&sporcu=([A-Za-z0-9_-]{1,48})$/);
  if (!match || match[2] !== personId) return "";
  return `/takimlar?kart=${match[1]}&sporcu=${personId}&sekme=${tab}`;
}

function optionalMeasure(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 10) / 10;
}

function ensureTrack(rows: AthleteDevelopment[], personId: string) {
  const found = rows.find((item) => item.personId === personId);
  if (found) return found;
  const created: AthleteDevelopment = { personId, monthly: [], notes: [], basketballHistory: [] };
  rows.push(created);
  return created;
}

export async function createPrice(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/fiyatlar";
  if (!canEditStructure(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const amount = Math.round(Number(formData.get("amount")));
  const taken = listPrices(clubId).some((price) => sameName(price.name, name));
  if (!name || !Number.isFinite(amount) || amount < 0 || taken) redirect(`${back}?hata=ad`);
  const price: Price = { id: nid("uc"), clubId, name, amount };
  updateState((state) => {
    state.prices.push(price);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?eklendi=fiyat`);
}

export async function updatePrice(clubId: string, priceId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/fiyatlar";
  if (!canEditStructure(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const name = clean(formData.get("name"), 48);
  const amount = Math.round(Number(formData.get("amount")));
  const taken = listPrices(clubId).some((price) => price.id !== priceId && sameName(price.name, name));
  if (!name || !Number.isFinite(amount) || amount < 0 || taken) redirect(`${back}?hata=ad`);
  let saved = false;
  updateState((state) => {
    const price = state.prices.find((item) => item.id === priceId && item.clubId === clubId);
    if (!price) return;
    price.name = name;
    price.amount = amount;
    saved = true;
  });
  if (!saved) redirect(`${back}?hata=ad`);
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?guncellendi=fiyat`);
}

export async function removePrice(clubId: string, priceId: string, formData?: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/fiyatlar";
  if (!canEditStructure(viewer, clubId)) redirect(`${back}?hata=yetki`);
  if (formData?.get("onay") !== "sil") redirect(back);
  const known = listPrices(clubId).some((price) => price.id === priceId);
  const busy = listPeople(clubId, viewer).some((person) => person.priceId === priceId);
  if (!known || busy) redirect(`${back}?hata=kullanim`);
  updateState((state) => {
    state.prices = state.prices.filter((price) => price.id !== priceId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?cikarildi=fiyat`);
}

function privateBack(formData: FormData) {
  const price = clean(formData.get("priceForm"), 48);
  if (price) return price === "yeni" ? "/ozel-ders?ucret=yeni" : `/ozel-ders?ucret=${price}`;
  const lesson = clean(formData.get("lessonForm"), 48);
  if (lesson) return lesson === "yeni" ? "/ozel-ders?ders=yeni" : `/ozel-ders?ders=${lesson}`;
  if (formData.get("talepForm") === "1") {
    const id = clean(formData.get("id"), 48);
    return id ? `/ozel-ders?talep=${id}` : "/ozel-ders?talep=yeni";
  }
  return "/ozel-ders";
}

export async function savePrivatePrice(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = privateBack(formData);
  if (!can(viewer, clubId, "private.view")) redirect("/ozel-ders?hata=yetki");
  const name = clean(formData.get("name"), 60);
  const coachStaffId = clean(formData.get("coachStaffId"), 48);
  const amount = Math.round(Number(formData.get("amount")));
  const coaches = listStaff(clubId, viewer).filter((member) => isCoachDuty(member.duty, listTitles(clubId, directory())));
  const priceId = clean(formData.get("id"), 48);
  if (!name || !coaches.some((member) => member.id === coachStaffId) || !Number.isFinite(amount) || amount < 0) {
    redirect(`${back}&hata=ucret`);
  }
  updateState((state) => {
    const row: PrivatePrice = { id: priceId || nid("uo"), clubId, name, coachStaffId, amount };
    const index = state.privatePrices.findIndex((item) => item.id === row.id && item.clubId === clubId);
    if (index >= 0) state.privatePrices[index] = row;
    else state.privatePrices.push(row);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect("/ozel-ders?eklendi=ucret");
}

export async function savePrivateLesson(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = privateBack(formData);
  if (!can(viewer, clubId, "private.view")) redirect("/ozel-ders?hata=yetki");
  const place = formData.get("yerlestir") === "1";
  const lessonId = clean(formData.get("id"), 48);
  const knownLessons = readState().privateLessons.filter((item) => item.clubId === clubId);
  const existing = lessonId ? knownLessons.find((item) => item.id === lessonId) : undefined;
  if (lessonId && !existing) redirect("/ozel-ders?hata=ders");
  const personId = clean(formData.get("personId"), 48);
  const title = clean(formData.get("title"), 60);
  const coachStaffId = clean(formData.get("coachStaffId"), 48);
  const priceId = clean(formData.get("priceId"), 48);
  const teamRaw = clean(formData.get("teamId"), 48);
  const note = clean(formData.get("note"), 240);
  const people = listPeople(clubId, viewer);
  const person = people.find((item) => item.id === personId && item.kind === "athlete" && item.status !== "left");
  const coaches = listStaff(clubId, viewer).filter((member) => isCoachDuty(member.duty, listTitles(clubId, directory())));
  const coach = coaches.find((member) => member.id === coachStaffId);
  const price = readState().privatePrices.find((item) => item.id === priceId && item.clubId === clubId && item.coachStaffId === coachStaffId);
  const team = teamRaw ? listTeams(clubId, viewer).find((item) => item.id === teamRaw) : undefined;
  if (!person || !title || !coach || !price || (teamRaw && !team)) redirect(`${back}&hata=ders`);
  if (!place) {
    const lesson: PrivateLesson = {
      id: existing?.id ?? nid("od"),
      clubId,
      personId: person.id,
      teamId: team?.id,
      coachStaffId: coach.id,
      facilityId: existing?.facilityId,
      priceId: price.id,
      title,
      date: existing?.date,
      start: existing?.start,
      end: existing?.end,
      status: existing?.status === "scheduled" ? "scheduled" : "requested",
      trainingId: existing?.trainingId,
      note: note || undefined,
      amount: price.amount,
    };
    updateState((state) => {
      const index = state.privateLessons.findIndex((item) => item.id === lesson.id);
      if (index >= 0) state.privateLessons[index] = lesson;
      else state.privateLessons.push(lesson);
    });
    revalidatePath(`/c/${club.slug}`, "layout");
    redirect("/ozel-ders?eklendi=talep");
    return;
  }
  const facilityId = clean(formData.get("facilityId"), 48);
  const facility = listFacilities(clubId, viewer).find((item) => item.id === facilityId && !item.branchId);
  const date = isoDate(formData.get("date"), "");
  const start = clock(formData.get("start"));
  const end = clock(formData.get("end"));
  if (!facility || !date || !start || !end || start >= end) redirect(`${back}&hata=saat`);
  if (date < todayISO) redirect(`${back}&hata=gecmis`);
  const sportId = team?.sportId || person.sportId;
  const sport = listSports(clubId, directory()).find((item) => item.id === sportId);
  const branchId = person.branchId || facility.branchId || listBranches(clubId, viewer)[0]?.id || "";
  if (!sport) redirect(`${back}&hata=ders`);
  const pilates = sport.name.toLocaleLowerCase("tr-TR").includes("pilates");
  const trainingId = existing?.trainingId || nid("tr");
  const sessions = listTrainings(clubId, viewer).filter((item) => item.id !== trainingId);
  const overlap = sessions.filter((item) => item.date === date && item.start < end && start < item.end);
  if (overlap.some((item) => item.coachStaffId === coach.id)) redirect(`${back}&hata=hoca`);
  if (team && overlap.some((item) => item.teamId === team.id)) redirect(`${back}&hata=takim`);
  if (person.teamId && overlap.some((item) => item.teamId === person.teamId && item.kind === "training")) redirect(`${back}&hata=sporcu`);
  if (knownLessons.some((item) => item.id !== existing?.id && item.status === "scheduled" && item.personId === person.id && item.date === date && item.start && item.end && item.start < end && start < item.end)) {
    redirect(`${back}&hata=sporcu`);
  }
  const salonBusy = overlap.filter((item) => item.facilityId === facility.id);
  if (!pilates && salonBusy.length) redirect(`${back}&hata=salon&ad=${encodeURIComponent(salonBusy.map((item) => item.title).join(", "))}`);
  const training: Training = {
    id: trainingId,
    clubId,
    branchId,
    facilityId: facility.id,
    sportId: sport.id,
    teamId: team?.id,
    personId: person.id,
    coachStaffId: coach.id,
    title: `${person.name} · ${title}`,
    date,
    start,
    end,
    kind: "private",
    assign: "coach",
  };
  const lesson: PrivateLesson = {
    id: existing?.id ?? nid("od"),
    clubId,
    personId: person.id,
    teamId: team?.id,
    coachStaffId: coach.id,
    facilityId: facility.id,
    priceId: price.id,
    title,
    date,
    start,
    end,
    status: "scheduled",
    trainingId,
    note: note || undefined,
    amount: price.amount,
  };
  updateState((state) => {
    const index = state.privateLessons.findIndex((item) => item.id === lesson.id);
    if (index >= 0) state.privateLessons[index] = lesson;
    else state.privateLessons.push(lesson);
    const slot = state.trainings.findIndex((item) => item.id === training.id);
    if (slot >= 0) state.trainings[slot] = training;
    else state.trainings.push(training);
    state.planNotices.unshift({
      id: nid("pn"),
      clubId,
      sessionId: training.id,
      at: new Date().toISOString(),
      summary: `Özel ders: ${person.name} · ${title} · ${date.split("-").reverse().join(".")} ${start}–${end}`,
      audience: coach.name,
    });
    state.planNotices = state.planNotices.slice(0, 12);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`/ozel-ders?eklendi=ders&gun=${date}`);
}

export async function cancelPrivateLesson(clubId: string, lessonId: string) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  if (!can(viewer, clubId, "private.view")) redirect("/ozel-ders?hata=yetki");
  const lesson = readState().privateLessons.find((item) => item.id === lessonId && item.clubId === clubId);
  if (!lesson) redirect("/ozel-ders?hata=ders");
  updateState((state) => {
    const row = state.privateLessons.find((item) => item.id === lessonId && item.clubId === clubId);
    if (!row) return;
    row.status = "cancelled";
    if (row.trainingId) state.trainings = state.trainings.filter((item) => item.id !== row.trainingId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect("/ozel-ders?eklendi=iptal");
}

export async function createPerson(clubId: string, formData: FormData) {
  return savePerson(clubId, formData);
}

export async function updatePerson(clubId: string, personId: string, formData: FormData) {
  return savePerson(clubId, formData, personId);
}

async function savePerson(clubId: string, formData: FormData, personId?: string) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/sporcular";
  const fail = `${back}?kayit=${personId ?? "yeni"}`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const existing = personId ? listPeople(clubId, viewer).find((item) => item.id === personId) : undefined;
  if (personId && !existing) redirect(`${back}?hata=1`);
  const name = clean(formData.get("name"), 60);
  const birthYear = Number(formData.get("birthYear"));
  const birthDayRaw = String(formData.get("birthDay") ?? "");
  const birthMonthRaw = String(formData.get("birthMonth") ?? "");
  const birthDay = birthDayRaw ? Number(birthDayRaw) : undefined;
  const birthMonth = birthMonthRaw ? Number(birthMonthRaw) : undefined;
  const enrollment = formData.get("enrollment") === "school" ? "school" : "squad";
  const kind = "athlete" as const;
  const rawStatus = String(formData.get("status") ?? "active");
  const status = rawStatus === "paused" || rawStatus === "trial" || rawStatus === "left" ? rawStatus : "active";
  let sportId = String(formData.get("sportId") ?? "");
  let branchId = "";
  const teamId = String(formData.get("teamId") ?? "") || undefined;
  const since = isoDate(formData.get("since"), todayISO);
  const reference = clean(formData.get("reference"), 80);
  const dir = directory();
  const year = new Date().getFullYear();
  const team = teamId ? listTeams(clubId, viewer).find((item) => item.id === teamId) : undefined;
  if (teamId && !team) redirect(`${fail}&hata=1`);
  if (team && (team.kind ?? "squad") !== enrollment) redirect(`${fail}&hata=1`);
  if (team) {
    sportId = team.sportId;
    branchId = team.branchId ?? "";
  }
  const branches = listBranches(clubId, viewer);
  if (!branchId) branchId = branches[0]?.id ?? "";
  const sportOk = listSports(clubId, dir).some((sport) => sport.id === sportId);
  const branchOk = !branchId || branches.some((branch) => branch.id === branchId);
  if (!name || !Number.isInteger(birthYear) || birthYear < 1940 || birthYear > year || !sportOk || !branchOk) {
    redirect(`${fail}&hata=1`);
  }
  if (since > todayISO) redirect(`${fail}&hata=tarih`);
  if (Boolean(birthDayRaw) !== Boolean(birthMonthRaw) || (birthMonth && birthDay && !validBirthday(birthYear, birthMonth, birthDay))) {
    redirect(`${fail}&hata=dogum`);
  }
  const known = listGuardians(clubId);
  const pending: Guardian[] = [];
  const mother = linkGuardian(known, pending, clubId, "mother", formData);
  const father = linkGuardian(known, pending, clubId, "father", formData);
  const emergency = linkGuardian(known, pending, clubId, "emergency", formData);
  const primaryRole = formData.get("primary") === "father" ? "father" : "mother";
  const guardian = primaryRole === "father" ? father : mother;
  if (!guardian || startedContact(formData, "mother") !== Boolean(mother) || startedContact(formData, "father") !== Boolean(father) || startedContact(formData, "emergency") !== Boolean(emergency)) {
    redirect(`${fail}&hata=veli`);
  }
  const prices = listPrices(clubId);
  const price = prices.find((item) => item.id === String(formData.get("priceId") ?? ""));
  if (prices.length && !price) redirect(`${fail}&hata=fiyat`);
  const rawDiscount = String(formData.get("discount") ?? "none");
  const discountKind = rawDiscount === "custom" ? "custom" : rawDiscount === "percent" ? "percent" : "none";
  const discountPercent = Number(formData.get("discountPercent"));
  const customAmount = Math.round(Number(formData.get("customAmount")));
  if (price && discountKind === "percent" && !discountRates.some((item) => item.percent === discountPercent)) {
    redirect(`${fail}&hata=fiyat`);
  }
  if (price && discountKind === "custom" && (!Number.isFinite(customAmount) || customAmount < 0)) {
    redirect(`${fail}&hata=fiyat`);
  }
  const charged = price ? quoteFee(price.amount, discountKind, discountPercent, customAmount) : undefined;
  const person: Person = {
    id: existing?.id ?? nid("pr"),
    clubId,
    branchId: branchId || existing?.branchId || "",
    sportId,
    teamId,
    name,
    birthYear,
    birthMonth,
    birthDay,
    kind: existing?.kind ?? kind,
    enrollment,
    status,
    guardian: guardian.name,
    guardianId: guardian.id,
    motherId: mother?.id,
    fatherId: father?.id,
    emergencyId: emergency?.id,
    phone: guardian.phone,
    reference: reference || undefined,
    since,
    priceId: price?.id,
    priceName: price?.name,
    listAmount: price?.amount,
    discountKind: price ? discountKind : undefined,
    discountPercent: price && discountKind === "percent" ? discountPercent : undefined,
    chargedAmount: charged,
    matchNumber: existing?.matchNumber,
  };
  updateState((state) => {
    if (!state.guardians) state.guardians = [];
    state.guardians.push(...pending);
    const index = state.people.findIndex((item) => item.id === person.id);
    if (index >= 0) state.people[index] = person;
    else state.people.push(person);
  });
  ensureClubAthleteOnPlatform(clubId, person);
  revalidatePath(`/c/${club.slug}`, "layout");
  revalidatePath("/platform/sporcular", "layout");
  const flag = existing ? "guncellendi" : "eklendi";
  redirect(`${back}?${flag}=sporcu&kim=${person.id}`);
}

function monthOk(value: FormDataEntryValue | null) {
  const month = String(value ?? "");
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "";
}

function duesBack(formData: FormData) {
  const month = monthOk(formData.get("month"));
  const personId = clean(formData.get("personId"), 48);
  const chargeId = clean(formData.get("chargeId"), 48);
  const params = new URLSearchParams();
  if (personId) params.set("al", personId);
  if (month) params.set("ay", month);
  if (chargeId) params.set("kalem", chargeId);
  const qs = params.toString();
  return qs ? `/aidat?${qs}` : "/aidat";
}

function payMethod(value: FormDataEntryValue | null): PayMethod | "" {
  const method = String(value ?? "");
  if (method === "cash" || method === "transfer" || method === "card") return method;
  return "";
}

function takenBy(clubId: string, viewer: Viewer, formData: FormData) {
  const id = clean(formData.get("collectorStaffId"), 48);
  if (!id) return {};
  const staff = listStaff(clubId, viewer).find((item) => item.id === id);
  const method = payMethod(formData.get("method"));
  if (!staff || !method) return null;
  const note = clean(formData.get("note"), 240);
  return { collectorStaffId: staff.id, method, ...(note ? { note } : {}) };
}

export async function recordPayment(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const personId = clean(formData.get("personId"), 48);
  const month = monthOk(formData.get("month"));
  const date = isoDate(formData.get("date"), "");
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  const taken = takenBy(clubId, viewer, formData);
  if (!person || !month || !date || date > todayISO || !taken) redirect(`${back}&hata=odeme`);
  const partial = formData.get("partial") === "1";
  let amount = Math.round(Number(formData.get("amount")));
  if (!partial) {
    const state = readState();
    const due = duesForMonth([person], month, todayISO, state.duePayments, state.dueOverrides)[0];
    amount = due && due.billed && due.amount > 0 ? (due.remaining > 0 ? due.remaining : due.amount) : 0;
  }
  if (!Number.isFinite(amount) || amount < 1) redirect(`${back}&hata=odeme`);
  const payment: DuePayment = { id: nid("od"), clubId, personId, month, date, amount, ...taken };
  updateState((state) => {
    state.duePayments.push(payment);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&eklendi=odeme`);
}

export async function removePayment(clubId: string, paymentId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  updateState((state) => {
    state.duePayments = state.duePayments.filter((item) => !(item.id === paymentId && item.clubId === clubId));
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&cikarildi=odeme`);
}

export async function setDueAmount(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const personId = clean(formData.get("personId"), 48);
  const month = monthOk(formData.get("month"));
  const amount = Math.round(Number(formData.get("amount")));
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  if (!person || !month || !Number.isFinite(amount) || amount < 0) redirect(`${back}&hata=odeme`);
  updateState((state) => {
    state.dueOverrides = state.dueOverrides.filter((item) => !(item.clubId === clubId && item.personId === personId && item.month === month));
    state.dueOverrides.push({ clubId, personId, month, amount });
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&guncellendi=aidat`);
}

export async function clearDueAmount(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const personId = clean(formData.get("personId"), 48);
  const month = monthOk(formData.get("month"));
  if (!personId || !month) redirect(`${back}&hata=odeme`);
  updateState((state) => {
    state.dueOverrides = state.dueOverrides.filter((item) => !(item.clubId === clubId && item.personId === personId && item.month === month));
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&guncellendi=aidat`);
}

export async function addExtraCharge(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const personId = clean(formData.get("personId"), 48);
  const title = clean(formData.get("title"), 80);
  const amount = Math.round(Number(formData.get("amount")));
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  if (!person || !title || !Number.isFinite(amount) || amount < 1) redirect(`${back}&hata=kalem`);
  const charge: ExtraCharge = { id: nid("ek"), clubId, personId, title, amount, date: todayISO };
  updateState((state) => {
    state.extraCharges.push(charge);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&eklendi=kalem`);
}

export async function recordExtraPayment(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const personId = clean(formData.get("personId"), 48);
  const chargeId = clean(formData.get("chargeId"), 48);
  const date = isoDate(formData.get("date"), "");
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  const taken = takenBy(clubId, viewer, formData);
  const state = readState();
  const charge = state.extraCharges.find((item) => item.id === chargeId && item.clubId === clubId && item.personId === personId);
  if (!person || !charge || !date || date > todayISO || !taken) redirect(`${back}&hata=odeme`);
  const partial = formData.get("partial") === "1";
  const paid = state.extraPayments.filter((item) => item.chargeId === charge.id).reduce((sum, item) => sum + item.amount, 0);
  let amount = Math.round(Number(formData.get("amount")));
  if (!partial) amount = Math.max(0, charge.amount - paid);
  if (!Number.isFinite(amount) || amount < 1) redirect(`${back}&hata=odeme`);
  const payment: ExtraPayment = { id: nid("eo"), clubId, chargeId, personId, date, amount, ...taken };
  updateState((next) => {
    next.extraPayments.push(payment);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&eklendi=odeme`);
}

export async function removeExtraPayment(clubId: string, paymentId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  updateState((state) => {
    state.extraPayments = state.extraPayments.filter((item) => !(item.id === paymentId && item.clubId === clubId));
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&cikarildi=odeme`);
}

export async function saveGearItem(clubId: string, itemId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const creating = itemId === "yeni";
  const fail = creating ? "/stok?kayit=yeni" : `/stok?kayit=${itemId}`;
  if (!canEditStructure(viewer, clubId)) redirect("/stok?hata=yetki");
  const name = clean(formData.get("name"), 60);
  const facilityId = clean(formData.get("facilityId"), 48);
  const training = formData.get("training") === "1";
  const match = formData.get("match") === "1";
  const facility = listFacilities(clubId, viewer).find((place) => place.id === facilityId);
  const existing = creating ? undefined : readState().gearItems.find((item) => item.id === itemId && item.clubId === clubId);
  if (!creating && !existing) redirect("/stok?hata=urun");
  if (!name || !facility || (training && match)) redirect(`${fail}&hata=urun`);
  const kind = training ? "training" : match ? "match" : "plain";
  if (creating && kind !== "plain") {
    const lines = jerseyLines(formData);
    const taken = Boolean(lines?.some((line) => readState().gearItems.some((item) =>
      item.clubId === clubId && sameName(item.name, name) && sameName(item.size ?? "", line.size) && item.facilityId === facility.id,
    )));
    if (!lines || lines.length === 0 || taken) redirect(`${fail}&hata=urun`);
    updateState((state) => {
      lines.forEach((line) => {
        state.gearItems.push({ id: nid("ur"), clubId, facilityId: facility.id, name, kind, size: line.size, qty: line.qty });
      });
    });
    revalidatePath(`/c/${club.slug}`, "layout");
    redirect("/stok?eklendi=urun");
  }
  const given = existing ? gearGiven(readState().gearDeliveries, existing.id) : 0;
  const legacy = existing?.size || (existing ? soleGearSize(readState().gearDeliveries, existing.id) : "");
  const size = kind === "plain" ? "" : clean(formData.get("size"), 16);
  const qty = Math.round(Number(formData.get("qty")));
  const sizeOk = kind === "plain" || isJerseySize(size) || Boolean(legacy && size === legacy);
  const taken = readState().gearItems.some((item) =>
    item.clubId === clubId
    && item.id !== existing?.id
    && sameName(item.name, name)
    && sameName(item.size ?? "", size)
    && item.facilityId === facility.id,
  );
  if (!sizeOk || !Number.isFinite(qty) || qty < 0 || qty < given || taken) redirect(`${fail}&hata=urun`);
  const item: GearItem = { id: existing?.id ?? nid("ur"), clubId, facilityId: facility.id, name, kind, size: size || undefined, qty };
  updateState((state) => {
    const index = state.gearItems.findIndex((row) => row.id === item.id);
    if (index >= 0) state.gearItems[index] = item;
    else state.gearItems.push(item);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(creating ? "/stok?eklendi=urun" : "/stok?guncellendi=urun");
}

export async function removeGearItem(clubId: string, itemId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = `/stok?kayit=${itemId}`;
  if (!canEditStructure(viewer, clubId)) redirect("/stok?hata=yetki");
  if (String(formData.get("onay") ?? "") !== "sil") redirect(back);
  const state = readState();
  const item = state.gearItems.find((row) => row.id === itemId && row.clubId === clubId);
  const used = state.gearDeliveries.some((row) => row.itemId === itemId && row.clubId === clubId);
  if (!item || used) redirect(`${back}&hata=urun`);
  updateState((next) => {
    next.gearItems = next.gearItems.filter((row) => row.id !== itemId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect("/stok?cikarildi=urun");
}

export async function deliverGear(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const fail = "/zimmet?kayit=yeni";
  if (!canCollect(viewer, clubId)) redirect("/zimmet?hata=yetki");
  const itemId = clean(formData.get("itemId"), 48);
  const personId = clean(formData.get("personId"), 48);
  const number = clean(formData.get("numara"), 8);
  const count = Math.round(Number(formData.get("count") || 1));
  const date = isoDate(formData.get("date"), "");
  const staffId = clean(formData.get("staffId"), 48);
  const price = Math.round(Number(formData.get("price")));
  const paidNow = formData.get("paid") === "1";
  const method = payMethod(formData.get("method"));
  const state = readState();
  const item = state.gearItems.find((row) => row.id === itemId && row.clubId === clubId);
  const person = listPeople(clubId, viewer).find((row) => row.id === personId && row.kind === "athlete");
  const staff = listStaff(clubId, viewer).find((row) => row.id === staffId);
  const left = item && typeof item.qty === "number" ? item.qty - gearGiven(state.gearDeliveries, item.id) : 0;
  const jerseyNo = item?.kind === "plain" ? "" : jerseyNumber(number, item?.kind === "match");
  if (!item?.facilityId || typeof item.qty !== "number" || jerseyNo === null || !person || !Number.isFinite(count) || count < 1 || count > left || !date || date > todayISO || !staff || !Number.isFinite(price) || price < 0) redirect(`${fail}&hata=teslim`);
  if (paidNow && price > 0 && !method) redirect(`${fail}&hata=teslim`);
  const size = item.size ?? "";
  const chargeId = nid("ek");
  const title = [item.name, size, jerseyNo].filter(Boolean).join(" · ");
  const charge: ExtraCharge = { id: chargeId, clubId, personId, title, amount: price, date };
  const delivery: GearDelivery = { id: nid("td"), clubId, itemId: item.id, personId, size, number: jerseyNo, count, date, staffId: staff.id, price, chargeId };
  const payment: ExtraPayment | null = paidNow && price > 0 && method
    ? { id: nid("eo"), clubId, chargeId, personId, date, amount: price, method, collectorStaffId: staff.id }
    : null;
  updateState((next) => {
    next.extraCharges.push(charge);
    next.gearDeliveries.push(delivery);
    if (payment) next.extraPayments.push(payment);
    if (item.kind === "match" && jerseyNo && person.teamId && !person.matchNumber) writeMatchNumber(next.people, person, jerseyNo);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect("/zimmet?eklendi=teslim");
}

export async function removeGearDelivery(clubId: string, deliveryId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = "/zimmet";
  if (!canCollect(viewer, clubId)) redirect(`${back}?hata=yetki`);
  if (String(formData.get("onay") ?? "") !== "sil") redirect(back);
  const delivery = readState().gearDeliveries.find((row) => row.id === deliveryId && row.clubId === clubId);
  if (!delivery) redirect(`${back}?hata=teslim`);
  updateState((state) => {
    state.gearDeliveries = state.gearDeliveries.filter((row) => row.id !== deliveryId);
    state.extraCharges = state.extraCharges.filter((row) => row.id !== delivery.chargeId);
    state.extraPayments = state.extraPayments.filter((row) => row.chargeId !== delivery.chargeId);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?cikarildi=teslim`);
}

export async function removeExtraCharge(clubId: string, chargeId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = duesBack(formData);
  if (!canCollect(viewer, clubId)) redirect(`${back}&hata=yetki`);
  updateState((state) => {
    state.extraCharges = state.extraCharges.filter((item) => !(item.id === chargeId && item.clubId === clubId));
    state.extraPayments = state.extraPayments.filter((item) => !(item.chargeId === chargeId && item.clubId === clubId));
    state.gearDeliveries = state.gearDeliveries.filter((item) => !(item.chargeId === chargeId && item.clubId === clubId));
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&cikarildi=kalem`);
}

export async function saveMatchNumber(clubId: string, personId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const back = teamCardReturn(formData.get("donus"), personId, "ozet") || `/sporcular/${personId}?sekme=ozet`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  if (!person?.teamId) redirect(`${back}&hata=numara`);
  const fromDelivery = formData.get("kaynak") === "teslim";
  const raw = fromDelivery ? latestMatchNumber(readState(), clubId, personId) : clean(formData.get("numara"), 8);
  const number = jerseyNumber(raw, fromDelivery);
  if (number === null) redirect(`${back}&hata=numara`);
  updateState((state) => {
    writeMatchNumber(state.people, person, number);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&takip=1`);
}

function writeMatchNumber(people: Person[], person: Person, number: string) {
  const next = { ...person, matchNumber: number || undefined };
  const index = people.findIndex((item) => item.id === person.id);
  if (index >= 0) people[index] = { ...people[index], matchNumber: next.matchNumber };
  else people.push(next);
}

function latestMatchNumber(state: { gearItems: GearItem[]; gearDeliveries: GearDelivery[] }, clubId: string, personId: string) {
  const hit = state.gearDeliveries
    .filter((row) => row.clubId === clubId && row.personId === personId && row.number)
    .map((row) => ({ row, item: state.gearItems.find((gear) => gear.id === row.itemId) }))
    .filter((line) => line.item?.kind === "match")
    .sort((left, right) => right.row.date.localeCompare(left.row.date) || right.row.id.localeCompare(left.row.id))[0];
  return hit?.row.number ?? "";
}

function jerseyNumber(raw: string, required: boolean) {
  if (!raw) return required ? null : "";
  return /^\d{1,3}$/.test(raw) ? raw : null;
}

function isJerseySize(size: string) {
  return (jerseySizes as readonly string[]).includes(size);
}

function jerseyLines(formData: FormData) {
  const lines: { size: string; qty: number }[] = [];
  for (const size of jerseySizes) {
    const raw = String(formData.get(`adet-${size}`) ?? "").trim();
    if (!raw) continue;
    const qty = Math.round(Number(raw));
    if (!Number.isFinite(qty) || qty < 0) return null;
    if (qty > 0) lines.push({ size, qty });
  }
  return lines;
}

function soleGearSize(rows: { itemId: string; size: string }[], itemId: string) {
  const sizes = [...new Set(rows.filter((row) => row.itemId === itemId && row.size).map((row) => row.size))];
  return sizes.length === 1 ? sizes[0] : "";
}

function gearGiven(rows: { itemId: string; count?: number }[], itemId: string) {
  return rows.filter((row) => row.itemId === itemId).reduce((sum, row) => sum + (row.count && row.count > 0 ? row.count : 1), 0);
}

function weekdayOf(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return (new Date(year, month - 1, day).getDay() + 6) % 7 + 1;
}

function monthEnd(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function addIsoDays(iso: string, count: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function spanDates(from: string, until: string, weekdays: number[]) {
  const rows: string[] = [];
  for (let iso = from; iso <= until; iso = addIsoDays(iso, 1)) {
    if (weekdays.includes(weekdayOf(iso))) rows.push(iso);
  }
  return rows;
}

function slotTaken(candidate: Training, sessions: Training[]) {
  return sessions.some((session) => {
    if (session.id === candidate.id || session.date !== candidate.date) return false;
    if (!(session.start < candidate.end && candidate.start < session.end)) return false;
    if (session.facilityId === candidate.facilityId) return true;
    if (candidate.teamId && session.teamId === candidate.teamId) return true;
    return Boolean(candidate.coachStaffId) && session.coachStaffId === candidate.coachStaffId;
  });
}

function clock(value: FormDataEntryValue | null) {
  const time = String(value ?? "");
  return /^\d{2}:\d{2}$/.test(time) ? time : "";
}

function planBack(formData: FormData, date: string) {
  const view = formData.get("gorunum") === "hafta" || formData.get("gorunum") === "ay" ? String(formData.get("gorunum")) : "gun";
  const axis = ["takim", "hoca", "salon", "tesis"].includes(String(formData.get("eksen"))) ? String(formData.get("eksen")) : "salon";
  return `/takvim?gun=${date}&gorunum=${view}&eksen=${axis}`;
}

export async function planSession(clubId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const rawDate = String(formData.get("date") ?? "").trim();
  const dateGiven = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
  const date = dateGiven || todayISO;
  const series = formData.get("seri") === "1";
  const back = planBack(formData, date);
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  if (!series && date < todayISO) redirect(`${back}&hata=gecmis`);
  const assign = formData.get("assign") === "coach" ? "coach" : "team";
  const teamId = clean(formData.get("teamId"), 48);
  const coachId = clean(formData.get("coachId"), 48);
  const facilityId = clean(formData.get("facilityId"), 48);
  const start = clock(formData.get("start"));
  const end = clock(formData.get("end"));
  const existingId = clean(formData.get("id"), 48);
  const team = listTeams(clubId, viewer).find((item) => item.id === teamId);
  const coaches = listStaff(clubId, viewer);
  const coach = coaches.find((item) => item.id === coachId);
  const facility = listFacilities(clubId, viewer).find((item) => item.id === facilityId);
  const known = listTrainings(clubId, viewer);
  const existing = existingId ? known.find((item) => item.id === existingId) : undefined;
  if ((assign === "team" && !team) || (assign === "coach" && !coach) || (!series && !facility) || !start || !end || start >= end) {
    redirect(`${back}&hata=plan`);
  }
  const coachStaffId = assign === "team" ? coach?.id || team!.coachStaffId : coach!.id;
  const branchFallback = team?.branchId || facility?.branchId || listBranches(clubId, viewer)[0]?.id || existing?.branchId || "";
  const sportId = team?.sportId || existing?.sportId || listSports(clubId, directory())[0]?.id || "";
  if (!sportId) redirect(`${back}&hata=plan`);
  const planned: Training = {
    id: existing?.id ?? nid("tr"),
    clubId,
    branchId: branchFallback,
    facilityId: facility?.id || "",
    sportId,
    teamId: assign === "team" ? team!.id : undefined,
    coachStaffId,
    title: clean(formData.get("title"), 60) || (assign === "team" ? `${team!.name} antrenman` : `${coach!.name} antrenman`),
    date,
    start,
    end,
    kind: existing?.kind === "match" || existing?.kind === "class" || existing?.kind === "private" ? existing.kind : "training",
    assign,
    coverStaffIds: existing?.coverStaffIds,
    absentStaffIds: existing?.absentStaffIds,
  };
  if (series && !existing && team) {
    const weekdays = formData.getAll("gun").map(Number).filter((day) => day >= 1 && day <= 7);
    const rawUntil = String(formData.get("until") ?? "").trim();
    const untilGiven = /^\d{4}-\d{2}-\d{2}$/.test(rawUntil) ? rawUntil : "";
    const view = formData.get("gorunum") === "hafta" || formData.get("gorunum") === "ay" ? String(formData.get("gorunum")) : "gun";
    const again = `/takvim?ayar=yeni&gorunum=${view}&hata=`;
    const upcoming = known.filter((session) => session.teamId === team.id && session.date >= todayISO).sort((left, right) => left.date.localeCompare(right.date));
    const startDate = dateGiven || upcoming[0]?.date || todayISO;
    const placeFrom = startDate < todayISO ? todayISO : startDate;
    const placeUntil = untilGiven || monthEnd(placeFrom);
    if (!weekdays.length || placeUntil < placeFrom) redirect(`${again}plan`);
    const dayPlace = new Map<number, NonNullable<typeof facility>>();
    for (const day of weekdays) {
      const found = listFacilities(clubId, viewer).find((item) => item.id === clean(formData.get(`salon-${day}`), 48));
      if (!found) redirect(`${again}plan`);
      dayPlace.set(day, found);
    }
    const dates = spanDates(placeFrom, placeUntil, weekdays);
    if (!dates.length) redirect(`${again}plan`);
    const replacedIds = new Set(known.filter((session) => session.teamId === team.id && session.date >= placeFrom && session.date <= placeUntil && weekdays.includes(weekdayOf(session.date))).map((session) => session.id));
    const open = known.filter((session) => !replacedIds.has(session.id));
    const seriesId = nid("sr");
    const rows: Training[] = [];
    const dayNames = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    for (const [index, day] of dates.entries()) {
      const place = dayPlace.get(weekdayOf(day));
      if (!place) redirect(`${again}plan`);
      const row: Training = {
        ...planned,
        id: `${nid("tr")}${index}`,
        date: day,
        seriesId,
        facilityId: place.id,
        branchId: team.branchId || place.branchId || branchFallback,
      };
      if (slotTaken(row, [...open, ...rows])) redirect(`${again}cakisma`);
      rows.push(row);
    }
    const summary = `${team.name} · ${weekdays.map((day) => `${dayNames[day]} ${dayPlace.get(day)?.name ?? ""}`).join(", ")} · ${start}–${end} · ${rows.length} antrenman`;
    updateState((state) => {
      state.trainings = state.trainings.filter((item) => !replacedIds.has(item.id));
      for (const id of replacedIds) {
        if (!state.hiddenTrainingIds.includes(id)) state.hiddenTrainingIds.push(id);
      }
      state.trainings.push(...rows);
      state.planNotices.unshift({
        id: nid("pn"),
        clubId,
        sessionId: rows[0].id,
        at: new Date().toISOString(),
        summary: `Seri planlandı: ${summary}`,
        audience: team.name,
      });
      state.planNotices = state.planNotices.slice(0, 12);
    });
    revalidatePath(`/c/${club.slug}`, "layout");
    redirect(`/takvim?gun=${dates[0]}&gorunum=hafta&planlandi=1&seri=${rows.length}`);
  }
  if (!facility) redirect(`${back}&hata=plan`);
  const clash = sessionClash(planned, known);
  if (clash) redirect(`${back}&hata=cakisma`);
  const summary = `${planned.title} ${date.split("-").reverse().join(".")} ${start}–${end} · ${facility.name}`;
  const audience = assign === "team" ? team!.name : coach!.name;
  updateState((state) => {
    const index = state.trainings.findIndex((item) => item.id === planned.id);
    if (index >= 0) state.trainings[index] = planned;
    else state.trainings.push(planned);
    state.planNotices.unshift({
      id: nid("pn"),
      clubId,
      sessionId: planned.id,
      at: new Date().toISOString(),
      summary: existing ? `Plan değişti: ${summary}` : `Planlandı: ${summary}`,
      audience,
    });
    state.planNotices = state.planNotices.slice(0, 12);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&planlandi=1`);
}

export async function placeDrops(clubId: string, formData: FormData): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return { ok: false, error: "Oturum yok." };
  const viewer = viewerFor(session, clubId);
  if (!canEditRoster(viewer, clubId)) return { ok: false, error: "Bu işlem için yetkin yok." };
  const teamIds = formData.getAll("teamId").map(String);
  const dates = formData.getAll("date").map(String);
  const starts = formData.getAll("start").map(String);
  const ends = formData.getAll("end").map(String);
  const facilityIds = formData.getAll("facilityId").map(String);
  if (!teamIds.length || new Set([teamIds.length, dates.length, starts.length, ends.length, facilityIds.length]).size !== 1) {
    return { ok: false, error: "Yerleştirme boş." };
  }
  const known = listTrainings(clubId, viewer);
  const teams = listTeams(clubId, viewer);
  const places = listFacilities(clubId, viewer);
  const rows: Training[] = [];
  for (let index = 0; index < teamIds.length; index += 1) {
    const team = teams.find((item) => item.id === teamIds[index]);
    const place = places.find((item) => item.id === facilityIds[index]);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dates[index] ?? "") ? dates[index] : "";
    const start = /^\d{2}:\d{2}$/.test(starts[index] ?? "") ? starts[index] : "";
    const end = /^\d{2}:\d{2}$/.test(ends[index] ?? "") ? ends[index] : "";
    if (!team || !place || !date || !start || !end || start >= end) return { ok: false, error: "Grup, salon ve saat yazılır. Bitiş, başlangıçtan sonra olur." };
    if (date < todayISO) return { ok: false, error: "Geçmiş güne yazılmaz." };
    if (!team.coachStaffId) return { ok: false, error: `${team.name} grubunda antrenör yok.` };
    const branchId = team.branchId || place.branchId || listBranches(clubId, viewer)[0]?.id || "";
    if (!team.sportId) return { ok: false, error: "Grup branşı yok." };
    const row: Training = {
      id: `${nid("tr")}${index}`,
      clubId,
      branchId,
      facilityId: place.id,
      sportId: team.sportId,
      teamId: team.id,
      coachStaffId: team.coachStaffId,
      title: team.name,
      date,
      start,
      end,
      kind: "training",
      assign: "team",
    };
    const others = [...known, ...rows].filter((item) => item.date === date && item.start < end && start < item.end);
    if (others.some((item) => item.teamId === team.id)) return { ok: false, error: `${team.name} bu saatte zaten var.` };
    const pilates = listSports(clubId, directory()).some((sport) => sport.id === team.sportId && sport.name.toLocaleLowerCase("tr-TR").includes("pilates"));
    const salonBusy = others.filter((item) => item.facilityId === place.id);
    if (!pilates && salonBusy.length) return { ok: false, error: `Bu saatte bu salonda ${salonBusy.map((item) => item.title).join(", ")} var.` };
    rows.push(row);
  }
  updateState((state) => {
    state.trainings.push(...rows);
    state.planNotices.unshift({
      id: nid("pn"),
      clubId,
      sessionId: rows[0].id,
      at: new Date().toISOString(),
      summary: `Sürükle bırak: ${rows.length} antrenman`,
      audience: rows[0].title,
    });
    state.planNotices = state.planNotices.slice(0, 12);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  return { ok: true, count: rows.length };
}

export async function cancelSession(clubId: string, sessionId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const known = listTrainings(clubId, viewer).find((item) => item.id === sessionId);
  const back = planBack(formData, known?.date || todayISO);
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  if (!known || known.date < todayISO) redirect(`${back}&hata=gecmis`);
  updateState((state) => {
    state.trainings = state.trainings.filter((item) => item.id !== sessionId);
    if (!state.hiddenTrainingIds.includes(sessionId)) state.hiddenTrainingIds.push(sessionId);
    state.planNotices.unshift({
      id: nid("pn"),
      clubId,
      sessionId,
      at: new Date().toISOString(),
      summary: `İptal: ${known.title} ${known.date.split("-").reverse().join(".")} ${known.start}`,
      audience: known.teamId ? known.title : known.coachStaffId,
    });
    state.planNotices = state.planNotices.slice(0, 12);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&iptal=1`);
}

export async function setSessionCrew(clubId: string, sessionId: string, formData: FormData) {
  const session = await getSession();
  const club = clubById(clubId);
  if (!session || !club) return;
  const viewer = viewerFor(session, clubId);
  const known = listTrainings(clubId, viewer).find((item) => item.id === sessionId);
  const back = `/takvim?ayar=${sessionId}&gun=${known?.date || todayISO}&gorunum=${formData.get("gorunum") === "hafta" || formData.get("gorunum") === "ay" ? formData.get("gorunum") : "gun"}`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  if (!known || known.date < todayISO) redirect(`${back}&hata=gecmis`);
  const team = known.teamId ? listTeams(clubId, viewer).find((item) => item.id === known.teamId) : undefined;
  const teamCoachIds = new Set([team?.coachStaffId, ...(team?.extraCoachIds ?? [])].filter(Boolean) as string[]);
  const staffIds = new Set(listStaff(clubId, viewer).map((member) => member.id));
  const absentStaffIds = formData.getAll("yok").map(String).filter((id) => teamCoachIds.has(id));
  const coverStaffIds = [...new Set(
    [...formData.getAll("kadro").map(String), String(formData.get("ek") ?? "")].filter((id) => id && staffIds.has(id) && !teamCoachIds.has(id)),
  )];
  updateState((state) => {
    const next = { ...known, absentStaffIds, coverStaffIds };
    const index = state.trainings.findIndex((item) => item.id === known.id);
    if (index >= 0) state.trainings[index] = next;
    else state.trainings.push(next);
    state.planNotices.unshift({
      id: nid("pn"),
      clubId,
      sessionId: known.id,
      at: new Date().toISOString(),
      summary: `Kadro değişti: ${known.title} ${known.date.split("-").reverse().join(".")}`,
      audience: team?.name || known.title,
    });
    state.planNotices = state.planNotices.slice(0, 12);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}&kadro=1`);
}

function hexColor(value: FormDataEntryValue | null, fallback: string) {
  const hex = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback;
}

async function saveClubLogo(slug: string, formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size < 1) return "";
  if (file.size > 3 * 1024 * 1024) return null;
  const type = file.type;
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/jpeg" ? "jpg" : "";
  if (!ext) return null;
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "public", "club-logos");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${slug}.${ext}`;
  const target = path.join(dir, filename);
  for (const old of fs.readdirSync(dir)) {
    if (old.startsWith(`${slug}.`)) fs.unlinkSync(path.join(dir, old));
  }
  fs.writeFileSync(target, Buffer.from(await file.arrayBuffer()));
  return `/club-logos/${filename}`;
}

export async function openClub(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const { isSuper } = await import("@skys/domain");
  const fail = "/platform/kulup/yeni";
  if (!isSuper(session.user)) redirect("/platform");
  const name = clean(formData.get("name"), 60);
  const city = clean(formData.get("city"), 40);
  const district = clean(formData.get("district"), 40);
  const ownerName = clean(formData.get("ownerName"), 60);
  const email = clean(formData.get("email"), 80).toLowerCase();
  const motto = clean(formData.get("motto"), 80) || `${district || city} için kulüp paneli.`;
  const accent = hexColor(formData.get("accent"), "#c8102e");
  const accentSoft = hexColor(formData.get("accentSoft"), "#fdecee");
  const splash = hexColor(formData.get("splash"), "#101a42");
  const { findAccountByEmail } = await import("@/lib/accounts");
  const { clubs } = await import("@skys/domain");
  const { districtsOf } = await import("@/lib/turkey-places");
  const { CLUB_HOST_ALIASES, PRODUCT_CLUB_SLUG } = await import("@/lib/tenant");
  const taken = new Set([
    ...clubs.map((club) => club.slug),
    ...readState().clubs.map((club) => club.slug),
    ...Object.keys(CLUB_HOST_ALIASES),
    ...Object.values(CLUB_HOST_ALIASES),
    PRODUCT_CLUB_SLUG,
    "admin",
    "www",
    "api",
    "login",
    "platform",
  ]);
  const slug = clubSubdomain(formData.get("subdomain"), taken);
  if (slug === null) redirect(`${fail}?hata=subdomain`);
  if (slug === "") redirect(`${fail}?hata=kulup`);
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const placeOk = Boolean(city && district && districtsOf(city).includes(district));
  if (!name || !placeOk || !ownerName || !emailOk || findAccountByEmail(email) || readState().staff.some((member) => member.email?.toLowerCase() === email)) {
    redirect(`${fail}?hata=kulup`);
  }
  const logo = await saveClubLogo(slug, formData);
  if (!logo) redirect(`${fail}?hata=logo`);
  const id = nid("kl");
  const mark = monogram(name);
  const club: import("@skys/domain").Club = {
    id,
    slug,
    name,
    legalName: name,
    city,
    district,
    phone: "",
    email,
    motto,
    monogram: mark,
    logo,
    accent,
    accentSoft,
    splash,
    planId: "baslangic",
    status: "active",
    trialEnds: todayISO,
    cancelHours: 12,
    noShowConsumesCredit: true,
    waitlistMinutes: 20,
  };
  updateState((state) => {
    state.clubs.push(club);
    state.owners.push({ id: nid("sa"), name: ownerName, email, clubId: id });
    state.brands[id] = { accent: club.accent, accentSoft: club.accentSoft, motto: club.motto };
  });
  revalidatePath("/platform", "layout");
  redirect(`/platform/kulup/${id}?eklendi=1`);
}

export async function updateClubLook(clubId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const { isSuper } = await import("@skys/domain");
  if (!isSuper(session.user)) redirect("/platform");
  const club = clubById(clubId);
  if (!club || club.id === "kadikoy") redirect("/platform/kulup");
  const motto = clean(formData.get("motto"), 80) || club.motto;
  const accent = hexColor(formData.get("accent"), club.accent);
  const accentSoft = hexColor(formData.get("accentSoft"), club.accentSoft);
  const splash = hexColor(formData.get("splash"), club.splash);
  const uploaded = await saveClubLogo(club.slug, formData);
  if (uploaded === null) redirect(`/platform/kulup/${club.id}?hata=logo`);
  updateState((state) => {
    const index = state.clubs.findIndex((item) => item.id === club.id);
    if (index < 0) return;
    state.clubs[index] = {
      ...state.clubs[index],
      motto,
      accent,
      accentSoft,
      splash,
      logo: uploaded || state.clubs[index].logo,
    };
    state.brands[club.id] = { accent, accentSoft, motto };
  });
  revalidatePath("/platform", "layout");
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`/platform/kulup/${club.id}?guncellendi=1`);
}

export async function startSupport(clubId: string) {
  const session = await getSession();
  if (!session) return;
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const { isSuper } = await import("@skys/domain");
  if (!isSuper(session.user)) return;
  const club = clubById(clubId);
  if (!club) return;
  const jar = await cookies();
  jar.set("skys_support", clubId, { httpOnly: true, sameSite: "lax", path: "/" });
  jar.set("skys_club", club.slug, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export async function stopSupport() {
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const jar = await cookies();
  jar.delete("skys_support");
  jar.delete("skys_club");
  redirect("/platform");
}

export async function savePlatformMembershipType(formData: FormData) {
  const session = await getSession();
  if (!session || !isSuper(session.user)) redirect("/login");
  const name = clean(formData.get("name"), 60);
  const amount = Math.round(Number(formData.get("amount")));
  if (!name || !Number.isFinite(amount) || amount < 0) redirect("/platform/sporcular?hata=uyelik");
  const row: PlatformMembershipType = { id: nid("pmt"), name, amount };
  updateState((state) => {
    if (!state.platformMembershipTypes) state.platformMembershipTypes = [];
    state.platformMembershipTypes.push(row);
  });
  revalidatePath("/platform/sporcular", "layout");
  redirect("/platform/sporcular?eklendi=uyelik");
}

export async function saveClubStudentRate(formData: FormData) {
  const session = await getSession();
  if (!session || !isSuper(session.user)) redirect("/login");
  const clubId = String(formData.get("clubId") ?? "");
  const month = monthOk(formData.get("month"));
  const unitPrice = Math.round(Number(formData.get("unitPrice")));
  const club = managedClubs().find((item) => item.id === clubId);
  if (!club || !month || !Number.isFinite(unitPrice) || unitPrice < 0) redirect("/platform/sporcular?hata=endeks");
  updateState((state) => {
    if (!state.clubStudentRates) state.clubStudentRates = [];
    const index = state.clubStudentRates.findIndex((row) => row.clubId === clubId && row.month === month);
    const row: ClubStudentRate = {
      id: index >= 0 ? state.clubStudentRates[index].id : nid("csr"),
      clubId,
      month,
      unitPrice,
    };
    if (index >= 0) state.clubStudentRates[index] = row;
    else state.clubStudentRates.push(row);
  });
  revalidatePath("/platform/sporcular", "layout");
  redirect(`/platform/sporcular?ay=${month}&guncellendi=endeks`);
}

export async function createPlatformAthlete(formData: FormData) {
  return savePlatformAthlete(formData);
}

export async function updatePlatformAthlete(id: string, formData: FormData) {
  return savePlatformAthlete(formData, id);
}

/** Kulüp kopyasına AllPlay360 üyeliği ekler; kulüp kartına yazılmaz. */
export async function enrollClubAthleteAsAllPlay(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || !isSuper(session.user)) redirect("/login");
  const existing = (readState().platformAthletes ?? []).find((row) => row.id === id);
  if (!existing || existing.source !== "club") redirect("/platform/sporcular?hata=1");
  const membershipTypeId = String(formData.get("membershipTypeId") ?? "");
  const membership = (readState().platformMembershipTypes ?? []).find((item) => item.id === membershipTypeId);
  if (!membership) redirect(`/platform/sporcular/${id}?hata=uyelik`);
  updateState((state) => {
    if (!state.platformAthletes) state.platformAthletes = [];
    const index = state.platformAthletes.findIndex((row) => row.id === id);
    if (index < 0) return;
    state.platformAthletes[index] = {
      ...state.platformAthletes[index],
      membershipTypeId: membership.id,
      membershipTypeName: membership.name,
      membershipAmount: membership.amount,
    };
  });
  revalidatePath("/platform/sporcular", "layout");
  redirect(`/platform/sporcular/${id}?guncellendi=uyelik`);
}

/** AllPlay360 üyeliğini sistem kaydından kaldırır; kulüp kartına dokunulmaz. */
export async function clearClubAthleteAllPlay(id: string) {
  const session = await getSession();
  if (!session || !isSuper(session.user)) redirect("/login");
  const existing = (readState().platformAthletes ?? []).find((row) => row.id === id);
  if (!existing || existing.source !== "club") redirect("/platform/sporcular?hata=1");
  updateState((state) => {
    if (!state.platformAthletes) state.platformAthletes = [];
    const index = state.platformAthletes.findIndex((row) => row.id === id);
    if (index < 0) return;
    const row = { ...state.platformAthletes[index] };
    delete row.membershipTypeId;
    delete row.membershipTypeName;
    delete row.membershipAmount;
    state.platformAthletes[index] = row;
  });
  revalidatePath("/platform/sporcular", "layout");
  redirect(`/platform/sporcular/${id}?guncellendi=1`);
}

async function savePlatformAthlete(formData: FormData, athleteId?: string) {
  const session = await getSession();
  if (!session || !isSuper(session.user)) redirect("/login");
  const back = athleteId ? `/platform/sporcular/${athleteId}` : "/platform/sporcular/yeni";
  const existing = athleteId
    ? (readState().platformAthletes ?? []).find((row) => row.id === athleteId)
    : undefined;
  if (athleteId && !existing) redirect("/platform/sporcular?hata=1");
  if (existing?.source === "club") {
    const note = clean(formData.get("note"), 240);
    updateState((state) => {
      if (!state.platformAthletes) state.platformAthletes = [];
      const index = state.platformAthletes.findIndex((row) => row.id === existing.id);
      if (index >= 0) state.platformAthletes[index] = { ...state.platformAthletes[index], note: note || undefined };
    });
    revalidatePath("/platform/sporcular", "layout");
    redirect(`/platform/sporcular/${existing.id}?guncellendi=1`);
  }

  const name = clean(formData.get("name"), 60);
  const birthYear = Number(formData.get("birthYear"));
  const birthDayRaw = String(formData.get("birthDay") ?? "");
  const birthMonthRaw = String(formData.get("birthMonth") ?? "");
  const birthDay = birthDayRaw ? Number(birthDayRaw) : undefined;
  const birthMonth = birthMonthRaw ? Number(birthMonthRaw) : undefined;
  const phone = clean(formData.get("phone"), 20);
  const rawStatus = String(formData.get("status") ?? "active");
  const status = rawStatus === "paused" || rawStatus === "trial" || rawStatus === "left" ? rawStatus : "active";
  const since = isoDate(formData.get("since"), todayISO);
  const note = clean(formData.get("note"), 240);
  // Yalnız referans: kulüp people tablosuna yazılmaz, öğrenci endeksine girmez.
  const clubId = String(formData.get("clubId") ?? "") || undefined;
  const membershipTypeId = String(formData.get("membershipTypeId") ?? "");
  const year = new Date().getFullYear();
  const club = clubId ? managedClubs().find((item) => item.id === clubId) : undefined;
  if (clubId && !club) redirect(`${back}?hata=1`);
  const types = readState().platformMembershipTypes ?? [];
  const membership = types.find((item) => item.id === membershipTypeId);
  if (!name || !Number.isInteger(birthYear) || birthYear < 1940 || birthYear > year || !membership) {
    redirect(`${back}?hata=1`);
  }
  if (since > todayISO) redirect(`${back}?hata=tarih`);
  const row: PlatformAthlete = {
    id: existing?.id ?? nid("pa"),
    name,
    birthYear,
    birthMonth,
    birthDay,
    phone: phone || undefined,
    status,
    since,
    source: "allplay360",
    clubId: club?.id,
    clubPersonId: undefined,
    clubName: club?.name,
    membershipTypeId: membership.id,
    membershipTypeName: membership.name,
    membershipAmount: membership.amount,
    note: note || undefined,
  };
  updateState((state) => {
    if (!state.platformAthletes) state.platformAthletes = [];
    const index = state.platformAthletes.findIndex((item) => item.id === row.id);
    if (index >= 0) state.platformAthletes[index] = row;
    else state.platformAthletes.push(row);
  });
  revalidatePath("/platform/sporcular", "layout");
  redirect(`/platform/sporcular/${row.id}?${existing ? "guncellendi" : "eklendi"}=1`);
}

function monogram(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return `${parts[0]?.[0] ?? "K"}${parts[1]?.[0] ?? ""}`.toLocaleUpperCase("tr-TR").slice(0, 2);
}

function clubSubdomain(value: FormDataEntryValue | null, taken: Set<string>) {
  const raw = String(value ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!/^[a-z0-9]{3,24}$/.test(raw)) return null;
  if (taken.has(raw)) return "";
  return raw;
}
