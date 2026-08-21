import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money } from "@/src/theme";
import { s, Title, Empty, Chip } from "@/src/screens/ui";
import { api } from "@/src/api";

export function Items({ menu, onAdd, onRefresh, onError }: any) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const cats = useMemo(() => ["All", ...Array.from(new Set(menu.map((m: any) => m.category)))], [menu]);

  const rows = useMemo(() => menu.filter((m: any) => {
    if (category !== "All" && m.category !== category) return false;
    if (q && !m.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [menu, q, category]);

  const toggle = async (m: any) => {
    try {
      await api(`/menu/${m.item_id}`, { method: "PUT", body: JSON.stringify({ ...m, active: !m.active }) });
      onRefresh();
    } catch (e: any) { onError(e.message); }
  };
  const del = async (m: any) => { try { await api(`/menu/${m.item_id}`, { method: "DELETE" }); onRefresh(); } catch (e: any) { onError(e.message); } };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <Title title="Menu items" sub={`${menu.filter((x: any) => x.active).length} active`} action="Add item" onAction={onAdd} actionTestID="add-item-btn" />
      <TextInput style={s.search} placeholder="Search item" placeholderTextColor={C.muted} value={q} onChangeText={setQ} testID="item-search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ height: 56 }}>
        {cats.map((c: string) => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}
      </ScrollView>

      {rows.length === 0 ? (
        <Empty label="No items match" icon="silverware-fork-knife" />
      ) : (
        rows.map((m: any) => (
          <View style={s.row} key={m.item_id}>
            <View style={s.rowIcon}><Icon name="silverware-fork-knife" size={20} color={m.active ? C.brand : C.muted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{m.name}{!m.active ? "  ·  (inactive)" : ""}</Text>
              <Text style={s.muted}>{m.category} · {m.variant}</Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {m.options.map((o: any) => <Text style={s.option} key={o.name}>{o.name} {money(o.price)}</Text>)}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable onPress={() => toggle(m)} hitSlop={6} testID={`toggle-${m.item_id}`}>
                <Icon name={m.active ? "eye-outline" : "eye-off-outline"} size={20} color={C.brand} />
              </Pressable>
              <Pressable onPress={() => del(m)} hitSlop={6} testID={`del-${m.item_id}`}>
                <Icon name="delete-outline" size={20} color={C.red} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
