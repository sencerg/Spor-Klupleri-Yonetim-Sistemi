import { statusLabel } from "@/components/bits";

export const athleteColumns = [
  "Ad soyad",
  "Doğum yılı",
  "Tür",
  "Durum",
  "Branş",
  "Grup",
  "Kayıt tarihi",
  "Süre",
  "Referans",
  "Anne",
  "Anne telefon",
  "Baba",
  "Baba telefon",
  "Acil yakın",
  "Acil telefon",
  "Yakınlık",
  "Ana veli",
  "Fiyat",
  "Liste ücreti",
  "İndirim",
  "Yüzde",
  "Alınan ücret",
] as const;

type GuardianRow = { id: string; name: string; phone: string; relation?: string };

export function registrationDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function yearsSince(iso: string, today: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  if (!year || !todayYear) return "";
  let years = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) years -= 1;
  if (years < 1) return "1 yıldan az";
  return `${years} yıl`;
}

export function athleteSheet(
  person: {
    name: string;
    birthYear: number;
    enrollment?: "school" | "squad";
    status: string;
    since: string;
    reference?: string;
    guardian?: string;
    guardianId?: string;
    motherId?: string;
    fatherId?: string;
    emergencyId?: string;
    phone?: string;
    priceName?: string;
    listAmount?: number;
    discountKind?: "none" | "percent" | "custom";
    discountPercent?: number;
    chargedAmount?: number;
  },
  guardians: GuardianRow[],
  sport: string,
  team: string,
  today: string,
) {
  const found = (id?: string) => (id ? guardians.find((item) => item.id === id) : undefined);
  const mother = found(person.motherId);
  const father = found(person.fatherId);
  const emergency = found(person.emergencyId);
  const legacy = !person.motherId && !person.fatherId;
  const primaryFather = Boolean(person.fatherId && person.guardianId === person.fatherId);
  const priced = person.listAmount != null && person.priceName;
  let discount = "";
  let percent: number | "" = "";
  if (priced && person.discountKind === "percent" && person.discountPercent === 100) {
    discount = "Ücretsiz (%100 burslu)";
    percent = 100;
  } else if (priced && person.discountKind === "percent" && person.discountPercent) {
    discount = `%${person.discountPercent}`;
    percent = person.discountPercent;
  } else if (priced && person.discountKind === "custom") {
    discount = "Özel fiyat";
  } else if (priced) {
    discount = "İndirim yok";
  }
  const cells = {
    "Ad soyad": person.name,
    "Doğum yılı": person.birthYear,
    Tür: person.enrollment === "school" ? "Spor okulu" : "Takım oyuncusu",
    Durum: statusLabel[person.status] ?? person.status,
    Branş: sport,
    Grup: team,
    "Kayıt tarihi": registrationDate(person.since),
    Süre: yearsSince(person.since, today),
    Referans: person.reference ?? "",
    Anne: mother?.name || (legacy ? person.guardian ?? "" : ""),
    "Anne telefon": mother?.phone || (legacy ? person.phone ?? "" : ""),
    Baba: father?.name ?? "",
    "Baba telefon": father?.phone ?? "",
    "Acil yakın": emergency?.name ?? "",
    "Acil telefon": emergency?.phone ?? "",
    Yakınlık: emergency?.relation ?? "",
    "Ana veli": primaryFather ? "Baba" : "Anne",
    Fiyat: person.priceName ?? "",
    "Liste ücreti": priced ? person.listAmount ?? "" : "",
    İndirim: discount,
    Yüzde: percent,
    "Alınan ücret": priced ? person.chargedAmount ?? person.listAmount ?? "" : "",
  };
  return athleteColumns.map((column) => cells[column]);
}
