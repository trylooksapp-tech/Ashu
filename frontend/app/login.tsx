import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Login() {
  const { signIn, loading, error } = useAuth();
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.hero}>
        <Icon name="silverware-fork-knife" size={56} color={C.brand} />
        <Text style={styles.brand}>AFT</Text>
        <Text style={styles.name}>Apna Flavour Town</Text>
        <Text style={styles.tagline}>स्वाद की नई दुनिया</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Sign in to continue</Text>
        <Text style={styles.muted}>
          Manage sales, stock and expenses for your restaurant securely. Every session lasts 7 days.
        </Text>

        <Pressable style={styles.google} onPress={signIn} testID="google-login-btn">
          {loading ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <>
              <Icon name="google" size={20} color={C.text} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Text style={[styles.muted, { fontSize: 11, marginTop: 22 }]}>
          Tips are always tracked separately from sales and profit. Discounts reduce net sales but never touch item prices.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 24 },
  hero: { alignItems: "center", marginTop: 60 },
  brand: { color: C.brand, fontSize: 46, fontWeight: "800", letterSpacing: 1, marginTop: 12 },
  name: { color: C.text, fontSize: 20, fontWeight: "700", marginTop: 4 },
  tagline: { color: C.muted, fontSize: 14, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 22, marginTop: 44, borderWidth: 1, borderColor: C.border },
  h2: { color: C.text, fontSize: 20, fontWeight: "800" },
  muted: { color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 19 },
  google: { backgroundColor: C.raised, borderRadius: 12, minHeight: 54, marginTop: 22, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, borderWidth: 1, borderColor: C.border },
  googleText: { color: C.text, fontSize: 15, fontWeight: "700" },
  err: { color: C.red, fontSize: 13, marginTop: 10 },
});
