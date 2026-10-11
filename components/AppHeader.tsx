import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { colors, spacing, typography } from "@/constants/theme";
import { useModoDesktop } from "@/hooks/useDesktop";

// Os dois slots laterais têm largura fixa e igual para o wordmark ficar
// opticamente centrado. Com `justify-between` ele desloca conforme o conteúdo
// de cada lado, que era o motivo de o wordmark cair fora do centro em cada
// tela. 44px também é o alvo de toque mínimo confortável.
const SLOT_WIDTH = 44;

interface AppHeaderProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * Rótulo da tela. Sem ele, o header mostra a logo — que é o caso das telas
   * principais. Telas com identidade própria (MARCA, EDITAR CARRO, @usuário)
   * passam o texto e não exibem a logo, conforme o handoff.
   */
  title?: string;
  /** Hairline inferior — desligue se a tela já tem divisória própria. */
  bordered?: boolean;
}

/**
 * Alguns títulos chegam já em caixa alta ("PUBLICAÇÃO", "@FULANO"), que no
 * celular é o estilo. No cabeçalho de página do computador a caixa alta
 * gritaria: vira frase normal, deixando o @ em minúsculas como é de fato.
 */
function tituloDePagina(titulo: string): string {
  const temLetra = /[A-Za-zÀ-ÿ]/.test(titulo);
  if (!temLetra || titulo !== titulo.toUpperCase()) return titulo;
  if (titulo.startsWith("@")) return titulo.toLowerCase();
  const baixo = titulo.toLocaleLowerCase("pt-BR");
  return baixo.charAt(0).toLocaleUpperCase("pt-BR") + baixo.slice(1);
}

export function AppHeader({ left, right, title, bordered = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const desktop = useModoDesktop();

  /**
   * No computador a logo mora no menu lateral. Cabeçalho sem título é o das
   * telas principais, que só mostrava a logo — repetida ali ela é ruído.
   * Se sobra algum botão (o "⋯" do menu da conta no perfil), fica uma barra
   * fina só com ele; se não sobra nada, o cabeçalho some.
   */
  /**
   * Tela com título, no computador: cabeçalho de página, alinhado à
   * esquerda e em letra normal — como as telas do Instagram web. O título
   * vermelho, miúdo, em caixa alta e centralizado é o cabeçalho de app de
   * celular, e num monitor deixava formulário e configuração com cara de
   * celular esticado.
   */
  if (desktop && title) {
    return (
      <View
        style={{
          paddingTop: 28,
          paddingBottom: 16,
          paddingHorizontal: spacing.marginMobile,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: colors.surface,
          borderBottomWidth: bordered ? 1 : 0,
          borderBottomColor: colors.border,
        }}
      >
        {left ? <View>{left}</View> : null}
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 22, fontWeight: "700", color: colors.onSurface }}>
          {tituloDePagina(title)}
        </Text>
        {right ? <View>{right}</View> : null}
      </View>
    );
  }

  if (desktop && !title) {
    if (!left && !right) return null;
    return (
      <View
        style={{
          paddingTop: spacing.md,
          paddingHorizontal: spacing.marginMobile,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surface,
        }}
      >
        <View>{left}</View>
        <View>{right}</View>
      </View>
    );
  }

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.sm + spacing.xs,
        paddingHorizontal: spacing.marginMobile,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderBottomWidth: bordered ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: SLOT_WIDTH, alignItems: "flex-start" }}>{left}</View>
      {title ? (
        <Text
          numberOfLines={1}
          style={[
            typography.labelCaps,
            { flex: 1, textAlign: "center", color: colors.primary },
          ]}
        >
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1, alignItems: "center" }}>
          <Logo height={18} />
        </View>
      )}
      <View style={{ width: SLOT_WIDTH, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
