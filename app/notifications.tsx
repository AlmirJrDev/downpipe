import React from "react";
import { Pressable, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { voltarOuIrPara } from "@/utils/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ListaDeNotificacoes } from "@/components/ListaDeNotificacoes";
import { colors } from "@/constants/theme";

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Notificações"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)")}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ListaDeNotificacoes />
    </View>
  );
}
