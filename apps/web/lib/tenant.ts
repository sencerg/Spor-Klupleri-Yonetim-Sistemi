export const PRODUCT_CLUB_SLUG = "yeni-ufuklar";

/** Kısa giriş adı → kulüp slug */
export const CLUB_HOST_ALIASES: Record<string, string> = {
  yeniufuklar: "yeni-ufuklar",
  "yeni-ufuklar": "yeni-ufuklar",
  "sincan-basketbol-akademi": "sincanbasket",
};

export const CLUB_SCREEN_PATHS = [
  "ayarlar",
  "subeler",
  "branslar",
  "sporcular",
  "takimlar",
  "takvim",
  "yoklama",
  "yoklama-raporu",
  "ozel-ders",
  "stok",
  "zimmet",
  "fiyatlar",
  "aidat",
  "personel",
  "unvanlar",
  "bildirimler",
  "raporlar",
  "gecmis",
  "yetkiler",
  "versionlar",
];

export function resolveClubSlug(raw: string) {
  const key = raw.trim().toLowerCase();
  return CLUB_HOST_ALIASES[key] ?? key;
}

export function clubPublicHost(slug: string) {
  if (slug === PRODUCT_CLUB_SLUG) return "yeniufuklar";
  return slug;
}

export function hostPortSuffix(host: string | null) {
  const raw = (host ?? "").trim();
  const port = raw.includes(":") ? raw.slice(raw.lastIndexOf(":") + 1) : "";
  if (!port || port === "80" || port === "443") return "";
  return `:${port}`;
}

export function clubLoginUrl(slug: string, host: string | null) {
  return `http://${clubPublicHost(slug)}.localhost${hostPortSuffix(host)}/login`;
}

/** Düz localhost: kulüp cookie ile seçilebilir. Subdomain hostta her zaman o kulüp. */
export function isBareLocalHost(host: string | null) {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  return !hostname || hostname === "localhost" || hostname === "127.0.0.1";
}

export function clubSlugFromHost(host: string | null) {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (isBareLocalHost(host)) return PRODUCT_CLUB_SLUG;
  const labels = hostname.split(".").filter(Boolean);
  // slug.localhost → that club's login and panel
  if (labels.length >= 2 && labels[labels.length - 1] === "localhost") {
    const sub = labels[0];
    if (sub && sub !== "www" && sub !== "admin") return resolveClubSlug(sub);
    return PRODUCT_CLUB_SLUG;
  }
  const sub = labels[0] === "www" ? labels[1] : labels[0];
  if (!sub || sub === "localhost" || sub === "admin") return PRODUCT_CLUB_SLUG;
  return resolveClubSlug(sub);
}

/** Subdomain hostta cookie başka kulübe çekmez. */
export function effectiveClubSlug(host: string | null, pinned: string | undefined) {
  const hostSlug = clubSlugFromHost(host);
  if (!isBareLocalHost(host)) return hostSlug;
  const pin = pinned?.trim().toLowerCase();
  return pin ? resolveClubSlug(pin) : hostSlug;
}
