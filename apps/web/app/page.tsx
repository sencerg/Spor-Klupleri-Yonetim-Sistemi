import { redirect } from "next/navigation";
import { getSession, landingPath } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  redirect(session ? landingPath(session.user) : "/login");
}
