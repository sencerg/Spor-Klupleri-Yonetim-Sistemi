import { Card, Screen, display, font, ink, muted } from "@/chrome";
import { useSession } from "@/session";
import { dayLabel, facilityName, mobileHome } from "@skys/domain";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function CalendarScreen() {
  const { user, club } = useSession();
  if (!user || !club) return null;
  const home = mobileHome(user, club.id);
  const days = [...new Set(home?.sessions.map((session) => session.date) ?? [])];
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Takvim</Text>
        <Text style={styles.lead}>Yalnızca senin grubun veya seansın.</Text>
        {days.map((day) => (
          <View key={day} style={styles.block}>
            <Text style={styles.day}>{dayLabel(day)}</Text>
            {home?.sessions
              .filter((session) => session.date === day)
              .map((session) => (
                <Card key={session.id}>
                  <Text style={[styles.time, { color: club.accent }]}>
                    {session.start}–{session.end}
                  </Text>
                  <Text style={styles.name}>{session.title}</Text>
                  <Text style={styles.meta}>{facilityName(session.facilityId)}</Text>
                </Card>
              ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 28 },
  title: { fontFamily: display, fontSize: 36, color: ink },
  lead: { fontFamily: font, color: muted, marginBottom: 8 },
  block: { gap: 8 },
  day: { fontFamily: font, fontWeight: "700", color: ink },
  time: { fontFamily: font, fontWeight: "700", fontSize: 13 },
  name: { fontFamily: font, fontSize: 18, fontWeight: "700", color: ink, marginTop: 4 },
  meta: { fontFamily: font, color: muted, marginTop: 2 },
});
