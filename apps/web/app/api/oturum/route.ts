import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { channelClubs, DEMO_PASSWORD, PLATFORM_ADMIN_PASSWORD, PLATFORM_ADMIN_USER, isSuper } from "@skys/domain";
import { findAccountByEmail, findClubLogin } from "@/lib/accounts";
import { clubBySlug } from "@/lib/live";
import { clubSlugFromHost, isBareLocalHost } from "@/lib/tenant";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const hostHeader = request.headers.get("host");
  const bare = isBareLocalHost(hostHeader);
  const jar = await cookies();

  if (bare) {
    const user = findAccountByEmail(PLATFORM_ADMIN_USER);
    const ok =
      email.toLocaleLowerCase("tr-TR") === PLATFORM_ADMIN_USER
      && password === PLATFORM_ADMIN_PASSWORD
      && user
      && isSuper(user);
    if (!ok) redirect("/login?hata=1");
    jar.set("skys_user", user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    jar.delete("skys_support");
    jar.delete("skys_club");
    redirect("/platform");
  }

  const host = clubBySlug(clubSlugFromHost(hostHeader));
  if (!host) redirect("/login?hata=1");
  const user = findClubLogin(email, host);
  if (!user || password !== DEMO_PASSWORD) redirect("/login?hata=1");
  if (isSuper(user)) redirect("/login?hata=1");
  const membership = channelClubs(user, "web").find((item) => item.clubId === host.id);
  if (!membership) redirect("/login?hata=1");
  jar.set("skys_user", user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  jar.delete("skys_support");
  jar.delete("skys_club");
  redirect("/");
}
