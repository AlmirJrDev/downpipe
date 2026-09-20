import "../global.css";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isPlaceholderUsername } from "@/utils/profile";
import { AlertHost } from "@/components/ui/AlertHost";
import { FolhasDoPost } from "@/components/FolhasDoPost";

// expo-router monta o NavigationContainer com o DefaultTheme, cujo
// colors.background é rgb(242,242,242) — quase branco. Cada navegador usa esse
// valor como fundo do container de cena, então ele vaza no mount da aba, na
// transição e no overscroll, antes de o `bg-surface` da tela pintar. Declarar o
// tema escuro aqui cobre todos os navegadores abaixo de uma vez.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.surface,
    card: colors.surface,
    text: colors.onSurface,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primaryContainer,
  },
};

/**
 * Pra onde a pessoa estava indo quando foi mandada pro login.
 *
 * Link compartilhado é o caso: quem recebe um rolê pelo WhatsApp e ainda não
 * tem conta cai no login, cria a conta, passa pelo onboarding — e antes disto
 * terminava no feed, sem nem sinal do rolê que abriu. Guardado em memória:
 * o login não recarrega a página, então o valor atravessa até o fim.
 */
let destinoDepoisDoLogin: string | null = null;

/** O caminho aberto no navegador, sem o /app do começo. Só existe na web. */
function caminhoAberto(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const semBase = window.location.pathname.replace(/^\/app(?=\/|$)/, "") || "/";
  return semBase + window.location.search;
}

// Redireciona entre (tabs), login/register e o onboarding (edit-profile
// forçado pra quem ainda está com o @ placeholder do signup) conforme o
// status de auth. Fica dentro do Stack (não antes dele) porque
// useSegments/useRouter precisam do contexto de navegação já montado.
function AuthRedirect() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();
  // isPending (não isLoading!): isLoading = isPending && isFetching, e no
  // exato render em que `enabled` vira true, o fetch ainda não começou —
  // isLoading fica false por uma volta, "me" ainda undefined, e sem esse
  // gate certo o redirect lia isso como "não precisa de onboarding" antes
  // do profile sequer ter carregado.
  const { data: me, isPending: mePending } = useCurrentUser();

  // Só a primeira avaliação guarda destino: é quando a pessoa abriu o app
  // (ou um link) já deslogada. Depois disso, ficar deslogado é sair da conta
  // ou excluí-la — e guardar o caminho faria o próximo login, talvez de outra
  // conta, cair na tela de excluir conta.
  const primeiraAvaliacao = useRef(true);

  useEffect(() => {
    if (status === "hydrating") return;
    const abriuAgora = primeiraAvaliacao.current;
    primeiraAvaliacao.current = false;
    // Recuperação de senha entra aqui: quem chega nessas telas está
    // deslogado por definição, e sem esta exceção o redirect as expulsaria
    // pro login no mesmo instante em que abrissem.
    const inAuthScreen =
      segments[0] === "login" ||
      segments[0] === "register" ||
      segments[0] === "forgot-password" ||
      segments[0] === "nova-senha";

    if (status === "signedOut") {
      if (!inAuthScreen) {
        // A home não conta como destino: é pra lá que a pessoa vai de
        // qualquer jeito depois de entrar.
        const aberto = caminhoAberto();
        if (abriuAgora && aberto && aberto !== "/") destinoDepoisDoLogin = aberto;
        router.replace("/login");
      }
      return;
    }

    // signedIn — espera o profile carregar antes de decidir sobre onboarding.
    if (mePending) return;

    const needsOnboarding = !!me && isPlaceholderUsername(me.username);
    // "welcome" (carrossel de recursos) e "edit-profile" (configurar o @)
    // são os dois passos do onboarding — não empurra pra fora de nenhum dos
    // dois enquanto o usuário ainda não terminou.
    const inOnboardingFlow = segments[0] === "welcome" || segments[0] === "edit-profile";

    if (needsOnboarding && !inOnboardingFlow) {
      router.replace("/welcome");
    } else if (!needsOnboarding && destinoDepoisDoLogin) {
      // Entrou (ou terminou o onboarding de conta nova): segue pro link que
      // tinha aberto. Usado uma vez só, pra nunca puxar a pessoa de volta
      // pra ele mais tarde.
      const destino = destinoDepoisDoLogin;
      destinoDepoisDoLogin = null;
      router.replace(destino as never);
    } else if (!needsOnboarding && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [status, segments, me, mePending, router]);

  return null;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }));
  const authStatus = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const installRefreshHandler = useAuthStore((s) => s.installRefreshHandler);

  useEffect(() => {
    // Antes do hydrate: a partir daqui qualquer 401 renova a sessão sozinho.
    installRefreshHandler();
    hydrate();
  }, [hydrate, installRefreshHandler]);

  // Sem isso, dado de uma sessão anterior (ex.: "me" de outra conta testada
  // na mesma instalação do app) fica no cache e pode vazar por um instante
  // pra sessão seguinte, já que a query key ("me", "my-garage", etc.) não
  // inclui o id do usuário.
  useEffect(() => {
    if (authStatus === "signedOut") queryClient.clear();
  }, [authStatus, queryClient]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style="light" />
            {authStatus === "hydrating" ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.surface,
                }}
              >
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                <AuthRedirect />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.surface },
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="login" options={{ animation: "fade" }} />
                  <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen
                    name="forgot-password"
                    options={{ animation: "slide_from_right" }}
                  />
                  <Stack.Screen name="nova-senha" options={{ animation: "fade" }} />
                  <Stack.Screen name="welcome" options={{ animation: "fade" }} />
                  <Stack.Screen name="edit-profile" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="saved" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="bloqueados" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="moderacao" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="excluir-minha-conta" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="event-posts/[id]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="event-chat/[id]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="post/[id]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="arte/[tipo]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen
                    name="add-event"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="add-car"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="add-post"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="add-modification"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="add-project-update"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="add-evolution"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="add-action"
                    options={{ presentation: "transparentModal", animation: "fade" }}
                  />
                </Stack>
                {/* Diálogos do app. No celular não renderiza nada — lá o
                    Alert é do sistema. */}
                {/* Comentários, curtidas e foto em tela cheia: fora de qualquer
                    lista, ou a lista de dentro não rola (ver folhasStore). */}
                <FolhasDoPost />
                <AlertHost />
              </>
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
