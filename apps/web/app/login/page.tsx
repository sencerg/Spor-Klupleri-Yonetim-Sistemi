import { headers } from "next/headers";
import { channelClubs, clubBySlug, DEMO_PASSWORD, membershipFor, roleLabels, users } from "@skys/domain";
import { clubSlugFromHost } from "@/lib/tenant";

const featuredEmails = ["kerem@kadikoyatletik.test", "ece@kadikoyatletik.test", "aylin@kadikoyatletik.test"];

function mark(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toLocaleUpperCase("tr");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const query = await searchParams;
  const slug = clubSlugFromHost((await headers()).get("host"));
  const club = clubBySlug(slug);
  const staff = users.filter((user) => club && channelClubs(user, "web").some((membership) => membership.clubId === club.id));
  const featured = featuredEmails
    .map((email) => staff.find((user) => user.email === email))
    .filter((user) => user !== undefined);
  const rest = staff.filter((user) => !featuredEmails.includes(user.email));

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div>
          <img src="/yeni-ufuklar.png" alt="Yeni Ufuklar" className="mb-5 h-24 w-24 rounded-full bg-white object-cover shadow-lg" />
          <h1>Yeni Ufuklar</h1>
          <span className="auth-product">BK · 2015</span>
          <p className="max-w-sm text-base leading-7 text-[#e8eef6]">
            Lokasyon, branş, kadro ve aidat. Açık zemin, lacivert ve kırmızı vurgu.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-kicker">Yeni Ufuklar</div>
          <h2>Panele giriş</h2>
          {query.hata ? (
            <p className="mb-4 rounded-lg bg-[#fee2e2] px-3 py-2 text-sm text-[#991b1b]">E-posta veya şifre hatalı.</p>
          ) : null}
          <form action="/api/oturum" method="post" className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-[#3b4a5e]">
              E-posta
              <input name="email" type="email" required className="field" placeholder="ornek@yeniufuklar.com" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[#3b4a5e]">
              Şifre
              <input name="password" type="password" required defaultValue={DEMO_PASSWORD} className="field" />
            </label>
            <button className="btn-brand mt-1 h-11">Giriş yap</button>
          </form>

          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#8595ad]">Deneme hesapları</div>
          <div className="mt-2 grid gap-2">
            {featured.map((user) => {
              const membership = club ? membershipFor(user, club.id) : undefined;
              return (
                <form key={user.email} action="/api/oturum" method="post">
                  <input type="hidden" name="password" value={DEMO_PASSWORD} />
                  <button name="email" value={user.email} className="demo-row">
                    <span className="demo-dot" style={{ background: "#c8102e" }}>{mark(user.name)}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{user.name}</span>
                      <span className="block text-xs text-[#6b7a90]">
                        {membership ? roleLabels[membership.role] : ""} · {club?.name}
                      </span>
                    </span>
                  </button>
                </form>
              );
            })}
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#54657e]">Diğer hesaplar</summary>
            <div className="mt-2 grid gap-2">
              {rest.map((user) => {
                const membership = club ? membershipFor(user, club.id) : undefined;
                if (!membership) return null;
                return (
                  <form key={user.id} action="/api/oturum" method="post">
                    <input type="hidden" name="password" value={DEMO_PASSWORD} />
                    <button name="email" value={user.email} className="demo-row">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{user.name}</span>
                        <span className="block text-xs text-[#6b7a90]">
                          {roleLabels[membership.role]} · {club?.name}
                        </span>
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
          </details>
          <p className="mt-4 text-xs text-[#8595ad]">Deneme şifresi {DEMO_PASSWORD}</p>
        </div>
      </section>
    </div>
  );
}
