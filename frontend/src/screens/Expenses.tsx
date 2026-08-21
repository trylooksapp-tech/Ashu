import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { C, money } from "@/src/theme";
import { s, Title, Empty } from "@/src/screens/ui";
import { api } from "@/src/api";

export function Expenses({ data, onAdd, onRefresh, onError }: any) {
  const del = async (rid: string) => {
    try { await api(`/expenses/${rid}`, { method: "DELETE" }); onRefresh(); }
    catch (e: any) { onError(e.message); }
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollPad}>
      <Title title="Other expenses" sub="Non-food costs stay visible" action="Add expense" onAction={onAdd} actionTestID="add-expense-btn" />
      {data.length === 0 ? (
        <Empty label="No other expenses recorded" icon="cash-minus" />
      ) : (
        data.map((e: any) => (
          <View style={s.row} key={e.record_id}>
            <View style={s.rowIcon}><Icon name="cash-minus" size={20} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{e.description}</Text>
              <Text style={s.muted}>{e.category} · {e.date} · {e.payment}</Text>
              {e.receipt ? (
                <View style={{ marginTop: 6 }}>
                  <Image source={{ uri: e.receipt }} style={{ width: 90, height: 60, borderRadius: 6 }} />
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.amount}>{money(e.amount)}</Text>
              <Pressable onPress={() => del(e.record_id)} hitSlop={8} testID={`del-${e.record_id}`}>
                <Icon name="delete-outline" size={18} color={C.red} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
