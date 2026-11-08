export type Role =
  | "platform_super"
  | "club_owner"
  | "club_manager"
  | "branch_manager"
  | "finance"
  | "warehouse"
  | "coach"
  | "parent"
  | "athlete"
  | "member";

export type StaffRole =
  | "club_owner"
  | "club_manager"
  | "branch_manager"
  | "finance"
  | "warehouse"
  | "coach";

export type Channel = "web" | "mobile";

export interface Club {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  motto: string;
  monogram: string;
  logo?: string;
  accent: string;
  accentSoft: string;
  splash: string;
  planId: string;
  status: "trial" | "active";
  trialEnds: string;
  cancelHours: number;
  noShowConsumesCredit: boolean;
  waitlistMinutes: number;
}

export interface Branch {
  id: string;
  clubId: string;
  name: string;
  district: string;
  address: string;
}

export interface Facility {
  id: string;
  clubId: string;
  branchId?: string;
  name: string;
  kind: "salon" | "saha" | "studyo" | "havuz";
  capacity: number;
}

export interface Sport {
  id: string;
  clubId: string;
  name: string;
  model: "team" | "session";
  seasonId?: string;
}

export interface Season {
  id: string;
  clubId: string;
  name: string;
  start: string;
  end: string;
  active: boolean;
  sportId?: string;
}

export type TitleScope = "lead" | "coach" | "finance";

export interface StaffTitle {
  id: string;
  clubId: string;
  name: string;
  scope: TitleScope;
}

export interface Staff {
  id: string;
  clubId: string;
  branchId?: string;
  facilityId?: string;
  sportId?: string;
  name: string;
  duty: string;
  titleId?: string;
  phone: string;
  email?: string;
  loginRole?: StaffRole;
  leave?: { from: string; to: string; reason: string };
}

export type GroupKind = "school" | "squad";

export type PersonStatus = "active" | "trial" | "paused" | "left";

export interface Team {
  id: string;
  clubId: string;
  branchId?: string;
  facilityId?: string;
  sportId: string;
  seasonId: string;
  name: string;
  category: string;
  coachStaffId: string;
  extraCoachIds?: string[];
  kind?: GroupKind;
}

export type GuardianRole = "mother" | "father" | "emergency";

export interface Guardian {
  id: string;
  clubId: string;
  name: string;
  phone: string;
  email?: string;
  reference?: string;
  role?: GuardianRole;
  relation?: string;
}

export interface Person {
  id: string;
  clubId: string;
  branchId: string;
  sportId: string;
  teamId?: string;
  name: string;
  birthYear: number;
  birthMonth?: number;
  birthDay?: number;
  kind: "athlete" | "member";
  enrollment?: GroupKind;
  status: PersonStatus;
  guardian?: string;
  guardianId?: string;
  motherId?: string;
  fatherId?: string;
  emergencyId?: string;
  phone?: string;
  reference?: string;
  matchNumber?: string;
  since: string;
  priceId?: string;
  priceName?: string;
  listAmount?: number;
  discountKind?: "none" | "percent" | "custom";
  discountPercent?: number;
  chargedAmount?: number;
}

export interface Price {
  id: string;
  clubId: string;
  name: string;
  amount: number;
}

/** AllPlay360 sistem tarafı üyelik tipi (özel üye fiyatları). */
export interface PlatformMembershipType {
  id: string;
  name: string;
  amount: number;
}

/**
 * Sistem paneli sporcu kaydı.
 * Kaynak club ise kulüp kartının kopyasıdır; platformdaki değişiklik kulübe yazılmaz.
 * Kaynak allplay360 ise AllPlay360 özel üyesidir; isteğe bağlı kulüp bağlantısı yalnızca referanstır.
 */
export interface PlatformAthlete {
  id: string;
  name: string;
  birthYear: number;
  birthMonth?: number;
  birthDay?: number;
  phone?: string;
  status: PersonStatus;
  since: string;
  source: "club" | "allplay360";
  clubId?: string;
  clubPersonId?: string;
  clubName?: string;
  membershipTypeId?: string;
  membershipTypeName?: string;
  membershipAmount?: number;
  note?: string;
}

/** Kulüp başına aylık öğrenci birim fiyatı (AllPlay360 → kulüp faturalaması). */
export interface ClubStudentRate {
  id: string;
  clubId: string;
  month: string;
  unitPrice: number;
}

export interface MeasurePoint {
  date: string;
  heightCm?: number;
  weightKg?: number;
  spanCm?: number;
  shoe?: string;
}

export interface AthleteNote {
  date: string;
  text: string;
  title?: string;
  season?: string;
  place?: string;
  position?: string;
}

export interface AthleteDevelopment {
  personId: string;
  start?: MeasurePoint;
  monthly: MeasurePoint[];
  notes: AthleteNote[];
  basketballHistory: AthleteNote[];
}

export interface Training {
  id: string;
  clubId: string;
  branchId: string;
  facilityId: string;
  sportId: string;
  teamId?: string;
  coachStaffId: string;
  coverStaffIds?: string[];
  absentStaffIds?: string[];
  title: string;
  date: string;
  start: string;
  end: string;
  kind: "training" | "class" | "match" | "private";
  capacity?: number;
  assign?: "team" | "coach";
  seriesId?: string;
  personId?: string;
}

export interface PrivatePrice {
  id: string;
  clubId: string;
  name: string;
  coachStaffId: string;
  amount: number;
}

export type PrivateLessonStatus = "requested" | "scheduled" | "cancelled";

export interface PrivateLesson {
  id: string;
  clubId: string;
  personId: string;
  teamId?: string;
  coachStaffId: string;
  facilityId?: string;
  priceId: string;
  title: string;
  date?: string;
  start?: string;
  end?: string;
  status: PrivateLessonStatus;
  trainingId?: string;
  note?: string;
  amount: number;
}

export interface PlanNotice {
  id: string;
  clubId: string;
  sessionId: string;
  at: string;
  summary: string;
  audience: string;
}

export type AttendanceStatus = "present" | "absent" | "excused" | "pending";

export interface Attendance {
  sessionId: string;
  personId: string;
  status: Exclude<AttendanceStatus, "pending">;
}

export interface RollNotice {
  id: string;
  clubId: string;
  sessionId: string;
  at: string;
  title: string;
  audience: string;
  lines: { personId: string; name: string; status: Exclude<AttendanceStatus, "pending"> }[];
}

export interface Booking {
  sessionId: string;
  personId: string;
  status: "booked" | "waitlist";
}

export interface Invoice {
  id: string;
  clubId: string;
  personId: string;
  title: string;
  amount: number;
  paid: number;
  due: string;
  status: "paid" | "partial" | "overdue" | "open";
}

export type PayMethod = "cash" | "transfer" | "card";

export interface DuePayment {
  id: string;
  clubId: string;
  personId: string;
  month: string;
  date: string;
  amount: number;
  method?: PayMethod;
  collectorStaffId?: string;
  note?: string;
}

export interface DueOverride {
  clubId: string;
  personId: string;
  month: string;
  amount: number;
}

export interface ExtraCharge {
  id: string;
  clubId: string;
  personId: string;
  title: string;
  amount: number;
  date: string;
}

export const jerseySizes = ["1", "2", "3", "4", "5", "XSmall", "Small", "Medium", "Large", "XLarge"] as const;

export type GearKind = "plain" | "training" | "match";

export interface GearItem {
  id: string;
  clubId: string;
  facilityId?: string;
  name: string;
  kind?: GearKind;
  size?: string;
  qty?: number;
}

export interface GearDelivery {
  id: string;
  clubId: string;
  itemId: string;
  personId: string;
  size: string;
  number: string;
  count?: number;
  date: string;
  staffId: string;
  price: number;
  chargeId: string;
}

export interface ExtraPayment {
  id: string;
  clubId: string;
  chargeId: string;
  personId: string;
  date: string;
  amount: number;
  method?: PayMethod;
  collectorStaffId?: string;
  note?: string;
}

export interface Credit {
  personId: string;
  title: string;
  remaining: number;
  total: number;
}

export interface Warehouse {
  id: string;
  clubId: string;
  branchId: string;
  name: string;
}

export interface StockItem {
  id: string;
  clubId: string;
  warehouseId: string;
  name: string;
  variant: string;
  qty: number;
  min: number;
}

export interface CustodyLine {
  personId: string;
  itemId: string;
  qty: number;
}

export interface Custody {
  id: string;
  clubId: string;
  date: string;
  title: string;
  actor: string;
  status: "completed";
  lines: CustodyLine[];
}

export interface Notice {
  id: string;
  clubId: string;
  title: string;
  body: string;
  audience: string;
  at: string;
  delivered: number;
  failed: number;
  state: "sent" | "retrying";
  failureNote?: string;
}

export interface AuditEntry {
  id: string;
  clubId: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  summary: string;
  before?: string;
  after?: string;
}

export interface Plan {
  id: string;
  name: string;
  monthly: number;
  branches: number;
  people: number;
  push: number;
  blurb: string;
}

export interface Membership {
  role: Role;
  clubId?: string;
  branchIds?: string[];
  teamIds?: string[];
  sportIds?: string[];
  personId?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  memberships: Membership[];
}

export type GrantMap = Partial<Record<StaffRole, string[]>>;

export interface Viewer {
  user: UserAccount;
  supportClubId?: string;
  grants?: GrantMap;
}

export interface ScreenLink {
  group: string;
  href: string;
  id: string;
  label: string;
}

export interface Directory {
  sports: Sport[];
  seasons: Season[];
  teams: Team[];
  people: Person[];
  guardians?: Guardian[];
  developments?: AthleteDevelopment[];
  sportNames?: Record<string, string>;
  branches?: Branch[];
  facilities?: Facility[];
  hiddenBranchIds?: string[];
  hiddenFacilityIds?: string[];
  trainings?: Training[];
  hiddenTrainingIds?: string[];
  planNotices?: PlanNotice[];
  rollMarks?: Attendance[];
  rollNotices?: RollNotice[];
  privatePrices?: PrivatePrice[];
  privateLessons?: PrivateLesson[];
  staff?: Staff[];
  titles?: StaffTitle[];
  hiddenTitleIds?: string[];
}
