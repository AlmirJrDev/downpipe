import React from "react";
import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { colors } from "@/constants/theme";

/**
 * Os dois convites (instalar e ativar notificação) moram aqui, e não na raiz.
 *
 * Eles são cartões fixos no rodapé, posicionados logo acima da barra de abas.
 * Montados na raiz, apareciam em qualquer tela — inclusive nas de formulário,
 * que não têm barra de abas — e flutuavam por cima do conteúdo. Na tela de
 * excluir conta chegaram a cobrir o próprio botão. Aqui dentro só existem
 * enquanto uma aba está aberta, que é exatamente onde o rodapé sobra.
 */
export default function TabsLayout() {
  return (
    <>
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
      {/* Só na web: no celular os dois não desenham nada. */}
      <InstallPrompt />
      <NotificationPrompt />
    </>
  );
}
