import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { channelClubs, clubBySlug, DEMO_PASSWORD, findUserByEmail } from "@skys/domain";
import { clubSlugFromHost } from "@/lib/tenant";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const user = findUserByEmail(email);
  const club = clubBySlug(clubSlugFromHost(request.headers.get("host")));
  const allowed = Boolean(user && club && channelClubs(user, "web").some((membership) => membership.clubId === club.id));
  if (!user || password !== DEMO_PASSWORD || !allowed) redirect("/login?hata=1");
  const jar = await cookies();
  jar.set("skys_user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}
