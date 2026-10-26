import { Card, Screen, display, font, ink, muted } from "@/chrome";
import { useSession } from "@/session";
import { roleLabels } from "@skys/domain";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  const { user, club, clubs, pickClub, signOut } = useSession();
  const router = useRouter();
  if (!user || !club) return null;
  const membership = user.memberships.find((item) => item.clubId === club.id);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: club.splash }]}>
          <Text style={styles.mark}>{club.monogram}</Text>
          <Text style={styles.title}>{user.name}</Text>
          <Text style={styles.meta}>{membership ? roleLabels[membership.role] : ""} · {club.name}</Text>
        </View>
        <Pressable onPress={() => router.push("/aidat")}>
          <Card>
            <Text style={styles.link}>Aidat ve paket</Text>
          </Card>
        </Pressable>
        {membership?.role === "coach" ? (
          <Pressable onPress={() => router.push("/yoklama")}>
            <Card>
              <Text style={styles.link}>Yoklama</Text>
            </Card>
          </Pressable>
        ) : null}
        {clubs.length > 1 ? (
          <View style={styles.block}>
            <Text style={styles.section}>Kulüp değiştir</Text>
            {clubs.map((item) => (
              <Pressable key={item.id} onPress={() => pickClub(item.id)} style={styles.switch}>
                <View style={[styles.dot, { backgroundColor: item.accent }]} />
                <Text style={[styles.link, item.id === club.id ? styles.current : null]}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            signOut();
            router.replace("/");
          }}
          style={styles.out}
        >
          <Text style={styles.outText}>Çıkış</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 28 },
  hero: { borderRadius: 26, padding: 20 },
  mark: { fontFamily: display, color: "white", fontSize: 28 },
  title: { fontFamily: display, color: "white", fontSize: 34, marginTop: 12 },
  meta: { fontFamily: font, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  link: { fontFamily: font, fontWeight: "700", color: ink, fontSize: 16 },
  current: { color: muted },
  section: { fontFamily: font, color: muted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  block: { marginTop: 8 },
  switch: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 99 },
  out: { marginTop: 12, alignItems: "center", padding: 12 },
  outText: { fontFamily: font, color: "#9f2d2d", fontWeight: "700" },
});
