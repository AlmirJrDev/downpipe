import type React from "react";

/**
 * Os convites flutuantes (instalar o app, ativar notificação) no computador.
 *
 * No celular eles sobem acima da barra de abas, centralizados — pensados pra
 * não tapar a navegação. No computador não há barra de abas, e centralizado
 * embaixo o cartão cai em cima do feed. Lá ele vai pro canto inferior
 * direito, mais estreito, como os avisos de qualquer app de desktop.
 */
export function fundoNoCanto(base: React.CSSProperties, desktop: boolean): React.CSSProperties {
  if (!desktop) return base;
  return { ...base, justifyContent: "flex-end", padding: 24, paddingBottom: 24 };
}

export function cartaoNoCanto(base: React.CSSProperties, desktop: boolean): React.CSSProperties {
  if (!desktop) return base;
  return { ...base, maxWidth: 380 };
}
