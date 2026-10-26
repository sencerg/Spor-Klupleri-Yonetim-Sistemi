import { useSession } from "@/session";
import { usePathname, useRouter, Redirect } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ink = "#1c1915";
export const muted = "#6d665c";
export const paper = "#f4f1ea";
export const card = "#fffcf8";
export const line = "#e6dfd4";
export const font = Platform.OS === "web" ? "Outfit, ui-sans-serif, system-ui" : undefined;
export const display = Platform.OS === "web" ? "Fraunces, Georgia, serif" : undefined;

const tabs = [
  { href: "/ana", label: "Ana sayfa" },
  { href: "/takvim", label: "Takvim" },
  { href: "/bildirim", label: "Bildirim" },
  { href: "/profil", label: "Profil" },
] as const;

export function Screen({ children }: { children: React.ReactNode }) {
  const { ready, user, club } = useSession();
  const insets = useSafeAreaInsets();
  if (!ready) return <View style={{ flex: 1, backgroundColor: paper }} />;
  if (!user || !club) return <Redirect href="/" />;
  return (
    <View style={[styles.screen, { backgroundColor: paper, paddingTop: insets.top }]}>
      <View style={styles.body}>{children}</View>
      <TabBar accent={club.accent} bottom={insets.bottom} />
    </View>
  );
}

function TabBar({ accent, bottom }: { accent: string; bottom: number }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <View style={[styles.tabs, { paddingBottom: Math.max(bottom, 10) }]}>
      {tabs.map((tab) => {
        const active = path === tab.href;
        return (
          <Pressable key={tab.href} onPress={() => router.push(tab.href)} style={styles.tab}>
            <Text style={[styles.tabLabel, { fontFamily: font, color: active ? accent : muted }]}>
              {tab.label}
            </Text>
            <View style={[styles.tick, { backgroundColor: active ? accent : "transparent" }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: line,
    backgroundColor: card,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 6 },
  tabLabel: { fontSize: 12, fontWeight: "600" },
  tick: { width: 16, height: 3, borderRadius: 99 },
  card: {
    backgroundColor: card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: line,
    padding: 16,
  },
});
