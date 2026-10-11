/**
 * Formulário em duas colunas, no computador: a foto (ou o que dá cara ao
 * que está sendo criado) à esquerda, parada enquanto os campos rolam à
 * direita — o desenho do "Criar publicação" do Instagram web.
 *
 * No celular não muda nada: a parte de cima vem primeiro e os campos
 * embaixo, na mesma ordem de sempre.
 */
import React from "react";
import { View, type ViewStyle } from "react-native";

export function FormularioEmColunas({
  larga,
  lateral,
  children,
}: {
  /** Vem do useLarguraAmpla da tela — quem pede a largura é a tela. */
  larga: boolean;
  lateral: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!larga) {
    return (
      <>
        {lateral}
        {children}
      </>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 40,
        width: "100%",
        maxWidth: 1040,
        alignSelf: "center",
      }}
    >
      <View style={{ flex: 5, position: "sticky" as ViewStyle["position"], top: 24 }}>{lateral}</View>
      <View style={{ flex: 6 }}>{children}</View>
    </View>
  );
}
