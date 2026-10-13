import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/constants/theme";
import { isPlaceholderUsername } from "@/utils/profile";

interface UserAvatarProps {
  uri: string;
  size?: number;
  ringColor?: string;
  /** Nome de exibição: vira as iniciais quando não há foto. */
  nome?: string | null;
  /** O @, usado quando não há nome (e pra escolher a cor). */
  usuario?: string | null;
}

/**
 * Fundos das iniciais. Escuros e um pouco saturados, pra combinar com o
 * app escuro e o texto branco em cima continuar legível.
 */
const FUNDOS = ["#7f1d1d", "#7c2d12", "#713f12", "#14532d", "#134e4a", "#1e3a8a", "#3b0764", "#701a75", "#374151"];

/** Mesma pessoa, mesma cor: a cor sai do @, não do sorteio. */
function corDe(chave: string): string {
  let h = 0;
  for (let i = 0; i < chave.length; i++) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return FUNDOS[h % FUNDOS.length];
}

/**
 * "Rafael Mendes" → "RM"; "rafa.turbo" → "RA". O @ provisório do cadastro
 * (u5ed98c…) não vira inicial: mostraria "U5" pra todo mundo novo.
 */
export function iniciaisDe(nome?: string | null, usuario?: string | null): string {
  const n = (nome ?? "").trim();
  const u = usuario && !isPlaceholderUsername(usuario) ? usuario.replace(/[^a-zA-Z0-9]/g, "") : "";
  const palavras = n.split(/\s+/).filter((p) => /[a-zA-ZÀ-ÿ0-9]/.test(p));
  if (palavras.length >= 2) return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
  if (palavras.length === 1 && !(usuario && isPlaceholderUsername(n))) return palavras[0].slice(0, 2).toUpperCase();
  return u.slice(0, 2).toUpperCase();
}

export function UserAvatar({ uri, size = 40, ringColor, nome, usuario }: UserAvatarProps) {
  const iniciais = uri ? "" : iniciaisDe(nome, usuario);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ringColor ? 2 : 0,
        borderColor: ringColor ?? "transparent",
        overflow: "hidden",
        backgroundColor: iniciais ? corDe(usuario || nome || "") : colors.surfaceHigh,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
      ) : iniciais ? (
        <Text
          style={{ color: "#fff", fontWeight: "700", fontSize: Math.max(9, Math.round(size * 0.38)), letterSpacing: 0.5 }}
          numberOfLines={1}
          accessible={false}
        >
          {iniciais}
        </Text>
      ) : null}
    </View>
  );
}
