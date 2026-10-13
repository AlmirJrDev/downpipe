/**
 * Nave do Dia — adivinhe o carro de hoje (ver components/JogoNaveDoDia).
 *
 * Aberta pra quem não tem conta, como a página de um encontro: é o tipo de
 * coisa que se manda no grupo do WhatsApp, e quem chega pelo link joga
 * antes de saber o que é o Downpipe. O progresso do dia fica no aparelho.
 */
import React from "react";
import { JogoNaveDoDia } from "@/components/JogoNaveDoDia";

export default function NaveDoDiaScreen() {
  return <JogoNaveDoDia modo="geral" />;
}
