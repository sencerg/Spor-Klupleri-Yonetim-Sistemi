import { Card, Screen, display, font, ink, muted } from "@/chrome";
import { useSession } from "@/session";
import {
  bookedCount,
  dayLabel,
  facilityName,
  formatTry,
  mobileHome,
  todayISO,
  roleLabels,
  sportName,
  statusLabel,
  teamName,
  waitlist,
} from "@skys/domain";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const { user, club } = useSession();
  const router = useRouter();
  if (!user || !club) return null;
  const home = mobileHome(user, club.id);
  if (!home) return null;
  const upcoming = [...home.sessions].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const next = upcoming.find((session) => session.date >= todayISO) ?? upcoming[0];
  const openBill = home.bills.find((bill) => bill.status !== "paid");
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{club.name}</Text>
        <Text style={styles.title}>
          {hello}, {user.name.split(" ")[0]}
        </Text>
        <Text style={styles.role}>
          {roleLabels[home.membership.role]}
          {home.person ? ` · ${home.person.kind === "member" ? sportName(home.person.sportId) : teamName(home.person.teamId)}` : ""}
        </Text>
        {next ? (
          <View style={[styles.hero, { backgroundColor: club.splash }]}>
            <Text style={styles.heroKicker}>{dayLabel(next.date)}</Text>
            <Text style={styles.heroTitle}>{next.title}</Text>
            <Text style={styles.heroMeta}>
              {next.start}–{next.end} · {facilityName(next.facilityId)}
            </Text>
            {next.capacity ? (
              <Text style={styles.heroMeta}>
                {bookedCount(next.id)}/{next.capacity} dolu
                {waitlist(next.id).length ? ` · ${waitlist(next.id).length} beklemede` : ""}
              </Text>
            ) : null}
          </View>
        ) : null}
        {home.credit ? (
          <Card>
            <Text style={styles.cardLabel}>Seans hakkı</Text>
            <Text style={styles.cardValue}>
              {home.credit.remaining}/{home.credit.total}
            </Text>
            <Text style={styles.cardHint}>{home.credit.title}. Katılınca bir hak düşer.</Text>
          </Card>
        ) : null}
        {openBill ? (
          <Pressable onPress={() => router.push("/aidat")}>
            <Card>
              <Text style={styles.cardLabel}>Aidat</Text>
              <Text style={styles.cardValue}>{formatTry(openBill.amount - openBill.paid)}</Text>
              <Text style={styles.cardHint}>
                {openBill.title} · {statusLabel[openBill.status]}
              </Text>
            </Card>
          </Pressable>
        ) : null}
        {home.membership.role === "coach" ? (
          <Pressable onPress={() => router.push("/yoklama")} style={[styles.action, { backgroundColor: club.accent }]}>
            <Text style={styles.actionText}>Yoklama al</Text>
          </Pressable>
        ) : null}
        {home.notices[0] ? (
          <Pressable onPress={() => router.push("/bildirim")}>
            <Card>
              <Text style={styles.cardLabel}>Son bildirim</Text>
              <Text style={styles.notice}>{home.notices[0].title}</Text>
              <Text style={styles.cardHint}>{home.notices[0].body}</Text>
            </Card>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 28 },
  kicker: { fontFamily: font, color: muted, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  title: { fontFamily: display, fontSize: 36, color: ink, lineHeight: 40 },
  role: { fontFamily: font, color: muted, marginBottom: 6 },
  hero: { borderRadius: 26, padding: 20, gap: 6 },
  heroKicker: { color: "rgba(255,255,255,0.7)", fontFamily: font, fontSize: 12, fontWeight: "700" },
  heroTitle: { color: "white", fontFamily: display, fontSize: 32 },
  heroMeta: { color: "rgba(255,255,255,0.82)", fontFamily: font, fontSize: 14 },
  cardLabel: { fontFamily: font, color: muted, fontSize: 12, fontWeight: "700" },
  cardValue: { fontFamily: display, fontSize: 32, color: ink, marginTop: 4 },
  cardHint: { fontFamily: font, color: muted, marginTop: 4, lineHeight: 20 },
  notice: { fontFamily: font, fontWeight: "700", color: ink, marginTop: 6, fontSize: 16 },
  action: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  actionText: { color: "white", fontFamily: font, fontWeight: "700" },
});
