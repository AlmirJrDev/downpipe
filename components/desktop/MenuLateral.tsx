/**
 * O menu lateral do computador, no lugar da barra de abas.
 *
 * É o que faz o Downpipe no monitor parecer um app de computador, e não um
 * celular no meio da tela — o mesmo papel do menu da esquerda do Instagram
 * web. Vale em toda tela de quem está logado, não só nas abas: abrir um
 * perfil ou um rolê não pode fazer o menu sumir.
 *
 * Quem está de visita tem o seu: os jogos (que é o que mais traz gente de
 * fora) e o convite pra entrar, no lugar da barra do rodapé do celular.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarCheck,
  ChartColumn,
  Gamepad2,
  Compass,
  Flag,
  Home,
  TrendingUp,
  Wrench,
  MessageSquareText,
  SquarePlus,
  User,
  Warehouse,
  type LucideIcon,
} from "lucide-react-native";
import { Logo } from "@/components/Logo";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/authStore";
import { caminhoAberto, guardarDestino } from "@/utils/visitante";
import { useUnreadCount } from "@/stores/notificationsStore";
import { apiService } from "@/services/apiService";
import { LARGURA_DO_MENU, useLayoutStore } from "@/hooks/useDesktop";
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
  /** Em vez de navegar, faz isto (o sino abre o painel ao lado). */
  acao?: () => void;
}

function Linha({ item, ativo }: { item: Item; ativo: boolean }) {
  const { Icone } = item;
  return (
    <Pressable
      onPress={() => {
        if (item.acao) return item.acao();
        // Ir pra qualquer lado pelo menu fecha o painel de notificações.
        useLayoutStore.getState().setNotificacoesAbertas(false);
        if (item.empilhar) router.push(item.destino as never);
        else router.navigate(item.destino as never);
      }}
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
  const logado = useAuthStore((s) => s.status === "signedIn");
  return logado ? <MenuDeQuemEntrou /> : <MenuDeVisitante />;
}

const JOGOS_DO_MENU: Item[] = [
  { rotulo: "Nave do Dia", Icone: Gamepad2, destino: "/nave-do-dia", ativoEm: (c) => c === "/nave-do-dia" },
  { rotulo: "Nave do Dia Brasil", Icone: Flag, destino: "/nave-do-dia-brasil", ativoEm: (c) => c.startsWith("/nave-do-dia-brasil") },
  { rotulo: "Frankenstein", Icone: Wrench, destino: "/frankenstein", ativoEm: (c) => c.startsWith("/frankenstein") },
  { rotulo: "Mais Caro ou Mais Barato?", Icone: TrendingUp, destino: "/mais-caro", ativoEm: (c) => c.startsWith("/mais-caro") },
];

function MenuDeVisitante() {
  const caminho = usePathname();
  const entrar = (para: "/login" | "/register") => {
    // Depois de entrar, volta pro que estava vendo.
    guardarDestino(caminhoAberto());
    router.push(para);
  };

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
      {/* Sem conta não há feed: o logo leva pra página de apresentação. */}
      <Pressable
        onPress={() => {
          if (typeof window !== "undefined") window.location.href = "/";
        }}
        style={{ paddingHorizontal: 12, marginBottom: 30 }}
        accessibilityRole="link"
        accessibilityLabel="Downpipe, página inicial"
      >
        <Logo height={20} />
      </Pressable>

      <Text
        style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.4, paddingHorizontal: 12, marginBottom: 6 }}
      >
        JOGOS
      </Text>
      <View style={{ gap: 2 }}>
        {JOGOS_DO_MENU.map((item) => (
          <Linha key={item.rotulo} item={item} ativo={item.ativoEm(caminho)} />
        ))}
        <Linha
          item={{ rotulo: "Todos os jogos", Icone: Compass, destino: "/jogos", ativoEm: (c) => c.startsWith("/jogos") }}
          ativo={caminho.startsWith("/jogos")}
        />
      </View>

      <View style={{ marginTop: "auto", marginBottom: 20, gap: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.onSurface, fontSize: 15, fontWeight: "800" }}>Entre no Downpipe</Text>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12.5, lineHeight: 18 }}>
          Monte a sua garagem, confirme presença nos encontros e siga a galera.
        </Text>
        <Pressable
          onPress={() => entrar("/register")}
          className="items-center active:opacity-80"
          style={{ paddingVertical: 11, backgroundColor: colors.primaryContainer }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onPrimaryContainer, fontSize: 12.5, fontWeight: "800", letterSpacing: 1.2 }}>CRIAR CONTA</Text>
        </Pressable>
        <Pressable
          onPress={() => entrar("/login")}
          className="items-center border border-outline active:bg-white/5"
          style={{ paddingVertical: 10 }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.onSurface, fontSize: 12.5, fontWeight: "700", letterSpacing: 1.2 }}>JÁ TENHO CONTA</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MenuDeQuemEntrou() {
  const caminho = usePathname();
  const { data: me } = useCurrentUser();
  const { data: naoLidas } = useUnreadCount();
  const admin = !!me?.isAdmin;
  const painelAberto = useLayoutStore((s) => s.notificacoesAbertas);
  const setPainel = useLayoutStore((s) => s.setNotificacoesAbertas);

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
  const { data: relatos } = useQuery({
    queryKey: ["relatos-nao-lidos"],
    queryFn: () => apiService.contarRelatosNaoLidos(),
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
      // O sino abre o painel ao lado, como no Instagram web; aceso enquanto
      // o painel está aberto. Com ele aberto, os outros itens apagam.
      ativoEm: (c) => painelAberto || c.startsWith("/notifications"),
      acao: () => setPainel(!painelAberto),
      contador: typeof naoLidas === "number" ? naoLidas : undefined,
    },
    { rotulo: "Criar", Icone: SquarePlus, destino: "/add-action", ativoEm: () => false, empilhar: true },
    { rotulo: "Perfil", Icone: User, destino: "/(tabs)/profile", ativoEm: (c) => c.startsWith("/profile") },
    {
      rotulo: "Jogos",
      Icone: Gamepad2,
      destino: "/jogos",
      ativoEm: (c) => c.startsWith("/jogos") || c.startsWith("/nave-do-dia") || c.startsWith("/mais-caro") || c.startsWith("/frankenstein"),
      empilhar: true,
    },
  ];

  const deAdmin: Item[] = admin
    ? [
        { rotulo: "Moderação", Icone: Flag, destino: "/moderacao", ativoEm: (c) => c.startsWith("/moderacao"), contador: denuncias },
        {
          rotulo: "Encontros na fila",
          Icone: CalendarCheck,
          destino: "/fila-de-roles",
          ativoEm: (c) => c.startsWith("/fila-de-roles"),
          contador: fila,
        },
        {
          rotulo: "Relatos",
          Icone: MessageSquareText,
          destino: "/relatos",
          ativoEm: (c) => c.startsWith("/relatos"),
          contador: relatos,
        },
        { rotulo: "Tráfego", Icone: ChartColumn, destino: "/trafego", ativoEm: (c) => c.startsWith("/trafego") },
      ]
    : [];

  // Pra todo mundo, discreto embaixo: não é navegação, é um canal.
  const relato: Item = {
    rotulo: "Contar como tá sendo",
    Icone: MessageSquareText,
    destino: "/relato",
    ativoEm: (c) => c === "/relato",
  };

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
        <Logo height={20} />
      </Pressable>

      <View style={{ gap: 2 }}>
        {principais.map((item) => (
          <Linha
            key={item.rotulo}
            item={item}
            ativo={item.rotulo === "Notificações" ? item.ativoEm(caminho) : !painelAberto && item.ativoEm(caminho)}
          />
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

      <View style={{ marginTop: "auto", marginBottom: 20 }}>
        <Linha item={relato} ativo={!painelAberto && relato.ativoEm(caminho)} />
      </View>
    </View>
  );
}
