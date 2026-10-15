/**
 * A foto de um carro dos jogos, com o crédito.
 *
 * As fotos (e o resumo em português, quando há) vêm da Wikipédia: licença
 * livre, com crédito e link pro artigo. O levantamento é feito uma vez e
 * fica em utils/fotosDosCarros.json; carro sem foto lá simplesmente não
 * mostra nada.
 */
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/constants/theme";
import fotos from "@/utils/fotosDosCarros.json";

interface Foto {
  foto: string;
  pagina?: string;
  resumo?: string | null;
}

const FOTOS = fotos as Record<string, Foto | null>;

export const temFoto = (id: string) => !!FOTOS[id]?.foto;

export function FotoDoCarro({
  id,
  altura,
  comResumo = false,
  credito = true,
}: {
  id: string;
  altura: number;
  comResumo?: boolean;
  credito?: boolean;
}) {
  const dados = FOTOS[id];
  const [falhou, setFalhou] = useState(false);
  if (!dados?.foto || falhou) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: altura, backgroundColor: "#0b0b0b", overflow: "hidden" }}>
        <Image
          source={{ uri: dados.foto }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={250}
          onError={() => setFalhou(true)}
          accessibilityIgnoresInvertColors
        />
      </View>
      {comResumo && dados.resumo ? (
        <Text className="text-on-surface-variant" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {dados.resumo}
        </Text>
      ) : null}
      {credito && dados.pagina ? (
        <Pressable onPress={() => Linking.openURL(dados.pagina!)} hitSlop={6} accessibilityRole="link">
          <Text style={{ color: colors.muted, fontSize: 11 }}>Foto{comResumo && dados.resumo ? " e texto" : ""}: Wikipédia (licença livre)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
