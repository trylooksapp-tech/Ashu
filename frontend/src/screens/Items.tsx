import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Modal } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money } from "@/src/theme";
import { s, Title, Empty, Chip, TextField } from "@/src/screens/ui";
import { api } from "@/src/api";

export function Items({ menu, onAdd, onRefresh, onError }: any) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [editing, setEditing] = useState<any>(null);
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
            <View style={{ gap: 8 }}>
              <Pressable onPress={() => setEditing({ ...m, _prices: m.options.map((o: any) => ({ name: o.name, price: String(o.price) })) })} hitSlop={6} testID={`edit-${m.item_id}`}>
                <Icon name="pencil-outline" size={20} color={C.brand} />
              </Pressable>
              <Pressable onPress={() => toggle(m)} hitSlop={6} testID={`toggle-${m.item_id}`}>
                <Icon name={m.active ? "eye-outline" : "eye-off-outline"} size={20} color={C.muted} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      {editing && (
        <EditItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onRefresh(); }}
          onError={onError}
        />
      )}
    </ScrollView>
  );
}

function EditItemModal({ item, onClose, onSaved, onError }: any) {
  const [name, setName] = useState(item.name);
  const [variant, setVariant] = useState(item.variant || "Regular");
  const [prices, setPrices] = useState<{ name: string; price: string }[]>(item._prices);
  const [saving, setSaving] = useState(false);

  const updatePrice = (idx: number, v: string) => {
    setPrices((p) => p.map((o, i) => (i === idx ? { ...o, price: v } : o)));
  };

  const save = async () => {
    if (!name.trim()) return onError("Name is required");
    const options = prices.map((p) => ({ name: p.name, price: Number(p.price) }));
    if (options.some((o) => isNaN(o.price) || o.price < 0)) return onError("Prices must be zero or more");
    setSaving(true);
    try {
      await api(`/menu/${item.item_id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          category: item.category,
          variant: variant.trim() || "Regular",
          options,
          quality_required: false,
          quality_options: item.quality_options || [],
          active: item.active,
          kind: "menu",
        }),
      });
      onSaved();
    } catch (e: any) {
      onError(e.message || "Could not update item");
    } finally { setSaving(false); }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <View>
              <Text style={s.h2}>Edit item</Text>
              <Text style={s.muted}>{item.category}</Text>
            </View>
            <Pressable onPress={onClose} testID="close-edit-item">
              <Icon name="close" size={24} color={C.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.step}>ITEM NAME</Text>
            <TextField value={name} onChangeText={setName} placeholder="Item name" testID="edit-name" />

            <Text style={s.step}>VARIANT / QUALITY</Text>
            <TextField value={variant} onChangeText={setVariant} placeholder="e.g., Paneer, Veg, Regular" testID="edit-variant" />

            <Text style={s.step}>PRICES</Text>
            <Text style={s.mutedSm}>Old saved sales keep the original price — only future sales use the new price.</Text>
            {prices.map((p, i) => (
              <View key={p.name} style={{ marginTop: 12 }}>
                <Text style={s.muted}>{p.name}</Text>
                <TextField
                  value={p.price}
                  onChangeText={(v: string) => updatePrice(i, v)}
                  placeholder="Price ₹"
                  keyboardType="numeric"
                  testID={`edit-price-${p.name}`}
                />
              </View>
            ))}

            <Pressable
              style={[s.save, saving && { opacity: 0.5 }]}
              onPress={save}
              disabled={saving}
              testID="save-edit-item"
            >
              <Text style={s.primaryText}>{saving ? "SAVING…" : "SAVE CHANGES"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
