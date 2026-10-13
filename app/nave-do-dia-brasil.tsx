/**
 * Nave do Dia Brasil — o mesmo jogo, só com carro que veio e foi popular
 * aqui: Gol, Uno, Opala, Corolla, HB20, Hilux… (ver utils/navesExtras).
 * Aberta pra quem não tem conta, como a Nave do Dia.
 */
import React from "react";
import { JogoNaveDoDia } from "@/components/JogoNaveDoDia";

export default function NaveDoDiaBrasilScreen() {
  return <JogoNaveDoDia modo="brasil" />;
}
