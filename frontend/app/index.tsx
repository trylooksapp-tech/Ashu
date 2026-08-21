import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { s } from "@/src/screens/ui";
import { Dashboard } from "@/src/screens/Dashboard";
import { Sales } from "@/src/screens/Sales";
import { SaleBuilder } from "@/src/screens/SaleBuilder";
import { RawMaterial } from "@/src/screens/RawMaterial";
import { Expenses } from "@/src/screens/Expenses";
import { Reports } from "@/src/screens/Reports";
import { Items } from "@/src/screens/Items";
import { Settings } from "@/src/screens/Settings";
import { EntryModal } from "@/src/screens/EntryModal";

type Tab = "Dashboard" | "Sales" | "Stock" | "Expenses" | "Reports" | "Items" | "Settings";

const NAV: { n: Tab; i: any }[] = [
  { n: "Dashboard", i: "view-dashboard-outline" },
  { n: "Sales", i: "receipt-text-outline" },
  { n: "Stock", i: "package-variant-closed" },
  { n: "Expenses", i: "cash-minus" },
  { n: "Reports", i: "chart-line" },
  { n: "Items", i: "silverware-fork-knife" },
  { n: "Settings", i: "cog-outline" },
];

function Toast({ msg, onClose }: any) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  return (
    <View style={{ position: "absolute", bottom: 90, left: 20, right: 20, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.brand, flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Icon name="information-outline" size={18} color={C.brand} />
      <Text style={{ color: C.text, flex: 1 }}>{msg}</Text>
    </View>
  );
}

export default function Index() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [dash, setDash] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = new Date().toISOString().slice(0, 10);
      const [d, m, o, p, e, st] = await Promise.all([
        api(`/dashboard?date=${t}`),
        api("/menu"),
        api("/orders"),
        api("/purchases"),
        api("/expenses"),
        api("/settings"),
      ]);
      setDash(d); setMenu(m); setOrders(o); setPurchases(p); setExpenses(e); setSettings(st);
    } catch (e: any) {
      setToast(e.message || "Sync failed");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = (kind: string) => setModal(kind);

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>{settings?.restaurant_name?.startsWith("AFT") ? "AFT" : (settings?.restaurant_name || "AFT")}
            <Text style={s.brandLight}>  ·  {settings?.restaurant_name?.replace(/^AFT\s*-?\s*/, "") || "Apna Flavour Town"}</Text>
          </Text>
          <Text style={s.tagline}>{settings?.tagline || "स्वाद की नई दुनिया"}</Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => setTab("Settings")} testID="header-settings">
          {user.picture ? (
            <Icon name="account-circle-outline" size={22} color={C.brand} />
          ) : (
            <Icon name="account-circle-outline" size={22} color={C.brand} />
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.brand} size="large" />
          <Text style={s.muted}>Loading your books…</Text>
        </View>
      ) : (
        <>
          <View style={s.content}>
            {tab === "Dashboard" && <Dashboard d={dash} onAdd={onAdd} userName={user.name} />}
            {tab === "Sales" && <Sales orders={orders} menu={menu} onAdd={() => setModal("sale")} onRefresh={load} onError={setToast} />}
            {tab === "Stock" && <RawMaterial purchases={purchases} onAdd={() => setModal("purchase")} onUsage={() => setModal("usage")} onRefresh={load} onError={setToast} />}
            {tab === "Expenses" && <Expenses data={expenses} onAdd={() => setModal("expense")} onRefresh={load} onError={setToast} />}
            {tab === "Reports" && <Reports onError={setToast} />}
            {tab === "Items" && <Items menu={menu} onAdd={() => setModal("item")} onRefresh={load} onError={setToast} />}
            {tab === "Settings" && <Settings onError={setToast} onRefresh={load} />}
          </View>

          <View style={s.nav}>
            {NAV.map((x) => (
              <Pressable
                key={x.n}
                style={s.navItem}
                onPress={() => setTab(x.n)}
                testID={`nav-${x.n.toLowerCase()}`}
              >
                <Icon name={x.i} size={20} color={tab === x.n ? C.brand : C.muted} />
                <Text style={[s.navText, tab === x.n && { color: C.brand }]}>{x.n}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {modal === "sale" ? (
        <SaleBuilder
          menu={menu}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); setToast("Order saved"); }}
          onError={setToast}
        />
      ) : (
        <EntryModal
          type={modal}
          settings={settings}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); setToast("Saved successfully"); }}
          onError={setToast}
        />
      )}

      <Toast msg={toast} onClose={() => setToast(null)} />
    </SafeAreaView>
  );
}
