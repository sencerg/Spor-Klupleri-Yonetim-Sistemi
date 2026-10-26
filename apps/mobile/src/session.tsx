import {
  channelClubs,
  clubById,
  DEMO_PASSWORD,
  findUser,
  findUserByEmail,
  type Club,
  type UserAccount,
} from "@skys/domain";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type Value = {
  ready: boolean;
  user: UserAccount | null;
  club: Club | null;
  clubs: Club[];
  signIn: (email: string, password: string) => string | null;
  pickClub: (clubId: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<Value | null>(null);
const storageKey = "skys-mobile";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { userId?: string; clubId?: string };
          setUserId(parsed.userId ?? null);
          setClubId(parsed.clubId ?? null);
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || Platform.OS !== "web") return;
    if (!userId) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify({ userId, clubId }));
  }, [ready, userId, clubId]);

  const value = useMemo<Value>(() => {
    const user = findUser(userId ?? undefined) ?? null;
    const clubs = user
      ? channelClubs(user, "mobile")
          .map((membership) => clubById(membership.clubId ?? ""))
          .filter((club): club is Club => Boolean(club))
      : [];
    return {
      ready,
      user,
      club: clubs.find((club) => club.id === clubId) ?? null,
      clubs,
      signIn(email, password) {
        if (password !== DEMO_PASSWORD) return "Şifre hatalı.";
        const account = findUserByEmail(email);
        const next = account ? channelClubs(account, "mobile") : [];
        if (!account || next.length === 0) return "Bu hesap kulüp panelinde açılır.";
        setUserId(account.id);
        setClubId(next.length === 1 ? next[0].clubId ?? null : null);
        return null;
      },
      pickClub(nextClubId) {
        setClubId(nextClubId);
      },
      signOut() {
        setUserId(null);
        setClubId(null);
      },
    };
  }, [ready, userId, clubId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Oturum yok");
  return value;
}
