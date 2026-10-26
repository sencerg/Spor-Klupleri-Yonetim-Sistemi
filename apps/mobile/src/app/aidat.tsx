import { Card, Screen, display, font, ink, muted } from "@/chrome";
import { useSession } from "@/session";
import { formatDay, formatTry, mobileHome, statusLabel } from "@skys/domain";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function DuesScreen() {
  const { user, club } = useSession();
  if (!user || !club) return null;
  const home = mobileHome(user, club.id);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Aidat</Text>
        {home?.credit ? (
          <Card>
            <Text style={styles.label}>Paket</Text>
            <Text style={styles.value}>
              {home.credit.remaining} hak kaldı
            </Text>
            <Text style={styles.hint}>
              {home.credit.title}. Gelmezsen ve kulüp kuralı açıksa hak düşer.
            </Text>
          </Card>
        ) : null}
        {(home?.bills ?? []).map((bill) => (
          <Card key={bill.id}>
            <Text style={styles.label}>{statusLabel[bill.status]}</Text>
            <Text style={styles.name}>{bill.title}</Text>
            <Text style={styles.value}>{formatTry(bill.amount - bill.paid)}</Text>
            <Text style={styles.hint}>
              Vade {formatDay(bill.due)} · ödenen {formatTry(bill.paid)}
            </Text>
          </Card>
        ))}
        {home && home.bills.length === 0 && !home.credit ? <Text style={styles.hint}>Açık borç yok.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 28 },
  title: { fontFamily: display, fontSize: 36, color: ink },
  label: { fontFamily: font, color: muted, fontSize: 12, fontWeight: "700" },
  name: { fontFamily: font, fontWeight: "700", color: ink, marginTop: 6, fontSize: 16 },
  value: { fontFamily: display, fontSize: 32, color: ink, marginTop: 4 },
  hint: { fontFamily: font, color: muted, marginTop: 4, lineHeight: 20 },
});