import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money } from "@/src/theme";
import { s, Title, Empty } from "@/src/screens/ui";
import { api } from "@/src/api";

export function RawMaterial({ purchases, onAdd, onUsage, onRefresh, onError }: any) {
  const [stock, setStock] = useState<any[]>([]);
  const load = () => api("/stock").then(setStock).catch(() => {});
  useEffect(() => { load(); }, [purchases]);

  const del = async (rid: string) => {
    try { await api(`/purchases/${rid}`, { method: "DELETE" }); onRefresh(); load(); }
    catch (e: any) { onError(e.message); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <Title title="Raw materials" sub="Purchases and usage are recorded separately" action="Add purchase" onAction={onAdd} actionTestID="add-purchase-btn" />
      <Pressable style={s.secondaryBtn} onPress={onUsage} testID="log-usage-btn">
        <Icon name="minus-circle-outline" size={18} color={C.brand} />
        <Text style={s.secondaryText}>Log stock usage</Text>
      </Pressable>

      <Text style={s.section}>STOCK BALANCE (Purchased − Used)</Text>
      {stock.length === 0 ? (
        <Empty label="No stock movements yet" icon="package-variant-closed" />
      ) : (
        stock.map((row) => (
          <View style={s.row} key={row.item}>
            <View style={s.rowIcon}><Icon name="cube-outline" size={20} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{row.item}</Text>
              <Text style={s.muted}>
                +{row.purchased} {row.unit || ""}  ·  −{row.used} {row.unit || ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.amount}>{row.closing} {row.unit || ""}</Text>
              <Text style={s.mutedSm}>{money(row.value)} value</Text>
            </View>
          </View>
        ))
      )}

      <Text style={s.section}>RECENT PURCHASES</Text>
      {purchases.length === 0 ? (
        <Empty label="No purchases recorded" />
      ) : (
        purchases.slice(0, 30).map((p: any) => (
          <View style={s.row} key={p.record_id}>
            <View style={s.rowIcon}><Icon name="package-variant" size={20} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{p.item}</Text>
              <Text style={s.muted}>{p.quantity} {p.unit} × {money(p.price)} · {p.date}</Text>
              {p.supplier ? <Text style={s.mutedSm}>Supplier: {p.supplier}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.amount}>{money(p.total)}</Text>
              <Pressable onPress={() => del(p.record_id)} hitSlop={8} testID={`del-${p.record_id}`}>
                <Icon name="delete-outline" size={18} color={C.red} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
