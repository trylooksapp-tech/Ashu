import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money, today as todayFn } from "@/src/theme";
import { s, Title, Empty, Chip } from "@/src/screens/ui";
import { api } from "@/src/api";

export function Sales({ orders, menu, onAdd, onRefresh, onError }: any) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [payFilter, setPayFilter] = useState("All");

  const rows = useMemo(() => {
    return orders.filter((x: any) => {
      if (typeFilter !== "All" && x.order_type !== typeFilter) return false;
      if (payFilter !== "All" && x.payment !== payFilter) return false;
      if (q && !(x.order_id || "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [orders, q, typeFilter, payFilter]);

  const todaySales = orders
    .filter((o: any) => o.date === todayFn())
    .reduce((a: number, o: any) => a + (o.net_sales ?? o.subtotal ?? 0), 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <View style={s.salesHero}>
        <Text style={s.kicker}>TODAY&apos;S SALE</Text>
        <Text style={s.heroAmount}>{money(todaySales)}</Text>
        <Text style={s.muted}>Tap, select, save — no typing required</Text>
        <Pressable style={[s.save, { marginTop: 12, marginBottom: 0 }]} onPress={onAdd} testID="open-sale-builder">
          <Text style={s.primaryText}>+ NEW ORDER</Text>
        </Pressable>
      </View>

      <Title title="Order history" sub={`${orders.length} saved orders`} />
      <TextInput
        style={s.search}
        placeholder="Search order ID"
        placeholderTextColor={C.muted}
        value={q}
        onChangeText={setQ}
        testID="order-search"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ height: 56 }}>
        {["All", "Dine-in", "Home Delivery"].map((t) => (
          <Chip key={t} label={t} active={typeFilter === t} onPress={() => setTypeFilter(t)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ height: 56 }}>
        {["All", "Cash", "UPI", "Other"].map((t) => (
          <Chip key={t} label={t} active={payFilter === t} onPress={() => setPayFilter(t)} />
        ))}
      </ScrollView>

      {rows.length === 0 ? (
        <Empty label="No orders match your filters" icon="receipt" />
      ) : (
        rows.map((o: any) => (
          <View style={s.row} key={o.order_id}>
            <View style={s.rowIcon}>
              <Icon name={o.order_type === "Home Delivery" ? "moped" : "table-furniture"} size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{o.order_id}</Text>
              <Text style={s.muted}>{o.order_type} · {o.date} · {o.payment}</Text>
              <Text style={s.mutedSm}>
                {(o.items || []).length} items · tips {money(o.tips || 0)}
                {o.discount_amount ? ` · disc ${money(o.discount_amount)}` : ""}
              </Text>
            </View>
            <Text style={s.amount}>{money(o.net_sales ?? o.subtotal ?? 0)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
