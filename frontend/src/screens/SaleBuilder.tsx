import React, { useMemo, useState } from "react";
import { Modal, ScrollView, Text, View, Pressable, TextInput, Platform } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money, today as todayFn } from "@/src/theme";
import { s, Chip } from "@/src/screens/ui";
import { api } from "@/src/api";

type CartItem = { item: string; portion: string; quantity: number; price: number };

export function SaleBuilder({ menu, onClose, onSaved, onError }: any) {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const [option, setOption] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [payment, setPayment] = useState("Cash");
  const [tips, setTips] = useState(0);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const cats = useMemo(() => ["All", ...Array.from(new Set(menu.map((m: any) => m.category)))], [menu]);

  const choose = (m: any) => {
    setSelected(m);
    setOption(m.options[0]);
    setQty(1);
  };

  const addToCart = () => {
    if (!selected || !option) return;
    setItems([
      ...items,
      {
        item: selected.name,
        portion: option.name,
        quantity: qty,
        price: option.price,
      },
    ]);
    setSelected(null);
    setOption(null);
    setQty(1);
  };

  const removeFromCart = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const discountValueNum = Number(discountValue) || 0;
  const discountAmount = useMemo(() => {
    if (discountType === "percent") return Math.round((subtotal * Math.max(0, Math.min(100, discountValueNum))) / 100 * 100) / 100;
    if (discountType === "fixed") return Math.min(subtotal, Math.max(0, discountValueNum));
    return 0;
  }, [discountType, discountValueNum, subtotal]);
  const netSales = subtotal - discountAmount;
  const deliveryChargeNum = Number(deliveryCharge) || 0;
  const grandTotal = netSales + tips + (orderType === "Home Delivery" ? deliveryChargeNum : 0);

  const save = async () => {
    if (!items.length) { onError("Add an item first"); return; }
    setSaving(true);
    try {
      await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          date: todayFn(),
          time: new Date().toTimeString().slice(0, 5),
          order_type: orderType,
          items,
          tips,
          payment,
          customer: orderType === "Home Delivery" ? { name: customerName, phone: customerPhone, address: customerAddress } : {},
          delivery_charge: orderType === "Home Delivery" ? deliveryChargeNum : 0,
          discount_type: discountType,
          discount_value: discountValueNum,
        }),
      });
      onSaved();
    } catch (e: any) {
      onError(e.message || "Could not save order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.saleSheet}>
          <View style={s.sheetHead}>
            <View>
              <Text style={s.h2}>New order</Text>
              <Text style={s.muted}>Tap to build — no typing required</Text>
            </View>
            <Pressable onPress={onClose} testID="close-sale-btn">
              <Icon name="close" size={26} color={C.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.step}>1 · CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ height: 56 }}>
              {cats.map((c: string) => (
                <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} testID={`cat-${c}`} />
              ))}
            </ScrollView>

            <Text style={s.step}>2 · ITEM {selected ? "· tap again to change" : ""}</Text>
            <View style={s.itemGrid}>
              {(selected
                ? [selected]
                : menu.filter((m: any) => m.active && (category === "All" || m.category === category))
              ).map((m: any) => {
                const isSelected = selected?.item_id === m.item_id;
                return (
                  <Pressable
                    key={m.item_id}
                    style={[s.itemCard, isSelected && s.itemCardSelected, isSelected && { width: "100%" }]}
                    onPress={() => {
                      if (isSelected) {
                        setSelected(null);
                        setOption(null);
                        setQty(1);
                      } else {
                        choose(m);
                      }
                    }}
                    testID={`item-${m.name}`}
                  >
                    <Text style={s.itemName}>{m.name}</Text>
                    <Text style={s.mutedSm}>{m.variant}</Text>
                    <Text style={[s.option, { marginTop: 6 }]}>
                      {m.options.map((o: any) => `${o.name} ${money(o.price)}`).join(" · ")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selected && (
              <View style={s.selector} testID="item-selector">
                <Text style={s.selectorTitle}>{selected.name}</Text>
                <Text style={s.mutedSm}>{selected.category} · {selected.variant}</Text>

                <Text style={s.step}>VARIATION / PORTION</Text>
                <View style={s.optionRow}>
                  {selected.options.map((o: any) => (
                    <Pressable
                      key={o.name}
                      style={[s.optionChip, option?.name === o.name && s.chipActive]}
                      onPress={() => setOption(o)}
                      testID={`portion-${o.name}`}
                    >
                      <Text style={[s.chipText, option?.name === o.name && s.chipTextActive]}>
                        {o.name} {money(o.price)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.price}>{money(option?.price || 0)} each</Text>

                <Text style={s.step}>QUANTITY</Text>
                <View style={s.qtyRow}>
                  <Pressable style={s.counterBtn} onPress={() => setQty(Math.max(1, qty - 1))} accessibilityLabel="decrease quantity" testID="qty-dec">
                    <Text style={s.counterText}>−</Text>
                  </Pressable>
                  <Text style={s.qty} testID="qty-display">{qty}</Text>
                  <Pressable style={s.counterBtn} onPress={() => setQty(qty + 1)} accessibilityLabel="increase quantity" testID="qty-inc">
                    <Text style={s.counterText}>＋</Text>
                  </Pressable>
                </View>

                <Pressable style={s.save} onPress={addToCart} testID="add-to-cart-btn">
                  <Text style={s.primaryText}>+ ADD TO ORDER · {money((option?.price || 0) * qty)}</Text>
                </Pressable>
              </View>
            )}

            <Text style={s.step}>3 · ORDER · {items.length} ITEMS</Text>
            {items.length === 0 ? (
              <Text style={s.muted}>Cart is empty — pick an item above.</Text>
            ) : (
              items.map((i, idx) => (
                <View style={s.summaryRow} key={`${i.item}-${idx}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.text}>{i.item}</Text>
                    <Text style={s.muted}>{i.portion} × {i.quantity}</Text>
                  </View>
                  <Text style={s.amount}>{money(i.price * i.quantity)}</Text>
                  <Pressable onPress={() => removeFromCart(idx)} testID={`remove-${idx}`} hitSlop={8}>
                    <Icon name="delete-outline" size={20} color={C.red} />
                  </Pressable>
                </View>
              ))
            )}
            {items.length > 0 && <Text style={s.subtotal}>Subtotal {money(subtotal)}</Text>}

            <Text style={s.step}>4 · ORDER TYPE</Text>
            <View style={s.optionRow}>
              {["Dine-in", "Home Delivery"].map((x) => (
                <Pressable key={x} style={[s.typeBtn, orderType === x && s.chipActive]} onPress={() => setOrderType(x)} testID={`type-${x}`}>
                  <Icon name={x === "Dine-in" ? "table-furniture" : "moped"} size={18} color={orderType === x ? "#fff" : C.brand} />
                  <Text style={[s.chipText, orderType === x && s.chipTextActive]}>{x}</Text>
                </Pressable>
              ))}
            </View>

            {orderType === "Home Delivery" && (
              <View style={{ marginTop: 8 }}>
                <TextInput style={s.input} placeholder="Customer name (optional)" placeholderTextColor={C.muted} value={customerName} onChangeText={setCustomerName} testID="cust-name" />
                <TextInput style={s.input} placeholder="Phone (optional)" placeholderTextColor={C.muted} keyboardType="phone-pad" value={customerPhone} onChangeText={setCustomerPhone} testID="cust-phone" />
                <TextInput style={s.input} placeholder="Address (optional)" placeholderTextColor={C.muted} value={customerAddress} onChangeText={setCustomerAddress} testID="cust-addr" />
                <TextInput style={s.input} placeholder="Delivery charge ₹ (optional)" placeholderTextColor={C.muted} keyboardType="numeric" value={deliveryCharge} onChangeText={setDeliveryCharge} testID="del-charge" />
              </View>
            )}

            <Text style={s.step}>5 · PAYMENT</Text>
            <View style={s.optionRow}>
              {["Cash", "UPI", "Other"].map((x) => (
                <Pressable key={x} style={[s.typeBtn, payment === x && s.chipActive]} onPress={() => setPayment(x)} testID={`pay-${x}`}>
                  <Text style={[s.chipText, payment === x && s.chipTextActive]}>{x}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.step}>6 · BILL DISCOUNT (on subtotal)</Text>
            <View style={s.optionRow}>
              {[
                { k: "none", label: "No discount" },
                { k: "percent", label: "% off" },
                { k: "fixed", label: "₹ off" },
              ].map((d) => (
                <Pressable
                  key={d.k}
                  style={[s.typeBtn, discountType === d.k && s.chipActive]}
                  onPress={() => { setDiscountType(d.k as any); setDiscountValue(""); }}
                  testID={`disc-${d.k}`}
                >
                  <Text style={[s.chipText, discountType === d.k && s.chipTextActive]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
            {discountType !== "none" && (
              <>
                <View style={{ marginTop: 10, flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    placeholder={discountType === "percent" ? "Discount % (0-100)" : "Discount amount ₹"}
                    placeholderTextColor={C.muted}
                    keyboardType="numeric"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    testID="discount-value"
                  />
                  <View style={s.optionRow}>
                    {(discountType === "percent" ? [5, 10, 15, 20] : [10, 20, 50, 100]).map((n) => (
                      <Pressable key={n} style={[s.tipBtn, discountValueNum === n && s.chipActive]} onPress={() => setDiscountValue(String(n))} testID={`disc-quick-${n}`}>
                        <Text style={[s.chipText, discountValueNum === n && s.chipTextActive]}>
                          {discountType === "percent" ? `${n}%` : `₹${n}`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={s.discountRow}>
                  <Text style={s.muted}>Discount applied</Text>
                  <Text style={s.discountText}>− {money(discountAmount)}</Text>
                </View>
              </>
            )}

            <Text style={s.step}>7 · TIPS (excluded from profit)</Text>
            <View style={s.optionRow}>
              {[0, 10, 20, 30, 50, 100].map((n) => (
                <Pressable key={n} style={[s.tipBtn, tips === n && s.chipActive]} onPress={() => setTips(n)} testID={`tip-${n}`}>
                  <Text style={[s.chipText, tips === n && s.chipTextActive]}>₹{n}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[s.card, { marginTop: 16 }]}>
              <View style={s.split}><Text style={s.muted}>Subtotal</Text><Text style={s.text}>{money(subtotal)}</Text></View>
              {discountAmount > 0 && (
                <View style={[s.split, { marginTop: 6 }]}>
                  <Text style={s.muted}>Bill discount</Text>
                  <Text style={s.discountText}>− {money(discountAmount)}</Text>
                </View>
              )}
              <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Final bill</Text><Text style={s.text}>{money(netSales)}</Text></View>
              {tips > 0 && <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Tips</Text><Text style={s.text}>{money(tips)}</Text></View>}
              {orderType === "Home Delivery" && deliveryChargeNum > 0 && (
                <View style={[s.split, { marginTop: 6 }]}><Text style={s.muted}>Delivery charge</Text><Text style={s.text}>{money(deliveryChargeNum)}</Text></View>
              )}
              <Text style={s.finalTotal}>Collect {money(grandTotal)}</Text>
            </View>

            <Pressable
              style={[s.save, (!items.length || saving) && { opacity: 0.5 }]}
              onPress={save}
              disabled={!items.length || saving}
              testID="save-order-btn"
            >
              <Text style={s.primaryText}>{saving ? "SAVING…" : `SAVE ORDER · ${money(grandTotal)}`}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
