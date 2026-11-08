import { headers } from "next/headers";
import type { Metadata } from "next";
import { clubBySlug } from "@/lib/live";
import { clubSlugFromHost, hostPortSuffix, isBareLocalHost } from "@/lib/tenant";
import { readState } from "@/lib/store";

async function hostInfo() {
  const host = (await headers()).get("host");
  const bare = isBareLocalHost(host);
  const slug = clubSlugFromHost(host);
  const club = bare ? undefined : clubBySlug(slug);
  return { bare, club };
}

export async function generateMetadata(): Promise<Metadata> {
  const { bare, club } = await hostInfo();
  if (bare) {
    return { title: "AllPlay360", description: "Sistem yönetimi" };
  }
  return {
    title: club?.name || "Kulüp",
    description: club ? `${club.name} yönetim paneli` : "Kulüp yönetim paneli",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const query = await searchParams;
  const { bare, club } = await hostInfo();

  if (bare) {
    return (
      <div className="admin-auth">
        <div className="admin-auth-glow" aria-hidden />
        <div className="admin-auth-card">
          <img src="/allplay360.png" alt="AllPlay360" className="admin-auth-logo" />
          <p className="admin-auth-kicker">Sistem yönetimi</p>
          <h1>AllPlay360</h1>
          <p className="admin-auth-copy">Sporun her yönü. Kulüpleri buradan açarsın.</p>
          {query.hata ? (
            <p className="mb-4 rounded-lg bg-[#123043] px-3 py-2 text-sm text-[#7ee7ff]">
              Kullanıcı adı veya şifre hatalı.
            </p>
          ) : null}
          <form action="/api/oturum" method="post" className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-[#9eb6c8]">
              Kullanıcı adı
              <input name="email" type="text" required className="admin-auth-field" placeholder="admin" autoComplete="username" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[#9eb6c8]">
              Şifre
              <input name="password" type="password" required className="admin-auth-field" placeholder="••••••" autoComplete="current-password" />
            </label>
            <button className="admin-auth-btn">Giriş yap</button>
          </form>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="auth-shell">
        <section className="auth-hero">
          <div>
            <h1>Kulüp yok</h1>
            <p className="max-w-sm text-base leading-7 text-[#e8eef6]">Bu adres için açık kulüp bulunamadı.</p>
          </div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <h2>Panele giriş</h2>
            <p className="text-sm text-[#6b7a90]">Kullanıcı adını kontrol et. Örnek: sincanbasket.localhost{hostPortSuffix((await headers()).get("host"))}</p>
          </div>
        </section>
      </div>
    );
  }

  const brand = readState().brands[club.id];
  const accent = brand?.accent ?? club.accent;
  const splash = club.splash;
  const motto = brand?.motto || club.motto || "";
  const product = club.slug === "yeni-ufuklar" ? "BK · 2015" : `${club.city}${club.district ? ` · ${club.district}` : ""}`;
  const blurb = club.slug === "yeni-ufuklar"
    ? "Lokasyon, branş, kadro ve aidat. Açık zemin, lacivert ve kırmızı vurgu."
    : motto || "Kulüp paneli. Sporcu, takvim, yoklama ve aidat burada.";

  return (
    <div className="auth-shell">
      <section
        className="auth-hero"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 18% 0%, color-mix(in srgb, ${accent} 42%, transparent), transparent 58%), linear-gradient(165deg, ${splash} 0%, color-mix(in srgb, ${splash} 70%, ${accent}) 52%, color-mix(in srgb, ${splash} 88%, #000) 100%)`,
        }}
      >
        <div>
          {club.logo ? (
            <img src={club.logo} alt={club.name} className="mb-5 h-24 w-24 rounded-full bg-white object-cover shadow-lg" />
          ) : (
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full text-2xl font-extrabold text-white shadow-lg" style={{ background: accent }}>
              {club.monogram || "SK"}
            </div>
          )}
          <h1>{club.name}</h1>
          <span className="auth-product" style={{ color: accent === "#c8102e" ? "#ffc9ce" : "#ffffffcc" }}>{product}</span>
          <p className="max-w-sm text-base leading-7 text-[#e8eef6]">{blurb}</p>
        </div>
      </section>

      <section className="auth-panel" style={{ boxShadow: `inset 4px 0 0 ${accent}` }}>
        <div className="auth-card">
          <div className="auth-kicker" style={{ color: accent }}>{club.name}</div>
          <h2>Panele giriş</h2>
          {query.hata ? (
            <p className="mb-4 rounded-lg bg-[#fee2e2] px-3 py-2 text-sm text-[#991b1b]">E-posta veya şifre hatalı. Bu kulübe ait hesap gerekir.</p>
          ) : null}
          <form action="/api/oturum" method="post" className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-[#3b4a5e]">
              E-posta veya kullanıcı adı
              <input name="email" type="text" required className="field" placeholder={club.email || "ornek@kulup.com"} autoComplete="username" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[#3b4a5e]">
              Şifre
              <input name="password" type="password" required className="field" autoComplete="current-password" />
            </label>
            <button className="btn-brand mt-1 h-11" style={{ background: accent }}>Giriş yap</button>
          </form>
        </div>
      </section>
    </div>
  );
}
