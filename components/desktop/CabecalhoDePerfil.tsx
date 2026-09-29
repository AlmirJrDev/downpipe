/**
 * O topo do perfil no computador, no desenho do Instagram web: a foto
 * grande à esquerda e, ao lado, o @, os botões, os números numa linha só e
 * a bio.
 *
 * No celular o perfil empilha tudo — foto, nome, botões, uma faixa de
 * números. Num monitor essa pilha deixava 600 px de vazio à direita de uma
 * foto de 96 px, e o perfil parecia um celular deitado.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { InstagramLink } from "@/components/ui/InstagramLink";
import { colors } from "@/constants/theme";

/** O react-native-web entrega "hovered" pro estilo; o tipo do RN não sabe. */
const emCima = (estado: unknown) => !!(estado as { hovered?: boolean }).hovered;

/** A largura do perfil do Instagram web — onde a grade de 3 fica no ponto. */
export const LARGURA_DO_PERFIL = 935;

export interface NumeroDoPerfil {
  label: string;
  value: number;
  onPress?: () => void;
}

export function CabecalhoDePerfil({
  avatarUrl,
  username,
  nome,
  subtitulo,
  bio,
  instagram,
  acoes,
  menu,
  numeros,
}: {
  avatarUrl: string;
  username: string;
  nome?: string | null;
  subtitulo?: string | null;
  bio?: string | null;
  instagram?: string | null;
  /** Os botões ao lado do @ (editar, seguir, compartilhar…). */
  acoes?: React.ReactNode;
  /** O "⋯" da conta ou de denunciar, no fim da linha do @. */
  menu?: React.ReactNode;
  numeros: NumeroDoPerfil[];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingTop: 36,
        paddingBottom: 40,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: 290, alignItems: "center" }}>
        <UserAvatar uri={avatarUrl} size={150} ringColor={colors.primaryContainer} />
      </View>

      <View style={{ flex: 1, gap: 18, paddingTop: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <Text className="text-on-surface" style={{ fontSize: 20, fontWeight: "500" }} numberOfLines={1}>
            {username}
          </Text>
          {acoes}
          {menu}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 32, rowGap: 6 }}>
          {numeros.map((n) => {
            const conteudo = (
              <Text className="text-on-surface" style={{ fontSize: 15 }}>
                <Text style={{ fontWeight: "700" }}>{n.value.toLocaleString("pt-BR")}</Text>{" "}
                <Text className="text-on-surface-variant">{n.label}</Text>
              </Text>
            );
            return n.onPress ? (
              <Pressable
                key={n.label}
                onPress={n.onPress}
                accessibilityRole="button"
                style={(estado) => ({ opacity: emCima(estado) ? 0.7 : 1 })}
              >
                {conteudo}
              </Pressable>
            ) : (
              <View key={n.label}>{conteudo}</View>
            );
          })}
        </View>

        <View style={{ gap: 4 }}>
          {!!nome && (
            <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
              {nome}
            </Text>
          )}
          {!!subtitulo && (
            <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
              {subtitulo}
            </Text>
          )}
          {!!bio && (
            <Text className="text-on-surface" style={{ fontSize: 14, lineHeight: 20, maxWidth: 520 }}>
              {bio}
            </Text>
          )}
          {!!instagram && (
            <View style={{ marginTop: 4 }}>
              <InstagramLink handle={instagram} size={14} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/** Botão compacto da linha do @ — os do celular esticam na largura toda. */
export function BotaoDoPerfil({
  label,
  onPress,
  destaque,
  icone,
  accessibilityLabel,
}: {
  label?: string;
  onPress: () => void;
  destaque?: boolean;
  icone?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={(estado) => {
        const hovered = emCima(estado);
        return {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: label ? 16 : 10,
        backgroundColor: destaque
          ? colors.primaryContainer
          : hovered
            ? "rgba(255,255,255,0.12)"
            : "rgba(255,255,255,0.07)",
        borderWidth: destaque ? 0 : 1,
        borderColor: colors.outlineVariant,
        opacity: destaque && hovered ? 0.9 : 1,
        };
      }}
    >
      {icone}
      {!!label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: destaque ? colors.onPrimaryContainer : colors.onSurface,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
