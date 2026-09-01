import React from "react";
import { Image } from "expo-image";

// 1457×292 px no arquivo original. Guardar a razão aqui evita repetir o
// cálculo em cada uso e mantém a logo sem distorção.
const LOGO_RATIO = 1457 / 292;

interface LogoProps {
  /** Altura em pt; a largura é derivada da proporção original. */
  height?: number;
}

/** Wordmark do Downpipe. Só a altura é informada — largura vem da proporção. */
export function Logo({ height = 18 }: LogoProps) {
  return (
    <Image
      source={require("@/assets/logo-downpipe.png")}
      style={{ height, width: height * LOGO_RATIO }}
      contentFit="contain"
      // A logo é decorativa quando acompanha o nome; em telas onde ela é o
      // único identificador, o rótulo abaixo dá o contexto.
      accessibilityLabel="Downpipe"
    />
  );
}
