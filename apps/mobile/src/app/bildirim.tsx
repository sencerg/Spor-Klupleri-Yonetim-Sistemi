import { Card, Screen, display, font, ink, muted } from "@/chrome";
import { useSession } from "@/session";
import { dayLabel, mobileHome, statusLabel } from "@skys/domain";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function NoticeScreen() {
  const { user, club } = useSession();
  if (!user || !club) return null;
  const home = mobileHome(user, club.id);
  const notices = home?.notices ?? [];
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Bildirim</Text>
        <Text style={styles.lead}>{club.name} dışında bir duyuru bu listede durmaz.</Text>
        {notices.length === 0 ? (
          <Card>
            <Text style={styles.empty}>Yeni bildirimin yok.</Text>
          </Card>
        ) : null}
        {notices.map((notice) => (
          <Card key={notice.id}>
            <View style={styles.row}>
              <Text style={[styles.badge, { color: club.accent }]}>{statusLabel[notice.state]}</Text>
              <Text style={styles.when}>{dayLabel(notice.at)}</Text>
            </View>
            <Text style={styles.name}>{notice.title}</Text>
            <Text style={styles.body}>{notice.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 28 },
  title: { fontFamily: display, fontSize: 36, color: ink },
  lead: { fontFamily: font, color: muted, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  badge: { fontFamily: font, fontWeight: "700", fontSize: 12 },
  when: { fontFamily: font, color: muted, fontSize: 12 },
  name: { fontFamily: font, fontWeight: "700", fontSize: 18, color: ink, marginTop: 8 },
  body: { fontFamily: font, color: muted, marginTop: 6, lineHeight: 21 },
  empty: { fontFamily: font, color: muted },
});
