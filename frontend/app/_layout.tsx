import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View, ActivityIndicator, Text, StyleSheet, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/auth";
import { C } from "@/src/theme";
import { ErrorBoundary } from "@/src/ErrorBoundary";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Fix the mobile viewport meta once at boot (better than editing +html.tsx which
// is a server-render entry). Ensures Chrome Android doesn't zoom or clip.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const existing = document.querySelector('meta[name="viewport"]');
  const content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  if (existing) existing.setAttribute("content", content);
  else {
    const m = document.createElement("meta");
    m.setAttribute("name", "viewport");
    m.setAttribute("content", content);
    document.head.appendChild(m);
  }
  // Allow scrolling in components by not wedging body height at 100vh on mobile.
  try {
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
  } catch {}
}

function AuthGate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === "login";
    // Defer navigation to next tick so we never call router.replace during render/mount.
    const id = setTimeout(() => {
      if (!user && !inLogin) router.replace("/login");
      else if (user && inLogin) router.replace("/");
    }, 0);
    return () => clearTimeout(id);
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>AFT · Apna Flavour Town</Text>
        <Text style={styles.tagline}>स्वाद की नई दुनिया</Text>
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 22 }} />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 30 },
  brand: { color: C.brand, fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { color: C.muted, fontSize: 14, marginTop: 6 },
});
