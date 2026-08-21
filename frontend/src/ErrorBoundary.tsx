import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { C } from "@/src/theme";

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    if (typeof console !== "undefined") console.warn("AFT ErrorBoundary:", error);
  }
  reset = () => {
    this.setState({ error: null });
    if (Platform.OS === "web" && typeof window !== "undefined") window.location.reload();
  };
  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.brand}>AFT · Apna Flavour Town</Text>
          <Text style={styles.tagline}>स्वाद की नई दुनिया</Text>
          <Text style={styles.h2}>Something went wrong</Text>
          <Text style={styles.msg}>{this.state.error.message || "Please try again."}</Text>
          <Pressable style={styles.btn} onPress={this.reset} testID="err-retry">
            <Text style={styles.btnText}>Reload app</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as any;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 30 },
  brand: { color: C.brand, fontSize: 26, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 32 },
  h2: { color: C.text, fontSize: 20, fontWeight: "800", marginTop: 10 },
  msg: { color: C.muted, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  btn: { backgroundColor: C.brand, marginTop: 26, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
