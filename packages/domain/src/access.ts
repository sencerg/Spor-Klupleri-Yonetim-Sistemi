import type { GrantMap, Role, ScreenLink, StaffRole, UserAccount, Viewer } from "./types";

export const DEMO_PASSWORD = "skys2026";

export const roleLabels: Record<Role, string> = {
  platform_super: "Platform süper admin",
  club_owner: "Kulüp sahibi",
  club_manager: "Kulüp yöneticisi",
  branch_manager: "Şube müdürü",
  finance: "Finans sorumlusu",
  warehouse: "Depo sorumlusu",
  coach: "Antrenör",
  parent: "Veli",
  athlete: "Sporcu",
  member: "Üye",
};

export const scopeLabels: Record<StaffRole, string> = {
  club_owner: "Tüm kulüp",
  club_manager: "Tüm kulüp",
  branch_manager: "Yetkili şubeler",
  finance: "Tüm kulüp",
  warehouse: "Tüm kulüp",
  coach: "Atandığı gruplar",
};

export const staffRoles: StaffRole[] = [
  "club_owner",
  "club_manager",
  "branch_manager",
  "finance",
  "warehouse",
  "coach",
];

export const clubScreens: ScreenLink[] = [
  { group: "Genel Yönetim", href: "", id: "dashboard.view", label: "Dashboard" },
  { group: "Genel Yönetim", href: "ayarlar", id: "club.settings", label: "Ayarlar" },
  { group: "Genel Yönetim", href: "subeler", id: "club.branches", label: "Tesisler" },
  { group: "Genel Yönetim", href: "branslar", id: "club.sports", label: "Branşlar ve Sezonlar" },
  { group: "Spor Operasyonları", href: "sporcular", id: "athletes.view", label: "Sporcu kaydı" },
  { group: "Spor Operasyonları", href: "takimlar", id: "teams.view", label: "Takımlar ve Gruplar" },
  { group: "Spor Operasyonları", href: "takvim", id: "schedule.view", label: "Antrenman Takvimi" },
  { group: "Spor Operasyonları", href: "yoklama", id: "attendance.view", label: "Yoklama" },
  { group: "Spor Operasyonları", href: "seanslar", id: "sessions.view", label: "Seans Rezervasyonları" },
  { group: "İşletme Yönetimi", href: "stok", id: "stock.view", label: "Stok ve Depolar" },
  { group: "İşletme Yönetimi", href: "zimmet", id: "custody.view", label: "Zimmet İşlemleri" },
  { group: "İşletme Yönetimi", href: "fiyatlar", id: "prices.view", label: "Fiyatlar" },
  { group: "İşletme Yönetimi", href: "aidat", id: "finance.view", label: "Aidatlar ve Tahsilatlar" },
  { group: "İşletme Yönetimi", href: "personel", id: "staff.view", label: "Personel Yönetimi" },
  { group: "İletişim ve Analiz", href: "bildirimler", id: "notifications.view", label: "Bildirim Merkezi" },
  { group: "İletişim ve Analiz", href: "raporlar", id: "reports.view", label: "Raporlar" },
  { group: "İletişim ve Analiz", href: "gecmis", id: "audit.view", label: "İşlem Geçmişi" },
  { group: "İletişim ve Analiz", href: "yetkiler", id: "access.manage", label: "Ekran Yetkileri" },
  { group: "Ürün", href: "versionlar", id: "product.versions", label: "Versionlar" },
];

const allScreens = clubScreens.map((screen) => screen.id);

export const defaultGrants: Record<StaffRole, string[]> = {
  club_owner: allScreens,
  club_manager: allScreens.filter((id) => id !== "access.manage"),
  branch_manager: [
    "dashboard.view",
    "club.branches",
    "athletes.view",
    "teams.view",
    "schedule.view",
    "attendance.view",
    "sessions.view",
    "staff.view",
    "prices.view",
    "notifications.view",
    "reports.view",
    "product.versions",
  ],
  finance: ["dashboard.view", "athletes.view", "prices.view", "finance.view", "reports.view", "audit.view", "product.versions"],
  warehouse: ["dashboard.view", "athletes.view", "stock.view", "custody.view", "product.versions"],
  coach: ["dashboard.view", "teams.view", "schedule.view", "attendance.view", "notifications.view", "product.versions"],
};

const webRoles = new Set<Role>(staffRoles);
const mobileRoles = new Set<Role>(["coach", "parent", "athlete", "member"]);

export function isSuper(user: UserAccount) {
  return user.memberships.some((membership) => membership.role === "platform_super");
}

export function membershipFor(user: UserAccount, clubId: string) {
  return user.memberships.find((membership) => membership.clubId === clubId);
}

export function can(viewer: Viewer, clubId: string, permission: string) {
  if (isSuper(viewer.user)) return viewer.supportClubId === clubId;
  const membership = membershipFor(viewer.user, clubId);
  if (!membership || !webRoles.has(membership.role)) return false;
  const role = membership.role as StaffRole;
  if (role === "club_owner") return defaultGrants.club_owner.includes(permission);
  const custom = viewer.grants?.[role];
  return (custom ?? defaultGrants[role]).includes(permission);
}

export function canEnterClub(viewer: Viewer, clubId: string) {
  if (isSuper(viewer.user)) return viewer.supportClubId === clubId;
  const membership = membershipFor(viewer.user, clubId);
  return Boolean(membership && webRoles.has(membership.role));
}

export function channelClubs(user: UserAccount, channel: "web" | "mobile") {
  const allowed = channel === "web" ? webRoles : mobileRoles;
  return user.memberships.filter(
    (membership) => membership.clubId && allowed.has(membership.role),
  );
}

export function isOwner(viewer: Viewer, clubId: string) {
  return viewer.user.memberships.some(
    (membership) => membership.clubId === clubId && membership.role === "club_owner",
  );
}

export function canEditStructure(viewer: Viewer, clubId: string) {
  if (isSuper(viewer.user)) return false;
  const membership = membershipFor(viewer.user, clubId);
  return Boolean(membership && (membership.role === "club_owner" || membership.role === "club_manager"));
}

export function canCollect(viewer: Viewer, clubId: string) {
  if (isSuper(viewer.user)) return false;
  const membership = membershipFor(viewer.user, clubId);
  return Boolean(
    membership &&
      (membership.role === "club_owner" || membership.role === "club_manager" || membership.role === "finance"),
  );
}

export function canEditRoster(viewer: Viewer, clubId: string) {
  if (isSuper(viewer.user)) return false;
  const membership = membershipFor(viewer.user, clubId);
  return Boolean(
    membership &&
      (membership.role === "club_owner" ||
        membership.role === "club_manager" ||
        membership.role === "branch_manager"),
  );
}

export function canComposeNotice(viewer: Viewer, clubId: string) {
  if (isSuper(viewer.user)) return false;
  const membership = membershipFor(viewer.user, clubId);
  return Boolean(
    membership &&
      (membership.role === "club_owner" ||
        membership.role === "club_manager" ||
        membership.role === "branch_manager"),
  );
}

export function screenPermission(segment: string) {
  return clubScreens.find((screen) => screen.href === segment)?.id;
}

export function grantsOrDefault(grants: GrantMap | undefined, role: StaffRole) {
  return grants?.[role] ?? defaultGrants[role];
}
