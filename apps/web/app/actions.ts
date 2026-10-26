"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canCollect,
  canEditRoster,
  canEditStructure,
  clubById,
  clubScreens,
  isOwner,
  listSeasons,
  listSports,
  discountRates,
  listYearSeasons,
  quoteFee,
  isCoachDuty,
  listWarehouses,
  staffTitles,
  sessionClash,
  membershipFor,
  staffRoles,
  todayISO,
  type Branch,
  type DuePayment,
  type Facility,
  type Guardian,
  type Person,
  type Price,
  type Sport,
  type Staff,
  type StaffRole,
  type AthleteDevelopment,
  type Team,
  type Training,
} from "@skys/domain";
import { directory, listBranches, listFacilities, listGuardians, listPeople, listPrices, listStaff, listTeams, listTrainings } from "@/lib/live";
import { getSession, viewerFor } from "@/lib/session";
import { updateState } from "@/lib/store";

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
  const phone = clean(formData.get(`${role}Phone`), 24);
  const relation = role === "emergency" ? clean(formData.get("emergencyRelation"), 40) : "";
  if (!name || !phoneKey(phone)) return undefined;
  const pool = [...known, ...pending];
  const idRaw = clean(formData.get(`${role}Id`), 48);
  const linked = idRaw ? pool.find((item) => item.id === idRaw && item.clubId === clubId) : undefined;
  if (linked) return linked;
  const key = phoneKey(phone);
  const byPhone = pool.find((item) => item.clubId === clubId && phoneKey(item.phone) === key);
  if (byPhone) return byPhone;
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
  const busy = listTrainings(clubId, viewer).some((session) => session.facilityId === facilityId);
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
  const branchRaw = String(formData.get("branchId") ?? "");
  const coachStaffId = String(formData.get("coachStaffId") ?? "");
  const sportId = String(formData.get("sportId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const dir = directory();
  const branch = branchRaw ? listBranches(clubId, viewer).find((item) => item.id === branchRaw) : undefined;
  const sport = listSports(clubId, dir).find((item) => item.id === sportId);
  const season = listYearSeasons(clubId, dir).find((item) => item.id === seasonId);
  const coach = listStaff(clubId, viewer).find((member) => member.id === coachStaffId && isCoachDuty(member.duty));
  const taken = listTeams(clubId, viewer).some((team) => sameName(team.name, name));
  if (branchRaw && !branch) redirect(`${fail}&hata=1`);
  if (!season) redirect(`${fail}&hata=sezon`);
  if (!coach) redirect(`${fail}&hata=antrenor`);
  if (!name || !kind || !sport || taken) redirect(`${fail}&hata=1`);
  const team: Team = {
    id: nid("tm"),
    clubId,
    branchId: branch?.id,
    sportId,
    seasonId: season.id,
    name,
    category: "",
    coachStaffId: coach.id,
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
  const duty = String(formData.get("duty") ?? "");
  const phone = clean(formData.get("phone"), 24);
  const branchRaw = String(formData.get("branchId") ?? "");
  const branch = branchRaw ? listBranches(clubId, viewer).find((item) => item.id === branchRaw) : undefined;
  const existing = creating ? undefined : listStaff(clubId, viewer).find((member) => member.id === staffId);
  const taken = listStaff(clubId, viewer).some((member) => member.id !== existing?.id && sameName(member.name, name));
  if (!creating && !existing) redirect("/personel?hata=1");
  if (branchRaw && !branch) redirect(`${fail}&hata=1`);
  if (!name || !phoneKey(phone) || !(staffTitles as readonly string[]).includes(duty) || taken) redirect(`${fail}&hata=personel`);
  const member: Staff = {
    id: existing?.id ?? nid("st"),
    clubId,
    branchId: branch?.id,
    name,
    duty,
    phone,
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
  const back = `/sporcular/${personId}`;
  if (!canEditRoster(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const person = listPeople(clubId, viewer).find((item) => item.id === personId);
  if (!person) redirect("/sporcular?hata=1");
  const section = String(formData.get("bolum") ?? "");
  const date = isoDate(formData.get("date"), todayISO);
  if (date > todayISO) redirect(`${back}?hata=tarih`);
  const height = optionalMeasure(formData.get("height"), 40, 250);
  const weight = optionalMeasure(formData.get("weight"), 10, 200);
  const text = clean(formData.get("text"), 240);
  if ((section === "baslangic" || section === "aylik") && (height === null || weight === null || (height == null && weight == null))) {
    redirect(`${back}?hata=olcu`);
  }
  if ((section === "not" || section === "gecmis") && !text) redirect(`${back}?hata=olcu`);
  if (section !== "baslangic" && section !== "aylik" && section !== "not" && section !== "gecmis") redirect(`${back}?hata=olcu`);
  const heightCm = height ?? undefined;
  const weightKg = weight ?? undefined;
  updateState((state) => {
    if (!state.developments) state.developments = [];
    const row = ensureTrack(state.developments, personId);
    if (section === "baslangic") row.start = { date, heightCm, weightKg };
    if (section === "aylik") row.monthly.unshift({ date, heightCm, weightKg });
    if (section === "not") row.notes.unshift({ date, text });
    if (section === "gecmis") row.basketballHistory.unshift({ date, text });
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(`${back}?takip=1`);
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
  if (!canEditRoster(viewer, clubId)) redirect(`${back}?hata=yetki`);
  const existing = personId ? listPeople(clubId, viewer).find((item) => item.id === personId) : undefined;
  if (personId && !existing) redirect(`${back}?hata=1`);
  const name = clean(formData.get("name"), 60);
  const birthYear = Number(formData.get("birthYear"));
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
  if (teamId && !team) redirect(`${back}?hata=1`);
  if (team && (team.kind ?? "squad") !== enrollment) redirect(`${back}?hata=1`);
  if (team) {
    sportId = team.sportId;
    branchId = team.branchId ?? "";
  }
  if (!branchId) branchId = listBranches(clubId, viewer)[0]?.id ?? "";
  const sportOk = listSports(clubId, dir).some((sport) => sport.id === sportId);
  const branchOk = listBranches(clubId, viewer).some((branch) => branch.id === branchId);
  if (!name || !Number.isInteger(birthYear) || birthYear < 1940 || birthYear > year || !sportOk || !branchOk) {
    redirect(`${back}?hata=1`);
  }
  if (since > todayISO) redirect(`${back}?hata=tarih`);
  const known = listGuardians(clubId);
  const pending: Guardian[] = [];
  const mother = linkGuardian(known, pending, clubId, "mother", formData);
  const father = linkGuardian(known, pending, clubId, "father", formData);
  const emergency = linkGuardian(known, pending, clubId, "emergency", formData);
  const primaryRole = formData.get("primary") === "father" ? "father" : "mother";
  const guardian = primaryRole === "father" ? father : mother;
  if (!guardian || startedContact(formData, "mother") !== Boolean(mother) || startedContact(formData, "father") !== Boolean(father) || startedContact(formData, "emergency") !== Boolean(emergency)) {
    redirect(`${back}?hata=veli`);
  }
  const prices = listPrices(clubId);
  const price = prices.find((item) => item.id === String(formData.get("priceId") ?? ""));
  if (prices.length && !price) redirect(`${back}?hata=fiyat`);
  const rawDiscount = String(formData.get("discount") ?? "none");
  const discountKind = rawDiscount === "custom" ? "custom" : rawDiscount === "percent" ? "percent" : "none";
  const discountPercent = Number(formData.get("discountPercent"));
  const customAmount = Math.round(Number(formData.get("customAmount")));
  if (price && discountKind === "percent" && !discountRates.some((item) => item.percent === discountPercent)) {
    redirect(`${back}?hata=fiyat`);
  }
  if (price && discountKind === "custom" && (!Number.isFinite(customAmount) || customAmount < 0)) {
    redirect(`${back}?hata=fiyat`);
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
  };
  updateState((state) => {
    if (!state.guardians) state.guardians = [];
    state.guardians.push(...pending);
    const index = state.people.findIndex((item) => item.id === person.id);
    if (index >= 0) state.people[index] = person;
    else state.people.push(person);
  });
  revalidatePath(`/c/${club.slug}`, "layout");
  redirect(existing ? `${back}?guncellendi=sporcu` : `${back}?eklendi=sporcu`);
}

function monthOk(value: FormDataEntryValue | null) {
  const month = String(value ?? "");
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "";
}

function duesBack(formData: FormData) {
  const month = monthOk(formData.get("month")) || todayISO.slice(0, 7);
  const personId = clean(formData.get("personId"), 48);
  return personId ? `/aidat?al=${personId}&ay=${month}` : `/aidat?ay=${month}`;
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
  const amount = Math.round(Number(formData.get("amount")));
  const method = String(formData.get("method") ?? "");
  const person = listPeople(clubId, viewer).find((item) => item.id === personId && item.kind === "athlete");
  const knownMethod = method === "cash" || method === "transfer" || method === "card";
  if (!person || !month || !date || date > todayISO || !Number.isFinite(amount) || amount < 1 || !knownMethod) {
    redirect(`${back}&hata=odeme`);
  }
  const payment: DuePayment = { id: nid("od"), clubId, personId, month, date, amount, method };
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
  const date = isoDate(formData.get("date"), todayISO);
  const back = planBack(formData, date);
  if (!canEditRoster(viewer, clubId)) redirect(`${back}&hata=yetki`);
  if (date < todayISO) redirect(`${back}&hata=gecmis`);
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
  if ((assign === "team" && !team) || (assign === "coach" && !coach) || !facility || !start || !end || start >= end) {
    redirect(`${back}&hata=plan`);
  }
  const coachStaffId = assign === "team" ? coach?.id || team!.coachStaffId : coach!.id;
  const branchId = team?.branchId || facility.branchId || listBranches(clubId, viewer)[0]?.id || existing?.branchId || "";
  const sportId = team?.sportId || existing?.sportId || listSports(clubId, directory())[0]?.id || "";
  if (!branchId || !sportId) redirect(`${back}&hata=plan`);
  const planned: Training = {
    id: existing?.id ?? nid("tr"),
    clubId,
    branchId,
    facilityId: facility.id,
    sportId,
    teamId: assign === "team" ? team!.id : undefined,
    coachStaffId,
    title: clean(formData.get("title"), 60) || (assign === "team" ? `${team!.name} antrenman` : `${coach!.name} antrenman`),
    date,
    start,
    end,
    kind: existing?.kind ?? "training",
    assign,
  };
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

export async function startSupport(clubId: string) {
  const session = await getSession();
  if (!session) return;
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const { isSuper, clubById } = await import("@skys/domain");
  if (!isSuper(session.user)) return;
  const club = clubById(clubId);
  if (!club) return;
  const jar = await cookies();
  jar.set("skys_support", clubId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(`/c/${club.slug}`);
}

export async function stopSupport() {
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const jar = await cookies();
  jar.delete("skys_support");
  redirect("/platform");
}
