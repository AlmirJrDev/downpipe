/**
 * O menu lateral do computador, no lugar da barra de abas.
 *
 * É o que faz o Downpipe no monitor parecer um app de computador, e não um
 * celular no meio da tela — o mesmo papel do menu da esquerda do Instagram
 * web. Vale em toda tela de quem está logado, não só nas abas: abrir um
 * perfil ou um rolê não pode fazer o menu sumir.
 */
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarCheck,
  Compass,
  Flag,
  Home,
  SquarePlus,
  User,
  Warehouse,
  type LucideIcon,
} from "lucide-react-native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadCount } from "@/stores/notificationsStore";
import { apiService } from "@/services/apiService";
import { LARGURA_DO_MENU } from "@/hooks/useDesktop";
import { colors } from "@/constants/theme";

interface Item {
  rotulo: string;
  Icone: LucideIcon;
  destino: string;
  /** Caminhos em que o item aparece aceso. */
  ativoEm: (caminho: string) => boolean;
  contador?: number;
  /** Abre por cima (formulário), em vez de trocar a tela. */
  empilhar?: boolean;
}

function Linha({ item, ativo }: { item: Item; ativo: boolean }) {
  const { Icone } = item;
  return (
    <Pressable
      onPress={() => (item.empilhar ? router.push(item.destino as never) : router.navigate(item.destino as never))}
      accessibilityRole="link"
      accessibilityState={{ selected: ativo }}
      // O react-native-web entrega "hovered" pro estilo; o tipo do RN não
      // conhece, daí o cast.
      style={(estado) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 11,
        paddingHorizontal: 12,
        backgroundColor: (estado as unknown as { hovered?: boolean }).hovered
          ? colors.surfaceContainer
          : "transparent",
      })}
    >
      <View>
        <Icone size={24} color={ativo ? colors.primary : colors.onSurface} strokeWidth={ativo ? 2.4 : 1.8} />
        {!!item.contador && (
          <View
            style={{
              position: "absolute",
              top: -5,
              right: -8,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              paddingHorizontal: 4,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {item.contador > 99 ? "99+" : item.contador}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          color: colors.onSurface,
          fontSize: 15,
          fontWeight: ativo ? "700" : "400",
        }}
      >
        {item.rotulo}
      </Text>
    </Pressable>
  );
}

export function MenuLateral() {
  const caminho = usePathname();
  const { data: me } = useCurrentUser();
  const { data: naoLidas } = useUnreadCount();
  const admin = !!me?.isAdmin;

  // Mesmas chaves do menu do perfil: o número vem do mesmo cache.
  const { data: denuncias } = useQuery({
    queryKey: ["denuncias-abertas"],
    queryFn: () => apiService.contarDenunciasAbertas(),
    enabled: admin,
    staleTime: 60_000,
  });
  const { data: fila } = useQuery({
    queryKey: ["roles-na-fila-count"],
    queryFn: () => apiService.contarRolesNaFila(),
    enabled: admin,
    staleTime: 60_000,
  });

  const principais: Item[] = [
    { rotulo: "Início", Icone: Home, destino: "/(tabs)", ativoEm: (c) => c === "/" },
    { rotulo: "Explorar", Icone: Compass, destino: "/(tabs)/explore", ativoEm: (c) => c.startsWith("/explore") },
    { rotulo: "Garagem", Icone: Warehouse, destino: "/(tabs)/garage", ativoEm: (c) => c.startsWith("/garage") },
    {
      rotulo: "Notificações",
      Icone: Bell,
      destino: "/notifications",
      ativoEm: (c) => c.startsWith("/notifications"),
      contador: typeof naoLidas === "number" ? naoLidas : undefined,
    },
    { rotulo: "Criar", Icone: SquarePlus, destino: "/add-action", ativoEm: () => false, empilhar: true },
    { rotulo: "Perfil", Icone: User, destino: "/(tabs)/profile", ativoEm: (c) => c.startsWith("/profile") },
  ];

  const deAdmin: Item[] = admin
    ? [
        { rotulo: "Moderação", Icone: Flag, destino: "/moderacao", ativoEm: (c) => c.startsWith("/moderacao"), contador: denuncias },
        {
          rotulo: "Rolês na fila",
          Icone: CalendarCheck,
          destino: "/fila-de-roles",
          ativoEm: (c) => c.startsWith("/fila-de-roles"),
          contador: fila,
        },
      ]
    : [];

  return (
    <View
      style={{
        width: LARGURA_DO_MENU,
        height: "100%",
        paddingTop: 28,
        paddingHorizontal: 12,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        backgroundColor: colors.surfaceLowest,
      }}
    >
      <Pressable onPress={() => router.navigate("/(tabs)" as never)} style={{ paddingHorizontal: 12, marginBottom: 30 }}>
        {/* A logo da landing: no computador o menu é a primeira coisa que
            se lê, e ali ela identifica o app como no site. */}
        <Image
          source={{ uri: Platform.OS === "web" ? "/logo-lp.png" : undefined }}
          style={{ width: 120, height: 20 }}
          contentFit="contain"
          accessibilityLabel="Downpipe"
        />
      </Pressable>

      <View style={{ gap: 2 }}>
        {principais.map((item) => (
          <Linha key={item.rotulo} item={item} ativo={item.ativoEm(caminho)} />
        ))}
      </View>

      {deAdmin.length > 0 && (
        <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.4,
              paddingHorizontal: 12,
              marginBottom: 6,
            }}
          >
            ADMIN
          </Text>
          {deAdmin.map((item) => (
            <Linha key={item.rotulo} item={item} ativo={item.ativoEm(caminho)} />
          ))}
        </View>
      )}
    </View>
  );
}
