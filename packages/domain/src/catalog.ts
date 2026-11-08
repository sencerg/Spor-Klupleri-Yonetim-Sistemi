import type {
  Attendance,
  AuditEntry,
  Booking,
  Branch,
  Club,
  Credit,
  Custody,
  Facility,
  Invoice,
  Notice,
  Person,
  Plan,
  Season,
  Sport,
  Staff,
  StockItem,
  Team,
  Training,
  UserAccount,
  Warehouse,
} from "./types";

function isoFromToday(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export const todayISO = isoFromToday(0);
const d = isoFromToday;

export const plans: Plan[] = [
  {
    id: "baslangic",
    name: "Başlangıç",
    monthly: 2490,
    branches: 1,
    people: 80,
    push: 500,
    blurb: "Tek tesisli kulüpler için kadro, takvim ve aidat.",
  },
  {
    id: "kulup",
    name: "Kulüp",
    monthly: 4990,
    branches: 3,
    people: 300,
    push: 3000,
    blurb: "Birden fazla şube ve branş yürüten kulüpler.",
  },
  {
    id: "cok-sube",
    name: "Çok Şube",
    monthly: 8990,
    branches: 10,
    people: 1500,
    push: 15000,
    blurb: "Stüdyo, havuz ve takım branşını birlikte işleten yapılar.",
  },
];

export const clubs: Club[] = [
  {
    id: "kadikoy",
    slug: "yeni-ufuklar",
    name: "Yeni Ufuklar",
    legalName: "Yeni Ufuklar BK",
    city: "İstanbul",
    district: "Eryaman",
    phone: "0216 000 11 20",
    email: "merkez@yeniufuklar.test",
    motto: "Parke, disiplin, 2015.",
    monogram: "YU",
    logo: "/yeni-ufuklar.png",
    accent: "#c8102e",
    accentSoft: "#fdecee",
    splash: "#101a42",
    planId: "kulup",
    status: "trial",
    trialEnds: d(18),
    cancelHours: 12,
    noShowConsumesCredit: true,
    waitlistMinutes: 20,
  },
  {
    id: "mavi",
    slug: "yeni-ufuklar-2",
    name: "Yeni Ufuklar",
    legalName: "Yeni Ufuklar BK",
    city: "İstanbul",
    district: "Eryaman",
    phone: "0216 000 11 40",
    email: "merkez@yeniufuklar.test",
    motto: "Seans, nefes, devam.",
    monogram: "MN",
    logo: "/yeni-ufuklar.png",
    accent: "#c8102e",
    accentSoft: "#fdecee",
    splash: "#101a42",
    planId: "cok-sube",
    status: "active",
    trialEnds: d(-40),
    cancelHours: 8,
    noShowConsumesCredit: true,
    waitlistMinutes: 20,
  },
];

export const branches: Branch[] = [
  { id: "moda", clubId: "kadikoy", name: "Moda Tesisi", district: "Moda", address: "Caferağa Mah. Moda Cad. No: 14" },
  { id: "caferaga", clubId: "kadikoy", name: "Caferağa Salon", district: "Caferağa", address: "Moda Cad. No: 88" },
  { id: "bostanci", clubId: "kadikoy", name: "Bostancı Salon", district: "Bostancı", address: "Ethem Efendi Cad. No: 6" },
  { id: "caddebostan", clubId: "mavi", name: "Caddebostan", district: "Caddebostan", address: "Bağdat Cad. No: 212" },
  { id: "atasehir", clubId: "mavi", name: "Ataşehir Havuz", district: "Ataşehir", address: "Atatürk Mah. Spor Cad. No: 3" },
];

export const facilities: Facility[] = [
  { id: "moda-parke", clubId: "kadikoy", branchId: "moda", name: "Moda Parke", kind: "salon", capacity: 120 },
  { id: "caferaga-parke", clubId: "kadikoy", branchId: "caferaga", name: "Caferağa Parke", kind: "salon", capacity: 80 },
  { id: "bostanci-salon", clubId: "kadikoy", branchId: "bostanci", name: "Bostancı Salon", kind: "salon", capacity: 70 },
  { id: "reformer", clubId: "mavi", branchId: "caddebostan", name: "Reformer Stüdyo", kind: "studyo", capacity: 8 },
  { id: "cadde-salon", clubId: "mavi", branchId: "caddebostan", name: "Caddebostan Salon", kind: "salon", capacity: 60 },
  { id: "havuz", clubId: "mavi", branchId: "atasehir", name: "Olimpik Kulvar", kind: "havuz", capacity: 16 },
];

function yearSeasons(clubId: string): Season[] {
  return [2024, 2025, 2026, 2027].map((year) => ({
    id: `sz-${clubId}-${year}`,
    clubId,
    name: `${year}-${year + 1}`,
    start: `${year}-09-01`,
    end: `${year + 1}-06-20`,
    active: true,
  }));
}

export const seasons: Season[] = [...yearSeasons("kadikoy"), ...yearSeasons("mavi")];

export const sports: Sport[] = [
  { id: "kb", clubId: "kadikoy", name: "Basketbol", model: "team", seasonId: "sz-kadikoy-2026" },
  { id: "kv", clubId: "kadikoy", name: "Voleybol", model: "team", seasonId: "sz-kadikoy-2026" },
  { id: "mb", clubId: "mavi", name: "Basketbol", model: "team", seasonId: "sz-mavi-2026" },
  { id: "mp", clubId: "mavi", name: "Pilates", model: "session", seasonId: "sz-mavi-2026" },
  { id: "my", clubId: "mavi", name: "Yüzme", model: "session", seasonId: "sz-mavi-2026" },
];

export const staff: Staff[] = [
  { id: "st-kerem", clubId: "kadikoy", branchId: "moda", name: "Kerem Usta", duty: "Kulüp sahibi", phone: "0532 000 10 01" },
  { id: "st-ece", clubId: "kadikoy", branchId: "moda", name: "Ece Yıldız", duty: "Şube müdürü", phone: "0532 000 10 02" },
  { id: "st-aylin", clubId: "kadikoy", branchId: "moda", name: "Aylin Demir", duty: "Finans sorumlusu", phone: "0532 000 10 03" },
  { id: "st-hakan", clubId: "kadikoy", branchId: "moda", name: "Hakan Yılmaz", duty: "Depo sorumlusu", phone: "0532 000 10 04" },
  { id: "st-melis", clubId: "kadikoy", branchId: "moda", name: "Melis Arslan", duty: "Basketbol antrenörü", phone: "0532 000 10 05" },
  {
    id: "st-serkan",
    clubId: "kadikoy",
    branchId: "caferaga",
    name: "Serkan Bilgin",
    duty: "Basketbol antrenörü",
    phone: "0532 000 10 06",
    leave: { from: d(1), to: d(3), reason: "Raporlu" },
  },
  { id: "st-elif", clubId: "kadikoy", branchId: "bostanci", name: "Elif Sarı", duty: "Voleybol antrenörü", phone: "0532 000 10 07" },
  { id: "st-deniz", clubId: "mavi", branchId: "caddebostan", name: "Deniz Koç", duty: "Kulüp yöneticisi", phone: "0533 000 20 01" },
  { id: "st-burcu", clubId: "mavi", branchId: "atasehir", name: "Burcu Şen", duty: "Yüzme antrenörü", phone: "0533 000 20 02" },
  { id: "st-kemal", clubId: "mavi", branchId: "caddebostan", name: "Kemal Uysal", duty: "Basketbol antrenörü", phone: "0533 000 20 03" },
  { id: "st-asli-k", clubId: "kadikoy", branchId: "moda", name: "Aslı Çetin", duty: "Finans sorumlusu", phone: "0532 000 30 08" },
  { id: "st-asli-m", clubId: "mavi", branchId: "caddebostan", name: "Aslı Çetin", duty: "Finans sorumlusu", phone: "0532 000 30 08" },
];

export const teams: Team[] = [
  { id: "u12", clubId: "kadikoy", branchId: "moda", sportId: "kb", seasonId: "sz-kadikoy-2026", name: "U12 Basketbol", category: "U12", coachStaffId: "st-melis" },
  { id: "u14", clubId: "kadikoy", branchId: "caferaga", sportId: "kb", seasonId: "sz-kadikoy-2026", name: "U14 Basketbol", category: "U14", coachStaffId: "st-serkan" },
  { id: "vola", clubId: "kadikoy", branchId: "bostanci", sportId: "kv", seasonId: "sz-kadikoy-2026", name: "Voleybol A", category: "Genç", coachStaffId: "st-elif" },
  { id: "u16", clubId: "mavi", branchId: "caddebostan", sportId: "mb", seasonId: "sz-mavi-2026", name: "U16 Basketbol", category: "U16", coachStaffId: "st-kemal" },
];

export const people: Person[] = [
  { id: "defne", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Defne Aksoy", birthYear: 2014, kind: "athlete", status: "active", guardian: "Can Aksoy", phone: "0532 111 20 01", since: "2024-09-12" },
  { id: "ali", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Ali Rüzgar", birthYear: 2014, kind: "athlete", status: "active", guardian: "Sevgi Rüzgar", phone: "0532 111 20 02", since: "2025-01-08" },
  { id: "maya", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Maya Çetin", birthYear: 2013, kind: "athlete", status: "active", guardian: "Aslı Çetin", phone: "0532 111 20 03", since: "2023-10-02" },
  { id: "aras", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Aras Yalın", birthYear: 2014, kind: "athlete", status: "trial", guardian: "Okan Yalın", phone: "0532 111 20 04", since: "2026-10-01" },
  { id: "ekin", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Ekin Oral", birthYear: 2014, kind: "athlete", status: "active", guardian: "Derya Oral", phone: "0532 111 20 05", since: "2024-11-19" },
  { id: "bora", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Bora Keskin", birthYear: 2014, kind: "athlete", status: "active", guardian: "Mert Keskin", phone: "0532 111 20 06", since: "2025-02-14" },
  { id: "su", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Su Meltem", birthYear: 2014, kind: "athlete", status: "active", guardian: "Ebru Meltem", phone: "0532 111 20 07", since: "2024-09-30" },
  { id: "ruzgar", clubId: "kadikoy", branchId: "moda", sportId: "kb", teamId: "u12", name: "Rüzgar İnce", birthYear: 2014, kind: "athlete", status: "active", guardian: "Pelin İnce", phone: "0532 111 20 08", since: "2025-03-03" },
  { id: "ege", clubId: "kadikoy", branchId: "caferaga", sportId: "kb", teamId: "u14", name: "Ege Aksoy", birthYear: 2012, kind: "athlete", status: "active", guardian: "Can Aksoy", phone: "0532 111 20 11", since: "2022-09-15" },
  { id: "kerems", clubId: "kadikoy", branchId: "caferaga", sportId: "kb", teamId: "u14", name: "Kerem Soylu", birthYear: 2012, kind: "athlete", status: "active", guardian: "Hande Soylu", phone: "0532 111 20 12", since: "2023-09-01" },
  { id: "ada", clubId: "kadikoy", branchId: "caferaga", sportId: "kb", teamId: "u14", name: "Ada Er", birthYear: 2012, kind: "athlete", status: "active", guardian: "Cem Er", phone: "0532 111 20 13", since: "2024-01-20" },
  { id: "nehir", clubId: "kadikoy", branchId: "bostanci", sportId: "kv", teamId: "vola", name: "Nehir Acar", birthYear: 2011, kind: "athlete", status: "active", guardian: "Selin Acar", phone: "0532 111 20 21", since: "2023-10-10" },
  { id: "denizu", clubId: "kadikoy", branchId: "bostanci", sportId: "kv", teamId: "vola", name: "Deniz Uçar", birthYear: 2010, kind: "athlete", status: "active", guardian: "Gül Uçar", phone: "0532 111 20 22", since: "2022-11-05" },
  { id: "lara", clubId: "kadikoy", branchId: "bostanci", sportId: "kv", teamId: "vola", name: "Lara Şen", birthYear: 2011, kind: "athlete", status: "active", guardian: "Burcu Şen", phone: "0533 000 20 02", since: "2024-09-18" },
  { id: "emre", clubId: "mavi", branchId: "caddebostan", sportId: "mb", teamId: "u16", name: "Emre Tan", birthYear: 2010, kind: "athlete", status: "active", guardian: "Nazlı Tan", phone: "0533 111 30 01", since: "2023-09-04" },
  { id: "yavuz", clubId: "mavi", branchId: "caddebostan", sportId: "mb", teamId: "u16", name: "Yavuz Elçi", birthYear: 2010, kind: "athlete", status: "active", guardian: "Seda Elçi", phone: "0533 111 30 02", since: "2024-02-11" },
  { id: "yusuf", clubId: "mavi", branchId: "atasehir", sportId: "my", name: "Yusuf Ege", birthYear: 2011, kind: "athlete", status: "active", guardian: "Banu Ege", phone: "0533 111 30 11", since: "2025-06-01" },
  { id: "neva", clubId: "mavi", branchId: "atasehir", sportId: "my", name: "Neva Bilgin", birthYear: 2012, kind: "athlete", status: "active", guardian: "Serkan Bilgin", phone: "0533 111 30 12", since: "2025-09-15" },
  { id: "pinar", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Pınar Efe", birthYear: 1996, kind: "member", status: "active", phone: "0533 222 40 01", since: "2026-01-07" },
  { id: "mina", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Mina Kor", birthYear: 1994, kind: "member", status: "active", phone: "0533 222 40 02", since: "2025-11-02" },
  { id: "eda", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Eda Sönmez", birthYear: 1991, kind: "member", status: "active", phone: "0533 222 40 03", since: "2026-02-16" },
  { id: "jale", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Jale Kurt", birthYear: 1988, kind: "member", status: "active", phone: "0533 222 40 04", since: "2025-10-20" },
  { id: "sevgi", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Sevgi Arı", birthYear: 1993, kind: "member", status: "active", phone: "0533 222 40 05", since: "2026-03-01" },
  { id: "nilufer", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Nilüfer Han", birthYear: 1987, kind: "member", status: "active", phone: "0533 222 40 06", since: "2025-12-09" },
  { id: "asya", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Asya Demir", birthYear: 1998, kind: "member", status: "active", phone: "0533 222 40 07", since: "2026-04-14" },
  { id: "beril", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Beril Koç", birthYear: 1992, kind: "member", status: "active", phone: "0533 222 40 08", since: "2026-05-22" },
  { id: "cemre", clubId: "mavi", branchId: "caddebostan", sportId: "mp", name: "Cemre Bal", birthYear: 1998, kind: "member", status: "active", phone: "0533 222 40 09", since: "2026-08-30" },
];

export const trainings: Training[] = [
  { id: "tr-u12-y", clubId: "kadikoy", branchId: "moda", facilityId: "moda-parke", sportId: "kb", teamId: "u12", coachStaffId: "st-melis", title: "U12 antrenman", date: d(-1), start: "16:00", end: "17:30", kind: "training" },
  { id: "tr-u12-t", clubId: "kadikoy", branchId: "moda", facilityId: "moda-parke", sportId: "kb", teamId: "u12", coachStaffId: "st-melis", title: "U12 antrenman", date: d(0), start: "16:00", end: "17:30", kind: "training" },
  { id: "tr-telafi", clubId: "kadikoy", branchId: "moda", facilityId: "moda-parke", sportId: "kb", teamId: "u14", coachStaffId: "st-serkan", title: "U14 telafi", date: d(0), start: "17:00", end: "18:30", kind: "training" },
  { id: "tr-u14-n", clubId: "kadikoy", branchId: "caferaga", facilityId: "caferaga-parke", sportId: "kb", teamId: "u14", coachStaffId: "st-serkan", title: "U14 antrenman", date: d(1), start: "18:00", end: "19:30", kind: "training" },
  { id: "tr-vol", clubId: "kadikoy", branchId: "bostanci", facilityId: "bostanci-salon", sportId: "kv", teamId: "vola", coachStaffId: "st-elif", title: "Voleybol A", date: d(2), start: "17:00", end: "18:30", kind: "training" },
  { id: "cl-ref-t", clubId: "mavi", branchId: "caddebostan", facilityId: "reformer", sportId: "mp", coachStaffId: "st-deniz", title: "Reformer sabah", date: d(0), start: "09:00", end: "10:00", kind: "class", capacity: 8 },
  { id: "cl-ref-n", clubId: "mavi", branchId: "caddebostan", facilityId: "reformer", sportId: "mp", coachStaffId: "st-deniz", title: "Reformer akşam", date: d(1), start: "18:30", end: "19:30", kind: "class", capacity: 8 },
  { id: "cl-swim", clubId: "mavi", branchId: "atasehir", facilityId: "havuz", sportId: "my", coachStaffId: "st-burcu", title: "Kulvar çalışması", date: d(0), start: "07:00", end: "08:00", kind: "class", capacity: 16 },
  { id: "cl-u16", clubId: "mavi", branchId: "caddebostan", facilityId: "cadde-salon", sportId: "mb", teamId: "u16", coachStaffId: "st-kemal", title: "U16 antrenman", date: d(2), start: "19:00", end: "20:30", kind: "training" },
];

const u12 = ["defne", "ali", "maya", "aras", "ekin", "bora", "su", "ruzgar"];

export const attendance: Attendance[] = u12.map((personId) => ({
  sessionId: "tr-u12-y",
  personId,
  status: personId === "ali" ? "absent" : personId === "aras" ? "excused" : "present",
}));

const reformerToday = ["pinar", "mina", "eda", "jale", "sevgi", "nilufer", "asya", "beril"];

export const bookings: Booking[] = [
  ...reformerToday.map((personId) => ({ sessionId: "cl-ref-t", personId, status: "booked" as const })),
  { sessionId: "cl-ref-t", personId: "cemre", status: "waitlist" },
  ...["pinar", "mina", "eda", "jale", "sevgi"].map((personId) => ({
    sessionId: "cl-ref-n",
    personId,
    status: "booked" as const,
  })),
  { sessionId: "cl-swim", personId: "yusuf", status: "booked" },
  { sessionId: "cl-swim", personId: "neva", status: "booked" },
];

export const invoices: Invoice[] = [
  { id: "inv-defne", clubId: "kadikoy", personId: "defne", title: "Ekim basketbol aidatı", amount: 2500, paid: 2500, due: d(-4), status: "paid" },
  { id: "inv-ali", clubId: "kadikoy", personId: "ali", title: "Ekim basketbol aidatı", amount: 2500, paid: 0, due: d(-6), status: "overdue" },
  { id: "inv-ege", clubId: "kadikoy", personId: "ege", title: "Ekim basketbol aidatı", amount: 2500, paid: 1250, due: d(4), status: "partial" },
  { id: "inv-deniz", clubId: "kadikoy", personId: "denizu", title: "Ekim voleybol aidatı", amount: 2200, paid: 0, due: d(-2), status: "overdue" },
  { id: "inv-nehir", clubId: "kadikoy", personId: "nehir", title: "Ekim voleybol aidatı", amount: 2200, paid: 2200, due: d(-4), status: "paid" },
  { id: "inv-emre", clubId: "mavi", personId: "emre", title: "Ekim basketbol aidatı", amount: 2500, paid: 0, due: d(6), status: "open" },
  { id: "inv-yusuf", clubId: "mavi", personId: "yusuf", title: "Ekim yüzme aidatı", amount: 3000, paid: 0, due: d(-3), status: "overdue" },
  { id: "inv-pinar", clubId: "mavi", personId: "pinar", title: "8 seans reformer paketi", amount: 6400, paid: 6400, due: d(-20), status: "paid" },
];

export const credits: Credit[] = [
  { personId: "pinar", title: "Reformer 8'li", remaining: 6, total: 8 },
  { personId: "cemre", title: "Reformer 8'li", remaining: 8, total: 8 },
  { personId: "mina", title: "Reformer 8'li", remaining: 3, total: 8 },
];

export const warehouses: Warehouse[] = [
  { id: "depo-moda", clubId: "kadikoy", branchId: "moda", name: "Moda Deposu" },
  { id: "depo-cadde", clubId: "mavi", branchId: "caddebostan", name: "Caddebostan Deposu" },
];

export const stock: StockItem[] = [
  { id: "forma-s", clubId: "kadikoy", warehouseId: "depo-moda", name: "Forma siyah", variant: "S", qty: 4, min: 10 },
  { id: "forma-m", clubId: "kadikoy", warehouseId: "depo-moda", name: "Forma siyah", variant: "M", qty: 22, min: 10 },
  { id: "forma-l", clubId: "kadikoy", warehouseId: "depo-moda", name: "Forma siyah", variant: "L", qty: 6, min: 10 },
  { id: "top-v", clubId: "kadikoy", warehouseId: "depo-moda", name: "Voleybol topu", variant: "Maç", qty: 9, min: 6 },
  { id: "havlu", clubId: "mavi", warehouseId: "depo-cadde", name: "Reformer havlusu", variant: "Standart", qty: 20, min: 12 },
  { id: "corap", clubId: "mavi", warehouseId: "depo-cadde", name: "Tutuş çorabı", variant: "36-40", qty: 3, min: 8 },
];

export const custodies: Custody[] = [
  {
    id: "zim-1",
    clubId: "kadikoy",
    date: d(-1),
    title: "U12 forma teslimi",
    actor: "Hakan Yılmaz",
    status: "completed",
    lines: u12.map((personId) => ({ personId, itemId: "forma-m", qty: 1 })),
  },
];

export const notices: Notice[] = [
  {
    id: "n-u12",
    clubId: "kadikoy",
    title: "U12 antrenmanı bugün",
    body: "Moda Parke, 16:00. Forma yanında olsun.",
    audience: "U12 velileri",
    at: d(0),
    delivered: 7,
    failed: 1,
    state: "retrying",
    failureNote: "Bora Keskin için push teslim edilmedi. Antrenman kaydı duruyor, gönderim yeniden denenecek.",
  },
  {
    id: "n-aidat",
    clubId: "kadikoy",
    title: "Ekim aidatı gecikti",
    body: "Ali Rüzgar için 2.500 TL tahsilat açık.",
    audience: "Sevgi Rüzgar",
    at: d(-1),
    delivered: 1,
    failed: 0,
    state: "sent",
  },
  {
    id: "n-wait",
    clubId: "mavi",
    title: "Reformer bekleme listesi",
    body: "Cemre Bal sırada. Bir iptal olursa 20 dakika geçerli rezervasyon hakkı açılır.",
    audience: "Cemre Bal",
    at: d(0),
    delivered: 1,
    failed: 0,
    state: "sent",
  },
];

export const audit: AuditEntry[] = [
  {
    id: "au-1",
    clubId: "kadikoy",
    at: d(-1),
    actor: "Hakan Yılmaz",
    action: "Zimmet tamamlandı",
    entity: "U12 forma teslimi",
    summary: "8 adet M beden forma aynı işlemde stoktan düşüldü ve sporculara zimmetlendi.",
    before: "Forma M: 30",
    after: "Forma M: 22",
  },
  {
    id: "au-2",
    clubId: "kadikoy",
    at: d(-4),
    actor: "Aylin Demir",
    action: "Tahsilat",
    entity: "Defne Aksoy",
    summary: "Ekim basketbol aidatı kapatıldı.",
    before: "Borç 2.500 TL",
    after: "Borç 0 TL",
  },
  {
    id: "au-3",
    clubId: "kadikoy",
    at: d(0),
    actor: "Kerem Usta",
    action: "İzin kaydı",
    entity: "Serkan Bilgin",
    summary: "Yarın başlayan antrenman, antrenör izni nedeniyle ayrıca işaretlenir. Geçmiş seanslar değiştirilmedi.",
    before: "İzin yok",
    after: `${d(1)} – ${d(3)} raporlu`,
  },
  {
    id: "au-4",
    clubId: "mavi",
    at: d(0),
    actor: "Deniz Koç",
    action: "Bekleme listesi",
    entity: "Reformer sabah",
    summary: "Kapasite 8 dolu. Dokuzuncu üye bekleme listesine alındı.",
    before: "8/8",
    after: "8/8 + 1 bekleme",
  },
];

export const users: UserAccount[] = [
  { id: "admin", name: "AllPlay360 Admin", email: "admin", memberships: [{ role: "platform_super" }] },
  { id: "kerem", name: "Kerem Usta", email: "kerem@kadikoyatletik.test", memberships: [{ role: "club_owner", clubId: "kadikoy" }] },
  { id: "deniz", name: "Deniz Koç", email: "deniz@mavispor.test", memberships: [{ role: "club_manager", clubId: "mavi" }] },
  { id: "ece", name: "Ece Yıldız", email: "ece@kadikoyatletik.test", memberships: [{ role: "branch_manager", clubId: "kadikoy", branchIds: ["moda"] }] },
  { id: "aylin", name: "Aylin Demir", email: "aylin@kadikoyatletik.test", memberships: [{ role: "finance", clubId: "kadikoy" }] },
  { id: "hakan", name: "Hakan Yılmaz", email: "hakan@kadikoyatletik.test", memberships: [{ role: "warehouse", clubId: "kadikoy" }] },
  {
    id: "asli",
    name: "Aslı Çetin",
    email: "asli@skys.test",
    memberships: [
      { role: "finance", clubId: "kadikoy" },
      { role: "finance", clubId: "mavi" },
    ],
  },
  { id: "melis", name: "Melis Arslan", email: "melis@kadikoyatletik.test", memberships: [{ role: "coach", clubId: "kadikoy", teamIds: ["u12"] }] },
  { id: "can", name: "Can Aksoy", email: "can@veli.test", memberships: [{ role: "parent", clubId: "kadikoy", personId: "defne" }] },
  { id: "ege-user", name: "Ege Aksoy", email: "ege@sporcu.test", memberships: [{ role: "athlete", clubId: "kadikoy", personId: "ege" }] },
  { id: "pinar-user", name: "Pınar Efe", email: "pinar@uye.test", memberships: [{ role: "member", clubId: "mavi", personId: "pinar" }] },
  {
    id: "burcu",
    name: "Burcu Şen",
    email: "burcu@mavispor.test",
    memberships: [
      { role: "coach", clubId: "mavi", sportIds: ["my"] },
      { role: "parent", clubId: "kadikoy", personId: "lara" },
    ],
  },
];

export function findUser(id: string | undefined) {
  return users.find((user) => user.id === id);
}

export function findUserByEmail(email: string) {
  return users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
}

function assertCatalog() {
  const clubIds = new Set(clubs.map((club) => club.id));
  for (const person of people) {
    if (!clubIds.has(person.clubId)) throw new Error(`Kulüp yok: ${person.id}`);
    const branch = branches.find((item) => item.id === person.branchId);
    if (!branch || branch.clubId !== person.clubId) throw new Error(`Şube uyumsuz: ${person.id}`);
  }
  for (const booking of bookings) {
    const session = trainings.find((item) => item.id === booking.sessionId);
    const person = people.find((item) => item.id === booking.personId);
    if (!session || !person || session.clubId !== person.clubId) {
      throw new Error(`Rezervasyon kulüpler arası: ${booking.personId}`);
    }
  }
  for (const line of custodies.flatMap((item) => item.lines)) {
    const person = people.find((item) => item.id === line.personId);
    const item = stock.find((stockItem) => stockItem.id === line.itemId);
    if (!person || !item || person.clubId !== item.clubId) throw new Error(`Zimmet kulüpler arası: ${line.personId}`);
  }
}

assertCatalog();
