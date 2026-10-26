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

export interface Staff {
  id: string;
  clubId: string;
  branchId?: string;
  name: string;
  duty: string;
  phone: string;
  leave?: { from: string; to: string; reason: string };
}

export type GroupKind = "school" | "squad";

export type PersonStatus = "active" | "trial" | "paused" | "left";

export interface Team {
  id: string;
  clubId: string;
  branchId?: string;
  sportId: string;
  seasonId: string;
  name: string;
  category: string;
  coachStaffId: string;
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

export interface MeasurePoint {
  date: string;
  heightCm?: number;
  weightKg?: number;
}

export interface AthleteNote {
  date: string;
  text: string;
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
  title: string;
  date: string;
  start: string;
  end: string;
  kind: "training" | "class";
  capacity?: number;
  assign?: "team" | "coach";
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
  method: PayMethod;
}

export interface DueOverride {
  clubId: string;
  personId: string;
  month: string;
  amount: number;
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
  staff?: Staff[];
}
