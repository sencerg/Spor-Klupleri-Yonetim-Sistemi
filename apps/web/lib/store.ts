import fs from "fs";
import path from "path";
import type { AthleteDevelopment, Attendance, Branch, Club, ClubStudentRate, DueOverride, DuePayment, ExtraCharge, ExtraPayment, Facility, GearDelivery, GearItem, GrantMap, Guardian, Person, PlanNotice, PlatformAthlete, PlatformMembershipType, Price, PrivateLesson, PrivatePrice, RollNotice, Season, Sport, Staff, StaffTitle, Team, Training } from "@skys/domain";

export interface ClubOwner {
  id: string;
  name: string;
  email: string;
  clubId: string;
}

export interface BrandChoice {
  accent: string;
  accentSoft: string;
  motto: string;
}

export interface LocalState {
  grants: Record<string, GrantMap>;
  brands: Record<string, BrandChoice>;
  notes: Record<string, { title: string; audience: string }[]>;
  retries: string[];
  sports: Sport[];
  seasons: Season[];
  teams: Team[];
  people: Person[];
  guardians: Guardian[];
  sportNames: Record<string, string>;
  branches: Branch[];
  facilities: Facility[];
  prices: Price[];
  hiddenBranchIds: string[];
  hiddenFacilityIds: string[];
  duePayments: DuePayment[];
  dueOverrides: DueOverride[];
  extraCharges: ExtraCharge[];
  extraPayments: ExtraPayment[];
  gearItems: GearItem[];
  gearDeliveries: GearDelivery[];
  trainings: Training[];
  hiddenTrainingIds: string[];
  planNotices: PlanNotice[];
  rollMarks: Attendance[];
  rollNotices: RollNotice[];
  privatePrices: PrivatePrice[];
  privateLessons: PrivateLesson[];
  developments: AthleteDevelopment[];
  staff: Staff[];
  titles: StaffTitle[];
  hiddenTitleIds: string[];
  clubs: Club[];
  owners: ClubOwner[];
  platformAthletes: PlatformAthlete[];
  platformMembershipTypes: PlatformMembershipType[];
  clubStudentRates: ClubStudentRate[];
}

const empty: LocalState = {
  grants: {},
  brands: {},
  notes: {},
  retries: [],
  sports: [],
  seasons: [],
  teams: [],
  people: [],
  guardians: [],
  sportNames: {},
  branches: [],
  facilities: [],
  prices: [],
  hiddenBranchIds: [],
  hiddenFacilityIds: [],
  duePayments: [],
  dueOverrides: [],
  extraCharges: [],
  extraPayments: [],
  gearItems: [],
  gearDeliveries: [],
  trainings: [],
  hiddenTrainingIds: [],
  planNotices: [],
  rollMarks: [],
  rollNotices: [],
  privatePrices: [],
  privateLessons: [],
  developments: [],
  staff: [],
  titles: [],
  hiddenTitleIds: [],
  clubs: [],
  owners: [],
  platformAthletes: [],
  platformMembershipTypes: [],
  clubStudentRates: [],
};
const file = path.join(process.cwd(), ".data", "state.json");

function read(): LocalState {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<LocalState>;
    return {
      grants: parsed.grants ?? {},
      brands: parsed.brands ?? {},
      notes: parsed.notes ?? {},
      retries: parsed.retries ?? [],
      sports: parsed.sports ?? [],
      seasons: parsed.seasons ?? [],
      teams: parsed.teams ?? [],
      people: parsed.people ?? [],
      guardians: parsed.guardians ?? [],
      sportNames: parsed.sportNames ?? {},
      branches: parsed.branches ?? [],
      facilities: parsed.facilities ?? [],
      prices: parsed.prices ?? [],
      hiddenBranchIds: parsed.hiddenBranchIds ?? [],
      hiddenFacilityIds: parsed.hiddenFacilityIds ?? [],
      duePayments: parsed.duePayments ?? [],
      dueOverrides: parsed.dueOverrides ?? [],
      extraCharges: parsed.extraCharges ?? [],
      extraPayments: parsed.extraPayments ?? [],
      gearItems: parsed.gearItems ?? [],
      gearDeliveries: parsed.gearDeliveries ?? [],
      trainings: parsed.trainings ?? [],
      hiddenTrainingIds: parsed.hiddenTrainingIds ?? [],
      planNotices: parsed.planNotices ?? [],
      rollMarks: parsed.rollMarks ?? [],
      rollNotices: parsed.rollNotices ?? [],
      privatePrices: parsed.privatePrices ?? [],
      privateLessons: parsed.privateLessons ?? [],
      developments: parsed.developments ?? [],
      staff: parsed.staff ?? [],
      titles: parsed.titles ?? [],
      hiddenTitleIds: parsed.hiddenTitleIds ?? [],
      clubs: parsed.clubs ?? [],
      owners: parsed.owners ?? [],
      platformAthletes: parsed.platformAthletes ?? [],
      platformMembershipTypes: parsed.platformMembershipTypes ?? [],
      clubStudentRates: parsed.clubStudentRates ?? [],
    };
  } catch {
    return { ...empty };
  }
}

function write(state: LocalState) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function readState() {
  return read();
}

export function updateState(change: (state: LocalState) => void) {
  const state = read();
  change(state);
  write(state);
  return state;
}
