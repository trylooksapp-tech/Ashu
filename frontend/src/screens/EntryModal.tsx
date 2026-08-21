import React, { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { C, today as todayFn } from "@/src/theme";
import { s, TextField } from "@/src/screens/ui";
import { api } from "@/src/api";

export function EntryModal({ type, settings, onClose, onSaved, onError }: any) {
  const [form, setForm] = useState<any>({ date: todayFn() });
  useEffect(() => { setForm({ date: todayFn() }); }, [type]);
  if (!type) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const pickReceipt = async () => {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) await ImagePicker.requestMediaLibraryPermissionsAsync();
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] as any, base64: true, quality: 0.5 });
    if (!r.canceled) set("receipt", `data:image/jpeg;base64,${r.assets[0].base64 || ""}`);
  };

  const save = async () => {
    try {
      if (type === "purchase") {
        if (!form.item) return onError("Item name is required");
        if (!form.quantity || Number(form.quantity) <= 0) return onError("Quantity must be greater than 0");
        if (!form.unit) return onError("Unit is required");
        if (form.price === undefined || Number(form.price) < 0) return onError("Price must be zero or more");
        await api("/purchases", { method: "POST", body: JSON.stringify({ ...form, quantity: +form.quantity, price: +form.price }) });
      }
      if (type === "usage") {
        if (!form.item) return onError("Item name is required");
        if (!form.quantity || Number(form.quantity) <= 0) return onError("Quantity must be greater than 0");
        await api("/usage", { method: "POST", body: JSON.stringify({ ...form, quantity: +form.quantity }) });
      }
      if (type === "expense") {
        if (!form.description) return onError("Description is required");
        if (form.amount === undefined || Number(form.amount) <= 0) return onError("Amount must be greater than 0");
        await api("/expenses", { method: "POST", body: JSON.stringify({ ...form, amount: +form.amount }) });
      }
      if (type === "item") {
        if (!form.name || !form.category) return onError("Name and category are required");
        const options = [];
        if (form.enable_half && form.half_price !== undefined) options.push({ name: "Half", price: +form.half_price });
        if (form.enable_full && form.full_price !== undefined) options.push({ name: "Full", price: +form.full_price });
        if (form.enable_single && form.single_price !== undefined) options.push({ name: form.single_label || "Single", price: +form.single_price });
        if (!options.length) return onError("Enable at least one portion (Half / Full / Single)");
        await api("/menu", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            category: form.category,
            variant: form.variant || "Regular",
            options,
            quality_required: !!form.quality_required,
          }),
        });
      }
      onSaved();
    } catch (e: any) { onError(e.message || "Could not save record"); }
  };

  const cats = settings?.expense_categories || [];
  const rawCats = settings?.raw_categories || [];
  const units = settings?.units || [];
  const menuCats = settings?.menu_categories || [];
  const payments = settings?.payment_methods || ["Cash", "UPI", "Other"];

  const pill = (label: string, active: boolean, onPress: () => void, key?: string) => (
    <Pressable key={key || label} style={[s.typeBtn, active && s.chipActive]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.h2}>{type === "purchase" ? "Stock purchase" : type === "usage" ? "Stock usage" : type === "expense" ? "Other expense" : "New menu item"}</Text>
            <Pressable onPress={onClose} testID="close-entry">
              <Icon name="close" size={24} color={C.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TextField value={form.date} onChangeText={(v: string) => set("date", v)} placeholder="Date YYYY-MM-DD" testID="ent-date" />

            {type === "purchase" && (
              <>
                <TextField value={form.item} onChangeText={(v: string) => set("item", v)} placeholder="Material name (e.g., Paneer)" testID="ent-item" />
                {rawCats.length > 0 && (
                  <>
                    <Text style={s.step}>CATEGORY</Text>
                    <View style={s.optionRow}>{rawCats.map((c: string) => pill(c, form.category === c, () => set("category", c), c))}</View>
                  </>
                )}
                <TextField value={form.quality} onChangeText={(v: string) => set("quality", v)} placeholder="Quality / brand (optional)" />
                <TextField value={form.quantity} onChangeText={(v: string) => set("quantity", v)} placeholder="Quantity" keyboardType="numeric" testID="ent-qty" />
                <Text style={s.step}>UNIT</Text>
                <View style={s.optionRow}>{units.map((u: string) => pill(u, form.unit === u, () => set("unit", u), u))}</View>
                <TextField value={form.price} onChangeText={(v: string) => set("price", v)} placeholder="Price per unit ₹" keyboardType="numeric" testID="ent-price" />
                <TextField value={form.supplier} onChangeText={(v: string) => set("supplier", v)} placeholder="Supplier (optional)" />
                <TextField value={form.note} onChangeText={(v: string) => set("note", v)} placeholder="Note (optional)" />
              </>
            )}

            {type === "usage" && (
              <>
                <TextField value={form.item} onChangeText={(v: string) => set("item", v)} placeholder="Material name (matches purchases)" testID="ent-item" />
                <TextField value={form.quantity} onChangeText={(v: string) => set("quantity", v)} placeholder="Used quantity" keyboardType="numeric" testID="ent-qty" />
                <Text style={s.step}>UNIT (optional)</Text>
                <View style={s.optionRow}>{units.map((u: string) => pill(u, form.unit === u, () => set("unit", u), u))}</View>
                <TextField value={form.note} onChangeText={(v: string) => set("note", v)} placeholder="Note (optional)" />
              </>
            )}

            {type === "expense" && (
              <>
                <TextField value={form.description} onChangeText={(v: string) => set("description", v)} placeholder="Description" testID="ent-desc" />
                <Text style={s.step}>CATEGORY</Text>
                <View style={s.optionRow}>{cats.map((c: string) => pill(c, form.category === c, () => set("category", c), c))}</View>
                <TextField value={form.quantity} onChangeText={(v: string) => set("quantity", v)} placeholder="Quantity (optional)" keyboardType="numeric" />
                <TextField value={form.amount} onChangeText={(v: string) => set("amount", v)} placeholder="Amount ₹" keyboardType="numeric" testID="ent-amount" />
                <Text style={s.step}>PAYMENT</Text>
                <View style={s.optionRow}>{payments.map((p: string) => pill(p, form.payment === p, () => set("payment", p), p))}</View>
                <TextField value={form.note} onChangeText={(v: string) => set("note", v)} placeholder="Note (optional)" />
                <Pressable style={s.secondaryBtn} onPress={pickReceipt} testID="attach-receipt">
                  <Icon name="camera-outline" size={18} color={C.brand} />
                  <Text style={s.secondaryText}>{form.receipt ? "Receipt attached ✓" : "Attach receipt photo"}</Text>
                </Pressable>
              </>
            )}

            {type === "item" && (
              <>
                <TextField value={form.name} onChangeText={(v: string) => set("name", v)} placeholder="Item name" testID="ent-name" />
                <Text style={s.step}>CATEGORY</Text>
                <View style={s.optionRow}>
                  {menuCats.map((c: string) => pill(c, form.category === c, () => set("category", c), c))}
                </View>
                <TextField value={form.variant} onChangeText={(v: string) => set("variant", v)} placeholder="Variant / quality (e.g., Paneer, Veg)" />
                <Text style={s.step}>PORTIONS AVAILABLE</Text>
                <View style={s.optionRow}>
                  {pill("Half plate", !!form.enable_half, () => set("enable_half", !form.enable_half))}
                  {pill("Full plate", !!form.enable_full, () => set("enable_full", !form.enable_full))}
                  {pill("Single / Other", !!form.enable_single, () => set("enable_single", !form.enable_single))}
                </View>
                {form.enable_half && <TextField value={form.half_price} onChangeText={(v: string) => set("half_price", v)} placeholder="Half plate price ₹" keyboardType="numeric" />}
                {form.enable_full && <TextField value={form.full_price} onChangeText={(v: string) => set("full_price", v)} placeholder="Full plate price ₹" keyboardType="numeric" />}
                {form.enable_single && (
                  <>
                    <TextField value={form.single_label} onChangeText={(v: string) => set("single_label", v)} placeholder="Option name (e.g., '8 pieces', 'Single')" />
                    <TextField value={form.single_price} onChangeText={(v: string) => set("single_price", v)} placeholder="Option price ₹" keyboardType="numeric" />
                  </>
                )}
                <Text style={s.step}>QUALITY REQUIRED?</Text>
                <View style={s.optionRow}>
                  {pill("No", !form.quality_required, () => set("quality_required", false))}
                  {pill("Yes (1-10 scale)", !!form.quality_required, () => set("quality_required", true))}
                </View>
              </>
            )}

            <Pressable style={s.save} onPress={save} testID="save-entry">
              <Text style={s.primaryText}>Save record</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
