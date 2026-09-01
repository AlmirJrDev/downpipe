import React from "react";
import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { colors } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Redundante com o tema escuro da raiz, de propósito: é o fundo que
        // aparece durante o mount da aba e no overscroll.
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explorar" }} />
      <Tabs.Screen name="garage" options={{ title: "Garagem" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
