import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Platform } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money, today as todayFn, monthStart } from "@/src/theme";
import { s, Title, Empty } from "@/src/screens/ui";
import { api, download } from "@/src/api";

const preset = (kind: string) => {
  const t = new Date(); const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (kind === "today") return { start: iso(t), end: iso(t) };
  if (kind === "yesterday") { const y = new Date(t); y.setDate(y.getDate() - 1); return { start: iso(y), end: iso(y) }; }
  if (kind === "week") { const w = new Date(t); w.setDate(w.getDate() - 6); return { start: iso(w), end: iso(t) }; }
  return { start: monthStart(), end: iso(t) };
};

export function Reports({ onError }: any) {
  const [r, setR] = useState<any>();
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(todayFn());
  const [busy, setBusy] = useState(false);

  const run = async () => { try { setBusy(true); const res = await api(`/reports?start=${start}&end=${end}`); setR(res); } catch (e: any) { onError(e.message); } finally { setBusy(false); } };
  useEffect(() => { run(); }, [start, end]);

  const applyPreset = (k: string) => { const p = preset(k); setStart(p.start); setEnd(p.end); };

  const doExport = async (kind: string, fname: string) => {
    try { await download(kind, fname); }
    catch (e: any) { onError(e.message); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <Title title="Reports" sub="Any date range · export ready" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ height: 56 }}>
        {[
          { k: "today", label: "Today" },
          { k: "yesterday", label: "Yesterday" },
          { k: "week", label: "This week" },
          { k: "month", label: "This month" },
        ].map((p) => (
          <Pressable key={p.k} style={s.categoryChip} onPress={() => applyPreset(p.k)} testID={`preset-${p.k}`}>
            <Text style={s.chipText}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.dateRow}>
        <TextInput style={[s.input, s.dateInput]} placeholder="Start YYYY-MM-DD" placeholderTextColor={C.muted} value={start} onChangeText={setStart} testID="date-start" />
        <TextInput style={[s.input, s.dateInput]} placeholder="End YYYY-MM-DD" placeholderTextColor={C.muted} value={end} onChangeText={setEnd} testID="date-end" />
        <Pressable style={s.primaryBtn} onPress={run} testID="apply-range">
          <Icon name="refresh" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={s.exportRow}>
        <Pressable style={s.secondaryBtn} onPress={() => doExport(`sales?start=${start}&end=${end}`, `aft_sales_${start}_${end}.csv`)} testID="export-sales-csv">
          <Icon name="file-delimited-outline" size={16} color={C.brand} />
          <Text style={s.secondaryText}>Sales CSV</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={() => doExport(`expenses?start=${start}&end=${end}`, `aft_expenses_${start}_${end}.csv`)} testID="export-exp-csv">
          <Icon name="file-delimited-outline" size={16} color={C.brand} />
          <Text style={s.secondaryText}>Expenses CSV</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={() => doExport(`purchases?start=${start}&end=${end}`, `aft_purchases_${start}_${end}.csv`)} testID="export-pur-csv">
          <Icon name="file-delimited-outline" size={16} color={C.brand} />
          <Text style={s.secondaryText}>Purchases CSV</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={() => doExport(`report/pdf?start=${start}&end=${end}`, `aft_report_${start}_${end}.pdf`)} testID="export-pdf">
          <Icon name="file-pdf-box" size={16} color={C.brand} />
          <Text style={s.secondaryText}>Report PDF</Text>
        </Pressable>
      </View>

      {busy && <Text style={s.muted}>Loading…</Text>}

      {r && (
        <>
          <View style={s.grid}>
            <View style={s.metric}><Text style={s.metricLabel}>NET SALES</Text><Text style={s.metricValue}>{money(r.sales)}</Text><Text style={s.metricSub}>Gross {money(r.gross)}</Text></View>
            <View style={s.metric}><Text style={s.metricLabel}>PROFIT</Text><Text style={s.metricValue}>{money(r.profit)}</Text></View>
            <View style={s.metric}><Text style={s.metricLabel}>EXPENSES</Text><Text style={s.metricValue}>{money(r.expenses)}</Text><Text style={s.metricSub}>Raw {money(r.raw)}</Text></View>
            <View style={s.metric}><Text style={s.metricLabel}>DISCOUNT</Text><Text style={s.metricValue}>{money(r.discount)}</Text></View>
            <View style={s.metric}><Text style={s.metricLabel}>TIPS</Text><Text style={s.metricValue}>{money(r.tips)}</Text></View>
            <View style={s.metric}><Text style={s.metricLabel}>ORDERS</Text><Text style={s.metricValue}>{r.orders}</Text></View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Sales split</Text>
            <View style={s.split}><Text style={s.muted}>Dine-in</Text><Text style={s.text}>{money(r.dine_in)}</Text></View>
            <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Home delivery</Text><Text style={s.text}>{money(r.delivery)}</Text></View>
            <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Cash</Text><Text style={s.text}>{money(r.cash)}</Text></View>
            <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>UPI</Text><Text style={s.text}>{money(r.upi)}</Text></View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Portion breakdown</Text>
            <View style={s.split}><Text style={s.muted}>Half plates</Text><Text style={s.text}>{r.portion_qty?.Half || 0}</Text></View>
            <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Full plates</Text><Text style={s.text}>{r.portion_qty?.Full || 0}</Text></View>
            <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Single / other</Text><Text style={s.text}>{r.portion_qty?.Single || 0}</Text></View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Averages & extremes</Text>
            <View style={s.split}><Text style={s.muted}>Avg daily sales</Text><Text style={s.text}>{money(r.avg_sales)}</Text></View>
            <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Avg daily profit</Text><Text style={s.text}>{money(r.avg_profit)}</Text></View>
            {r.best_day && <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Best day</Text><Text style={s.text}>{r.best_day.date} — {money(r.best_day.sales)}</Text></View>}
            {r.worst_day && <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Lowest day</Text><Text style={s.text}>{r.worst_day.date} — {money(r.worst_day.sales)}</Text></View>}
          </View>

          {r.top_items?.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Top selling items</Text>
              {r.top_items.map((it: any) => (
                <View key={it.item} style={[s.split, { paddingVertical: 6 }]}>
                  <Text style={s.text}>{it.item}</Text>
                  <Text style={s.muted}>{it.qty} sold</Text>
                </View>
              ))}
            </View>
          )}

          {r.days?.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Day-by-day</Text>
              {r.days.map((d: any) => (
                <View key={d.date} style={[s.split, { paddingVertical: 6, borderBottomColor: C.border, borderBottomWidth: 1 }]}>
                  <Text style={s.text}>{d.date}</Text>
                  <Text style={s.muted}>{money(d.sales)} · profit {money(d.profit)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
