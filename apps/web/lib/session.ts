import { cookies } from "next/headers";
import {
  channelClubs,
  clubById,
  findUser,
  isSuper,
  type UserAccount,
  type Viewer,
} from "@skys/domain";
import { readState } from "./store";

export interface Session {
  user: UserAccount;
  supportClubId?: string;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const user = findUser(jar.get("skys_user")?.value);
  if (!user) return null;
  return { user, supportClubId: jar.get("skys_support")?.value };
}

export function viewerFor(session: Session, clubId?: string): Viewer {
  const grants = clubId ? readState().grants[clubId] : undefined;
  return { user: session.user, supportClubId: session.supportClubId, grants };
}

export function landingPath(user: UserAccount) {
  if (isSuper(user)) return "/platform";
  const memberships = channelClubs(user, "web");
  if (memberships.length === 0) return "/uygulama";
  if (memberships.length > 1) return "/kulup-sec";
  const club = clubById(memberships[0].clubId ?? "");
  return club ? `/c/${club.slug}` : "/uygulama";
}
