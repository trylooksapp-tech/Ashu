import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Modal } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C } from "@/src/theme";
import { s, Title } from "@/src/screens/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

export function Settings({ onError, onRefresh }: any) {
  const { user, signOut } = useAuth();
  const [st, setSt] = useState<any>(null);
  const [confirm, setConfirm] = useState<"reset" | null>(null);
  const [newCat, setNewCat] = useState<{ [k: string]: string }>({});

  const load = () => api("/settings").then(setSt).catch((e) => onError(e.message));
  useEffect(() => { load(); }, []);
  if (!st) return null;

  const setField = (k: string, v: any) => setSt({ ...st, [k]: v });
  const addTo = (k: string) => {
    const v = (newCat[k] || "").trim();
    if (!v) return;
    setSt({ ...st, [k]: [...(st[k] || []), v] });
    setNewCat({ ...newCat, [k]: "" });
  };
  const removeFrom = (k: string, item: string) => setSt({ ...st, [k]: st[k].filter((x: string) => x !== item) });

  const save = async () => {
    try {
      const payload = {
        restaurant_name: st.restaurant_name,
        tagline: st.tagline,
        currency: st.currency,
        expense_categories: st.expense_categories,
        raw_categories: st.raw_categories,
        menu_categories: st.menu_categories,
        units: st.units,
        payment_methods: st.payment_methods,
      };
      await api("/settings", { method: "PUT", body: JSON.stringify(payload) });
      onRefresh?.();
    } catch (e: any) { onError(e.message); }
  };

  const resetData = async () => {
    try { await api("/settings/reset", { method: "POST" }); onRefresh?.(); setConfirm(null); }
    catch (e: any) { onError(e.message); }
  };

  const categoryEditor = (label: string, key: string) => (
    <View style={s.card}>
      <Text style={s.cardTitle}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {(st[key] || []).map((c: string) => (
          <View key={c} style={[s.typeBtn, { paddingRight: 8 }]}>
            <Text style={s.chipText}>{c}</Text>
            <Pressable onPress={() => removeFrom(key, c)} hitSlop={4} testID={`rm-${key}-${c}`}>
              <Icon name="close" size={14} color={C.red} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <TextInput
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          placeholder={`Add ${label.toLowerCase()}`}
          placeholderTextColor={C.muted}
          value={newCat[key] || ""}
          onChangeText={(v) => setNewCat({ ...newCat, [key]: v })}
          testID={`new-${key}`}
        />
        <Pressable style={s.primaryBtn} onPress={() => addTo(key)} testID={`add-${key}`}>
          <Icon name="plus" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <Title title="Settings" sub="Customize AFT for your restaurant" />

      <View style={s.card}>
        <Text style={s.cardTitle}>Logged in</Text>
        <Text style={s.text}>{user?.name || user?.email}</Text>
        <Text style={s.muted}>{user?.email}</Text>
        <Pressable style={[s.dangerBtn, { marginTop: 12, alignSelf: "flex-start" }]} onPress={signOut} testID="logout-btn">
          <Icon name="logout" size={16} color={C.red} />
          <Text style={s.dangerText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Restaurant brand</Text>
        <TextInput style={s.input} placeholder="Restaurant name" placeholderTextColor={C.muted} value={st.restaurant_name} onChangeText={(v) => setField("restaurant_name", v)} testID="set-name" />
        <TextInput style={s.input} placeholder="Tagline" placeholderTextColor={C.muted} value={st.tagline} onChangeText={(v) => setField("tagline", v)} testID="set-tagline" />
        <TextInput style={s.input} placeholder="Currency symbol" placeholderTextColor={C.muted} value={st.currency} onChangeText={(v) => setField("currency", v)} testID="set-currency" />
      </View>

      {categoryEditor("Menu categories", "menu_categories")}
      {categoryEditor("Raw material categories", "raw_categories")}
      {categoryEditor("Other expense categories", "expense_categories")}
      {categoryEditor("Units", "units")}
      {categoryEditor("Payment methods", "payment_methods")}

      <Pressable style={s.save} onPress={save} testID="save-settings">
        <Text style={s.primaryText}>Save settings</Text>
      </Pressable>

      <View style={[s.card, { borderColor: C.red }]}>
        <Text style={s.cardTitle}>Danger zone</Text>
        <Text style={s.muted}>Reset all sales, purchases, usage and expense records. Menu items and settings are kept.</Text>
        <Pressable style={[s.dangerBtn, { marginTop: 12, alignSelf: "flex-start" }]} onPress={() => setConfirm("reset")} testID="reset-btn">
          <Icon name="trash-can-outline" size={16} color={C.red} />
          <Text style={s.dangerText}>Reset transactions</Text>
        </Pressable>
      </View>

      <Modal transparent animationType="fade" visible={confirm === "reset"} onRequestClose={() => setConfirm(null)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { minHeight: 200 }]}>
            <Text style={s.h2}>Are you sure?</Text>
            <Text style={s.muted}>All sales, purchases, stock usage and expenses will be permanently deleted.</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable style={[s.secondaryBtn, { flex: 1, justifyContent: "center" }]} onPress={() => setConfirm(null)} testID="cancel-reset">
                <Text style={s.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.dangerBtn, { flex: 1, justifyContent: "center" }]} onPress={resetData} testID="confirm-reset">
                <Text style={s.dangerText}>Yes, delete all</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
