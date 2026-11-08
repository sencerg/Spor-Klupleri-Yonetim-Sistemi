import type { Club } from "@skys/domain";
import {
  branchName as branchNameBase,
  facilityName as facilityNameBase,
  listBranches as listBranchesBase,
  listFacilities as listFacilitiesBase,
  listGuardians as listGuardiansBase,
  listPeople as listPeopleBase,
  listSeasons as listSeasonsBase,
  listSports as listSportsBase,
  listYearSeasons as listYearSeasonsBase,
  listStaff as listStaffBase,
  listTitles as listTitlesBase,
  listTeams as listTeamsBase,
  staffName as staffNameBase,
  listTrainings as listTrainingsBase,
  clubConflictIds as clubConflictIdsBase,
  nameOf as nameOfBase,
  personProfile as personProfileBase,
  clubs as catalogClubs,
  clubById as clubByIdBase,
  clubBySlug as clubBySlugBase,
  platformClubs as platformClubsBase,
  sportName as sportNameBase,
  teamName as teamNameBase,
  type Directory,
  type Viewer,
} from "@skys/domain";
import { readState } from "./store";

export function directory(): Directory {
  const state = readState();
  return {
    sports: state.sports,
    seasons: state.seasons,
    teams: state.teams,
    people: state.people,
    guardians: state.guardians,
    sportNames: state.sportNames,
    branches: state.branches,
    facilities: state.facilities,
    hiddenBranchIds: state.hiddenBranchIds,
    hiddenFacilityIds: state.hiddenFacilityIds,
    trainings: state.trainings,
    hiddenTrainingIds: state.hiddenTrainingIds,
    planNotices: state.planNotices,
    rollMarks: state.rollMarks,
    rollNotices: state.rollNotices,
    developments: state.developments,
    staff: state.staff,
    titles: state.titles,
    hiddenTitleIds: state.hiddenTitleIds,
  };
}

export function listBranches(clubId: string, viewer: Viewer) {
  return listBranchesBase(clubId, viewer, directory());
}

export function listFacilities(clubId: string, viewer: Viewer) {
  return listFacilitiesBase(clubId, viewer, directory());
}

export function branchName(id: string) {
  return branchNameBase(id, directory());
}

export function facilityName(id: string) {
  return facilityNameBase(id, directory());
}

export function listSports(clubId: string) {
  return listSportsBase(clubId, directory());
}

export function listSeasons(clubId: string) {
  return listSeasonsBase(clubId, directory());
}

export function listYearSeasons(clubId: string) {
  return listYearSeasonsBase(clubId, directory());
}

export function listTitles(clubId: string) {
  return listTitlesBase(clubId, directory());
}

export function listStaff(clubId: string, viewer: Viewer) {
  return listStaffBase(clubId, viewer, directory());
}

export function staffName(id: string) {
  return staffNameBase(id, directory());
}

export function listTeams(clubId: string, viewer: Viewer) {
  return listTeamsBase(clubId, viewer, directory());
}

export function listTrainings(clubId: string, viewer: Viewer) {
  return listTrainingsBase(clubId, viewer, directory());
}

export function conflictIds(clubId: string) {
  return clubConflictIdsBase(clubId, directory());
}

export function listPeople(clubId: string, viewer: Viewer) {
  return listPeopleBase(clubId, viewer, directory());
}

export function listGuardians(clubId: string) {
  return listGuardiansBase(clubId, directory());
}

export function listPrices(clubId: string) {
  return readState().prices.filter((price) => price.clubId === clubId);
}

export function nameOf(personId: string) {
  return nameOfBase(personId, directory());
}

export function sportName(id: string) {
  return sportNameBase(id, directory());
}

export function teamName(id?: string) {
  return teamNameBase(id, directory());
}

export function personProfile(clubId: string, viewer: Viewer, personId: string) {
  return personProfileBase(clubId, viewer, personId, directory());
}

export function platformClubs() {
  return platformClubsBase(directory());
}

export function clubById(id: string) {
  return readState().clubs.find((club) => club.id === id) ?? clubByIdBase(id);
}

export function clubBySlug(slug: string) {
  return readState().clubs.find((club) => club.slug === slug) ?? clubBySlugBase(slug);
}

export function managedClubs(): Club[] {
  const opened = readState().clubs;
  const base = catalogClubs.filter((club) => club.slug === "yeni-ufuklar");
  return [...base, ...opened.filter((club) => !base.some((item) => item.id === club.id || item.slug === club.slug))];
}
