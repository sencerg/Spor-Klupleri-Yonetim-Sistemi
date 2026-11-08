import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST() {
  const jar = await cookies();
  jar.delete("skys_user");
  jar.delete("skys_support");
  jar.delete("skys_club");
  redirect("/login");
}
