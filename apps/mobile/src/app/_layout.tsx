import { SessionProvider } from "@/session";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,650&family=Outfit:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <View style={styles.stage}>
          <View style={styles.device}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#f4f1ea" } }} />
          </View>
        </View>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#d8d2c6" : "#f4f1ea",
    alignItems: "center",
  },
  device: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#f4f1ea",
  },
});
