import React from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C } from "@/src/theme";

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
  brand: { fontSize: 22, fontWeight: "800", color: C.brand, letterSpacing: 0.5 },
  brandLight: { fontWeight: "500", color: C.text, fontSize: 14 },
  tagline: { color: C.muted, fontSize: 11, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  content: { flex: 1 },
  scrollPad: { paddingHorizontal: 18, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 30 },
  kicker: { color: C.brand, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginTop: 12 },
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginTop: 4 },
  h2: { fontSize: 21, fontWeight: "800", color: C.text },
  h3: { fontSize: 16, fontWeight: "800", color: C.text },
  muted: { color: C.muted, fontSize: 13 },
  mutedSm: { color: C.muted, fontSize: 11 },
  text: { color: C.text, fontSize: 15, fontWeight: "600" },
  section: { color: C.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  metric: { backgroundColor: C.card, borderRadius: 14, padding: 14, width: "48%", minHeight: 88, borderWidth: 1, borderColor: C.border },
  metricLabel: { color: C.muted, fontSize: 11, marginTop: 8, fontWeight: "700" },
  metricValue: { color: C.text, fontSize: 21, fontWeight: "800", marginTop: 3 },
  metricSub: { color: C.muted, fontSize: 11, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 15, marginTop: 12, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 10 },
  split: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  bar: { height: 8, backgroundColor: C.raised, borderRadius: 5, marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: C.brand, borderRadius: 5 },
  actions: { flexDirection: "row", gap: 9, marginTop: 8 },
  quick: { backgroundColor: C.card, borderRadius: 14, padding: 14, flex: 1, minHeight: 78, justifyContent: "space-between", borderWidth: 1, borderColor: C.border },
  quickText: { color: C.text, fontSize: 12, fontWeight: "800" },
  note: { flexDirection: "row", gap: 9, backgroundColor: C.brand + "22", padding: 13, borderRadius: 12, marginTop: 14, marginBottom: 12 },
  noteText: { color: C.muted, fontSize: 12, flex: 1 },
  nav: { minHeight: 68, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card, flexDirection: "row", justifyContent: "space-around", paddingTop: 8, paddingBottom: 6 },
  navItem: { alignItems: "center", flex: 1, paddingVertical: 4 },
  navText: { fontSize: 9, color: C.muted, marginTop: 4, fontWeight: "700" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 14, gap: 10 },
  primaryBtn: { backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  secondaryBtn: { borderWidth: 1, borderColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  secondaryText: { color: C.brand, fontWeight: "800", fontSize: 12 },
  dangerBtn: { borderWidth: 1, borderColor: C.red, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  dangerText: { color: C.red, fontWeight: "800", fontSize: 12 },
  search: { backgroundColor: C.card, borderRadius: 11, padding: 12, color: C.text, marginBottom: 12, borderWidth: 1, borderColor: C.border, minHeight: 46 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, marginBottom: 10, minHeight: 48, fontSize: 14 },
  salesHero: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginTop: 8, borderWidth: 1, borderColor: C.border },
  heroAmount: { fontSize: 32, fontWeight: "800", color: C.text, marginVertical: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  categoryChip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: C.card, flexShrink: 0 },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { color: C.text, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  itemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 9, marginTop: 8 },
  itemCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 12, width: "48%", minHeight: 78 },
  itemCardSelected: { borderColor: C.brand, backgroundColor: C.brand + "20" },
  itemName: { color: C.text, fontWeight: "800", fontSize: 13, marginTop: 4 },
  step: { color: C.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 14, marginBottom: 8 },
  selector: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1, borderColor: C.brand },
  selectorTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  qualityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  qualityChip: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.raised },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  optionChip: { borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: C.raised, minHeight: 44 },
  price: { color: C.brand, fontSize: 18, fontWeight: "800", marginTop: 10 },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 26, marginVertical: 6 },
  counterBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.raised, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  counterText: { color: C.text, fontSize: 28, fontWeight: "800" },
  qty: { color: C.text, fontSize: 26, fontWeight: "800", minWidth: 48, textAlign: "center" },
  summaryRow: { flexDirection: "row", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: "center", gap: 8 },
  subtotal: { color: C.text, fontSize: 18, fontWeight: "800", textAlign: "right", marginTop: 10 },
  finalTotal: { color: C.brand, fontSize: 22, fontWeight: "800", textAlign: "right", marginTop: 6 },
  typeBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.raised, minHeight: 44 },
  tipBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: C.raised, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dateRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  dateInput: { flex: 1, marginBottom: 8, padding: 12 },
  exportRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 6 },
  row: { backgroundColor: C.card, borderRadius: 13, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.brand + "22", alignItems: "center", justifyContent: "center" },
  amount: { color: C.text, fontWeight: "800", fontSize: 14 },
  option: { color: C.brand, fontSize: 11, fontWeight: "800", marginBottom: 2 },
  empty: { alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  profit: { fontSize: 22, fontWeight: "800", marginVertical: 12 },
  overlay: { flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  saleSheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "96%", minHeight: "70%" },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  save: { backgroundColor: C.brand, borderRadius: 11, minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 18 },
  bar7: { flexDirection: "row", gap: 4, height: 90, alignItems: "flex-end", marginTop: 12 },
  bar7Col: { flex: 1, alignItems: "center", gap: 4 },
  bar7Fill: { backgroundColor: C.brand, borderRadius: 4, width: "100%", minHeight: 4 },
  bar7Label: { color: C.muted, fontSize: 9, fontWeight: "700" },
  discountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  discountText: { color: C.yellow, fontSize: 13, fontWeight: "700" },
});

export function Title({ title, sub, action, onAction, actionTestID }: any) {
  return (
    <View style={s.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.h2}>{title}</Text>
        {sub && <Text style={s.muted}>{sub}</Text>}
      </View>
      {action && (
        <Pressable style={s.primaryBtn} onPress={onAction} testID={actionTestID || "title-action"}>
          <Icon name="plus" size={18} color="#fff" />
          <Text style={s.primaryText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({ label, icon = "text-box-outline" }: any) {
  return (
    <View style={s.empty}>
      <Icon name={icon as any} size={40} color={C.brand} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, testID }: any) {
  return (
    <Pressable style={[s.categoryChip, active && s.chipActive]} onPress={onPress} testID={testID}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ value, onChangeText, placeholder, keyboardType = "default", testID }: any) {
  return (
    <TextInput
      style={s.input}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      keyboardType={keyboardType}
      value={String(value ?? "")}
      onChangeText={onChangeText}
      testID={testID}
    />
  );
}
