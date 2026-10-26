import { Screen, display, font, ink, muted } from "@/chrome";
import { useSession } from "@/session";
import { attendanceFor, mobileHome, rosterFor, todayISO, type AttendanceStatus, type Viewer } from "@skys/domain";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const options: { id: AttendanceStatus; label: string }[] = [
  { id: "present", label: "Geldi" },
  { id: "absent", label: "Gelmedi" },
  { id: "excused", label: "İzinli" },
];

export default function RollCallScreen() {
  const { user, club } = useSession();
  if (!user || !club) return null;
  const home = mobileHome(user, club.id);
  const session = home?.sessions.find((item) => item.date === todayISO && item.kind === "training") ?? home?.sessions.find((item) => item.kind === "training");
  const viewer: Viewer = { user };
  const rows = session ? attendanceFor(session, rosterFor(session, viewer)) : [];
  return (
    <Screen>
      <Roll rows={rows} title={session ? `${session.title} · ${session.start}` : "Yoklama"} accent={club.accent} />
    </Screen>
  );
}

function Roll({
  rows,
  title,
  accent,
}: {
  rows: { personId: string; name: string; status: AttendanceStatus }[];
  title: string;
  accent: string;
}) {
  const [marks, setMarks] = useState(rows);
  const [saved, setSaved] = useState(false);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Yoklama</Text>
      <Text style={styles.lead}>{title}</Text>
      {marks.map((row) => (
        <View key={row.personId} style={styles.person}>
          <Text style={styles.name}>{row.name}</Text>
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  setSaved(false);
                  setMarks((current) =>
                    current.map((item) => (item.personId === row.personId ? { ...item, status: option.id } : item)),
                  );
                }}
                style={[styles.chip, { backgroundColor: row.status === option.id ? accent : "#efeae1" }]}
              >
                <Text style={{ color: row.status === option.id ? "white" : ink, fontFamily: font, fontWeight: "700", fontSize: 12 }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Pressable onPress={() => setSaved(true)} style={styles.save}>
        <Text style={styles.saveText}>Kaydet</Text>
      </Pressable>
      {saved ? <Text style={styles.lead}>Katılım kaydedildi.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 28 },
  title: { fontFamily: display, fontSize: 36, color: ink },
  lead: { fontFamily: font, color: muted },
  person: { backgroundColor: "#fffcf8", borderRadius: 18, borderWidth: 1, borderColor: "#e6dfd4", padding: 12, gap: 8 },
  name: { fontFamily: font, fontWeight: "700", color: ink },
  options: { flexDirection: "row", gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  save: { backgroundColor: "#16130f", borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  saveText: { color: "white", fontFamily: font, fontWeight: "700" },
});
