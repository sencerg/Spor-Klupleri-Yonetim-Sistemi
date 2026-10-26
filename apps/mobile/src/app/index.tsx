import { card, display, font, ink, muted, paper } from "@/chrome";
import { useSession } from "@/session";
import { DEMO_PASSWORD, channelClubs, clubById, roleLabels, users } from "@skys/domain";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const { ready, user, club, clubs, signIn, pickClub } = useSession();
  const [email, setEmail] = useState("can@veli.test");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  if (!ready) return <View style={{ flex: 1, backgroundColor: "#16130f" }} />;
  if (user && club) return <Redirect href="/ana" />;

  const accounts = users.filter((account) => channelClubs(account, "mobile").length > 0);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>SKYS</Text>
      {user && !club ? (
        <View>
          <Text style={styles.title}>Hangi kulüp?</Text>
          <Text style={styles.lead}>{user.name}, bu hesap birden fazla kulüpte.</Text>
          {clubs.map((item) => (
            <Pressable key={item.id} onPress={() => pickClub(item.id)} style={styles.account}>
              <View style={[styles.mark, { backgroundColor: item.accent }]}>
                <Text style={styles.markText}>{item.monogram}</Text>
              </View>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.motto}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View>
          <Text style={styles.title}>Kulübün bugünü.</Text>
          <Text style={styles.lead}>Antrenman, bildirim ve aidat bu kulübün rengiyle açılır.</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={styles.primary}
            onPress={() => setError(signIn(email, password))}
          >
            <Text style={styles.primaryText}>Giriş yap</Text>
          </Pressable>
          <Text style={styles.section}>Deneme hesapları</Text>
          {accounts.map((account) => {
            const membership = channelClubs(account, "mobile")[0];
            const item = clubById(membership.clubId ?? "");
            return (
              <Pressable
                key={account.id}
                style={styles.account}
                onPress={() => {
                  setEmail(account.email);
                  setError(signIn(account.email, DEMO_PASSWORD));
                }}
              >
                <View style={[styles.mark, { backgroundColor: item?.accent ?? "#16130f" }]}>
                  <Text style={styles.markText}>{item?.monogram ?? "S"}</Text>
                </View>
                <View>
                  <Text style={styles.name}>{account.name}</Text>
                  <Text style={styles.meta}>
                    {roleLabels[membership.role]}
                    {item ? ` · ${item.name}` : ""}
                    {channelClubs(account, "mobile").length > 1 ? " · 2 kulüp" : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper },
  content: { padding: 22, paddingBottom: 48 },
  brand: { fontFamily: font, letterSpacing: 3, fontSize: 12, fontWeight: "700", color: muted },
  title: { fontFamily: display, fontSize: 40, color: ink, marginTop: 28 },
  lead: { fontFamily: font, color: muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  input: {
    fontFamily: font,
    backgroundColor: card,
    borderWidth: 1,
    borderColor: "#e6dfd4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    color: ink,
  },
  primary: { backgroundColor: "#16130f", borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  primaryText: { color: "white", fontFamily: font, fontWeight: "700" },
  error: { color: "#9f2d2d", marginBottom: 8, fontFamily: font },
  section: {
    marginTop: 26,
    marginBottom: 10,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: muted,
    fontWeight: "700",
  },
  account: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e6dfd4",
    padding: 12,
    marginBottom: 8,
  },
  mark: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  markText: { color: "white", fontFamily: display, fontSize: 16 },
  name: { fontFamily: font, fontWeight: "700", color: ink },
  meta: { fontFamily: font, color: muted, fontSize: 12, marginTop: 2 },
});
