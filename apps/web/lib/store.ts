import fs from "fs";
import path from "path";
import type { AthleteDevelopment, Branch, DueOverride, DuePayment, Facility, GrantMap, Guardian, Person, PlanNotice, Price, Season, Sport, Staff, Team, Training } from "@skys/domain";

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
  trainings: Training[];
  hiddenTrainingIds: string[];
  planNotices: PlanNotice[];
  developments: AthleteDevelopment[];
  staff: Staff[];
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
  trainings: [],
  hiddenTrainingIds: [],
  planNotices: [],
  developments: [],
  staff: [],
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
      trainings: parsed.trainings ?? [],
      hiddenTrainingIds: parsed.hiddenTrainingIds ?? [],
      planNotices: parsed.planNotices ?? [],
      developments: parsed.developments ?? [],
      staff: parsed.staff ?? [],
    };
  } catch {
    return {
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
      trainings: [],
      hiddenTrainingIds: [],
      planNotices: [],
      developments: [],
      staff: [],
    };
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
