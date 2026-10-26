export const PRODUCT_CLUB_SLUG = "yeni-ufuklar";

export const CLUB_SCREEN_PATHS = [
  "ayarlar",
  "subeler",
  "branslar",
  "sporcular",
  "takimlar",
  "takvim",
  "yoklama",
  "seanslar",
  "stok",
  "zimmet",
  "fiyatlar",
  "aidat",
  "personel",
  "bildirimler",
  "raporlar",
  "gecmis",
  "yetkiler",
  "versionlar",
];

export function clubSlugFromHost(host: string | null) {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return PRODUCT_CLUB_SLUG;
  const labels = hostname.split(".").filter(Boolean);
  const sub = labels[0] === "www" ? labels[1] : labels[0];
  if (!sub || sub === "localhost" || sub === "admin") return PRODUCT_CLUB_SLUG;
  return sub;
}
