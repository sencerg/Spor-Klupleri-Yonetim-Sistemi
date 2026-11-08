import { findUser, findUserByEmail, users, type Staff, type StaffRole, type Team, type UserAccount } from "@skys/domain";
import { readState } from "./store";
import { clubPublicHost } from "./tenant";

const loginRoles = new Set<StaffRole>(["club_manager", "finance", "warehouse", "coach"]);

export function staffAccount(member: Staff, teams: Team[]): UserAccount | null {
  if (!member.email || !member.loginRole || !loginRoles.has(member.loginRole)) return null;
  const coached = teams
    .filter((team) => team.clubId === member.clubId && (team.coachStaffId === member.id || team.extraCoachIds?.includes(member.id)))
    .map((team) => team.id);
  return {
    id: `acct-${member.id}`,
    name: member.name,
    email: member.email,
    memberships: [{
      role: member.loginRole,
      clubId: member.clubId,
      teamIds: member.loginRole === "coach" && coached.length ? coached : undefined,
      sportIds: member.loginRole === "coach" && !coached.length && member.sportId ? [member.sportId] : undefined,
    }],
  };
}

export function liveAccounts() {
  const state = readState();
  return state.staff
    .map((member) => staffAccount(member, state.teams))
    .filter((account): account is UserAccount => Boolean(account));
}

export function ownerAccounts(): UserAccount[] {
  return readState().owners.map((owner) => ({
    id: owner.id,
    name: owner.name,
    email: owner.email,
    memberships: [{ role: "club_owner" as const, clubId: owner.clubId }],
  }));
}

export function findAccount(id: string | undefined) {
  return findUser(id) ?? liveAccounts().find((account) => account.id === id) ?? ownerAccounts().find((account) => account.id === id);
}

export function findAccountByEmail(email: string) {
  const key = email.trim().toLowerCase();
  return findUserByEmail(key) ?? liveAccounts().find((account) => account.email.toLowerCase() === key) ?? ownerAccounts().find((account) => account.email.toLowerCase() === key);
}

export function findClubLogin(identifier: string, club: { id: string; slug: string }) {
  const direct = findAccountByEmail(identifier);
  if (direct) return direct;
  const key = identifier.trim().toLocaleLowerCase("tr-TR");
  const aliases = new Set([club.slug, clubPublicHost(club.slug)].map((value) => value.toLocaleLowerCase("tr-TR")));
  if (!aliases.has(key)) return undefined;
  const owns = (account: UserAccount) => account.memberships.some((membership) => membership.clubId === club.id && membership.role === "club_owner");
  return ownerAccounts().find(owns) ?? users.find(owns);
}
