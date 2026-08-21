import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money } from "@/src/theme";
import { s } from "@/src/screens/ui";

export function Dashboard({ d, onAdd, userName }: any) {
  if (!d) return null;
  const today = d.today || {};
  const month = d.month || {};
  const trend = d.trend || [];
  const maxSales = Math.max(1, ...trend.map((t: any) => t.sales || 0));

  const metric = (label: string, value: any, icon: any, sub?: string) => (
    <View style={s.metric} key={label} testID={`metric-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <Icon name={icon} size={18} color={C.brand} />
      <Text style={s.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={s.metricValue}>{value}</Text>
      {sub && <Text style={s.metricSub}>{sub}</Text>}
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <Text style={s.kicker}>TODAY · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
      <Text style={s.h1}>Namaste{userName ? `, ${userName.split(" ")[0]}` : ""}</Text>
      <Text style={s.muted}>Here's how Apna Flavour Town is doing.</Text>

      <View style={s.grid}>
        {metric("Sales", money(today.sales), "cash-register", `Gross ${money(today.gross)}`)}
        {metric("Net profit", money(today.profit), "trending-up")}
        {metric("Orders", String(today.orders), "receipt")}
        {metric("Tips", money(today.tips), "hand-coin", "excluded from profit")}
      </View>

      <Text style={s.section}>TODAY&apos;S BREAKDOWN</Text>
      <View style={s.card}>
        <View style={s.split}>
          <Text style={s.muted}>Dine-in  <Text style={s.text}>{money(today.dine_in)}</Text></Text>
          <Text style={s.muted}>Delivery  <Text style={s.text}>{money(today.delivery)}</Text></Text>
        </View>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${today.sales ? Math.max(6, (today.dine_in / today.sales) * 100) : 6}%` } as any]} />
        </View>
        <View style={[s.split, { marginTop: 12 }]}>
          <Text style={s.muted}>Cash  <Text style={s.text}>{money(today.cash)}</Text></Text>
          <Text style={s.muted}>UPI  <Text style={s.text}>{money(today.upi)}</Text></Text>
        </View>
        {today.discount ? (
          <View style={[s.split, { marginTop: 10 }]}>
            <Text style={s.muted}>Discount given</Text>
            <Text style={s.discountText}>− {money(today.discount)}</Text>
          </View>
        ) : null}
        <View style={[s.split, { marginTop: 10 }]}>
          <Text style={s.muted}>Raw material</Text>
          <Text style={s.text}>{money(today.raw)}</Text>
        </View>
        <View style={[s.split, { marginTop: 6 }]}>
          <Text style={s.muted}>Other expenses</Text>
          <Text style={s.text}>{money(today.other)}</Text>
        </View>
      </View>

      <Text style={s.section}>QUICK ACTIONS</Text>
      <View style={s.actions}>
        <Pressable style={s.quick} onPress={() => onAdd("sale")} testID="quick-sale-btn">
          <Icon name="plus" size={22} color={C.brand} />
          <Text style={s.quickText}>New sale</Text>
        </Pressable>
        <Pressable style={s.quick} onPress={() => onAdd("purchase")} testID="quick-purchase-btn">
          <Icon name="package-variant" size={22} color={C.brand} />
          <Text style={s.quickText}>Stock purchase</Text>
        </Pressable>
        <Pressable style={s.quick} onPress={() => onAdd("expense")} testID="quick-expense-btn">
          <Icon name="cash-minus" size={22} color={C.brand} />
          <Text style={s.quickText}>Other expense</Text>
        </Pressable>
      </View>

      <Text style={s.section}>LAST 7 DAYS · SALES</Text>
      <View style={s.card}>
        <View style={s.bar7}>
          {trend.map((t: any) => (
            <View key={t.date} style={s.bar7Col}>
              <View style={[s.bar7Fill, { height: Math.max(4, (t.sales / maxSales) * 70) }]} />
              <Text style={s.bar7Label}>{t.date.slice(8, 10)}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={s.section}>THIS MONTH</Text>
      <View style={s.grid}>
        {metric("Sales", money(month.sales), "chart-line")}
        {metric("Profit", money(month.profit), "trending-up")}
        {metric("Expenses", money(month.raw + month.other), "cash-minus")}
        {metric("Tips", money(month.tips), "hand-coin")}
      </View>

      <View style={s.note}>
        <Icon name="information-outline" size={18} color={C.brand} />
        <Text style={s.noteText}>Tips are tracked separately and never included in sales or profit. Discounts reduce sales.</Text>
      </View>
    </ScrollView>
  );
}
