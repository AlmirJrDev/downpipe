/**
 * Frankenstein — monte uma nave com peça de tudo que é carro e suba a
 * escada de rachas no 402 m (ver utils/frankenstein).
 *
 * Aberto pra quem não tem conta, como os outros jogos. O desafio do dia é
 * o mesmo pra todo mundo e fica salvo no aparelho, inclusive no meio da
 * partida: recarregar a página no meio do racha conta como largada
 * queimada, senão dava pra repetir até ganhar.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { ArrowLeft, Flag, RefreshCw, Share2, Trophy, Wrench, Zap } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { Confete, Surgir, vibrar } from "@/components/jogos/Animacoes";
import { Share } from "@/utils/share";
import { voltarOuIrPara } from "@/utils/navigation";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import { hojeEmBrasilia, numeroDoDia, type Nave } from "@/utils/naveDoDia";
import {
  DOADORES,
  NOME_DA_PARTE,
  PARTES,
  RIVAIS,
  TROCAS,
  descreverPeca,
  fichaDa,
  filaDeDoadores,
  formatarTempo,
  sementeDoDia,
  tempoNo402,
  textoDeCompartilhar,
  type Ficha,
  type Montagem,
  type Parte,
} from "@/utils/frankenstein";
import { colors } from "@/constants/theme";

const VERDE = "#15803d";
const VERMELHO = "#b91c1c";
const AMBAR = "#f59e0b";

type Modo = "dia" | "livre";
type Etapa = "montando" | "pronta" | "largada" | "corrida" | "resultado" | "oficina" | "fim";

interface Racha {
  reacao: number;
  tempo: number;
  rivalReacao: number;
  rivalTempo: number;
  venceu: boolean;
  queimou: boolean;
}

interface Partida {
  modo: Modo;
  semente: number;
  /** Próximo doador da fila. */
  cursor: number;
  trocas: number;
  doador: string | null;
  montagem: Partial<Record<Parte, string>>;
  /** Índice do rival da vez. */
  fase: number;
  vitorias: number;
  melhorTempo: number | null;
  etapa: Etapa;
  racha: Racha | null;
  /** Gravado ao entrar na largada: recarregar no meio do racha é derrota. */
  emRacha: boolean;
}

const porId = new Map(DOADORES.map((n) => [n.id, n]));
const nave = (id: string | null | undefined) => (id ? porId.get(id) ?? null : null);

function novaPartida(modo: Modo, semente: number): Partida {
  const fila = filaDeDoadores(semente);
  return {
    modo,
    semente,
    cursor: 1,
    trocas: TROCAS,
    doador: fila[0].id,
    montagem: {},
    fase: 0,
    vitorias: 0,
    melhorTempo: null,
    etapa: "montando",
    racha: null,
    emRacha: false,
  };
}

const montagemCompleta = (m: Partida["montagem"]): Required<Montagem> | null => {
  const r: Partial<Record<Parte, Nave>> = {};
  for (const p of PARTES) {
    const n = nave(m[p]);
    if (!n) return null;
    r[p] = n;
  }
  return r as Required<Montagem>;
};

// ------------------------------------------------------------- persistência

const lerJson = <T,>(chave: string): T | null => {
  try {
    const t = Platform.OS === "web" ? localStorage.getItem(chave) : null;
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return null;
  }
};
const gravarJson = (chave: string, v: unknown) => {
  try {
    if (Platform.OS === "web") localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    // Sem storage: joga do mesmo jeito, só não lembra.
  }
};
const CHAVE_DO_RECORDE = "frankenstein:recorde";

// ------------------------------------------------------------------ peças

function Estatistica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 90, gap: 2, padding: 10, borderWidth: 1, borderColor: colors.border }}>
      <Text className="text-muted" style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 1 }}>
        {rotulo.toUpperCase()}
      </Text>
      <Text className="text-on-surface" style={{ fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
        {valor}
      </Text>
    </View>
  );
}

function FichaDaNave({ ficha }: { ficha: Ficha }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
      <Estatistica rotulo="Potência" valor={`${ficha.cv} cv`} />
      <Estatistica rotulo="Peso" valor={`${ficha.peso} kg`} />
      <Estatistica rotulo="Tração" valor={ficha.tracao} />
      <Estatistica rotulo="Câmbio" valor={ficha.cambio.rotulo} />
      <Estatistica rotulo="Pneus" valor={`${Math.round(ficha.aderencia * 100)}`} />
    </View>
  );
}

/** As cinco vagas da nave, com o doador de cada peça. */
function Garagem({ montagem, destaque }: { montagem: Partida["montagem"]; destaque?: Parte | null }) {
  return (
    <View style={{ gap: 4 }}>
      {PARTES.map((p) => {
        const n = nave(montagem[p]);
        return (
          <View
            key={p}
            className="flex-row items-center"
            style={{
              gap: 10,
              paddingVertical: 9,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: destaque === p ? colors.primary : colors.border,
              backgroundColor: n ? colors.surfaceHigh : "transparent",
            }}
          >
            <Text className="text-muted" style={{ width: 62, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
              {NOME_DA_PARTE[p].toUpperCase()}
            </Text>
            {n ? (
              <View style={{ flex: 1 }}>
                <Text className="text-on-surface" style={{ fontSize: 13.5, fontWeight: "700" }} numberOfLines={1}>
                  {n.nome}
                </Text>
                <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
                  {descreverPeca(p, n)}
                </Text>
              </View>
            ) : (
              <Text className="text-muted" style={{ flex: 1, fontSize: 13 }}>
                vaga aberta
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- largada

/** A árvore de largada: três âmbar, depois verde num tempo que ninguém adivinha. */
function Largada({ onLargar }: { onLargar: (reacao: number | null) => void }) {
  const [acesas, setAcesas] = useState(0);
  const [verde, setVerde] = useState(false);
  const verdeEm = useRef<number | null>(null);
  const feito = useRef(false);

  const apertar = () => {
    if (feito.current) return;
    feito.current = true;
    if (verdeEm.current == null) return onLargar(null); // queimou
    onLargar(Math.max(0.1, (Date.now() - verdeEm.current) / 1000));
  };

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    [400, 900, 1400].forEach((ms, i) => t.push(setTimeout(() => setAcesas(i + 1), ms)));
    const espera = 1400 + 600 + Math.random() * 1400;
    t.push(
      setTimeout(() => {
        verdeEm.current = Date.now();
        setVerde(true);
        vibrar();
      }, espera)
    );
    // Dormiu na largada: sai com 2 s de reação.
    t.push(setTimeout(() => !feito.current && apertar(), espera + 2000));
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No computador, espaço ou Enter aceleram.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const tecla = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        apertar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const luz = (acesa: boolean, cor: string) => (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 2,
        borderColor: acesa ? cor : colors.border,
        backgroundColor: acesa ? cor : "#111",
      }}
    />
  );

  return (
    <View className="items-center" style={{ gap: 18, paddingVertical: 10 }}>
      <View style={{ gap: 10, padding: 14, backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: colors.border }}>
        {luz(acesas >= 1 && !verde, AMBAR)}
        {luz(acesas >= 2 && !verde, AMBAR)}
        {luz(acesas >= 3 && !verde, AMBAR)}
        {luz(verde, "#22c55e")}
      </View>
      <Pressable
        onPressIn={apertar}
        className="items-center justify-center flex-row active:opacity-80"
        style={{ gap: 10, width: "100%", maxWidth: 420, paddingVertical: 22, backgroundColor: verde ? VERDE : colors.primary }}
        accessibilityRole="button"
      >
        <Zap size={22} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 2 }}>ACELERAR</Text>
      </Pressable>
      <Text className="text-muted" style={{ fontSize: 12.5, textAlign: "center" }}>
        Espere o verde. Antes dele é largada queimada.{Platform.OS === "web" ? " No PC, espaço também acelera." : ""}
      </Text>
    </View>
  );
}

// ----------------------------------------------------------------- corrida

/** Quanto do tempo real a animação usa: 12 s de racha viram uns 4 s de tela. */
const COMPRESSAO = 0.33;

function Carrinho({ cor }: { cor: string }) {
  return (
    <View style={{ width: 44, height: 20 }}>
      <View style={{ position: "absolute", left: 8, top: 0, width: 22, height: 8, backgroundColor: cor, opacity: 0.85 }} />
      <View style={{ position: "absolute", left: 0, top: 6, width: 44, height: 9, backgroundColor: cor }} />
      <View style={{ position: "absolute", left: 6, top: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: "#111", borderWidth: 2, borderColor: "#666" }} />
      <View style={{ position: "absolute", left: 29, top: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: "#111", borderWidth: 2, borderColor: "#666" }} />
    </View>
  );
}

function Raia({
  rotulo,
  cor,
  reacao,
  tempo,
  relogio,
  largura,
}: {
  rotulo: string;
  cor: string;
  reacao: number;
  tempo: number;
  relogio: SharedValue<number>;
  largura: number;
}) {
  const estilo = useAnimatedStyle(() => {
    const t = relogio.value / COMPRESSAO - reacao;
    const p = Math.max(0, Math.min(1, t / tempo));
    // Arrancada acelera o tempo todo: começa devagar e termina voando.
    return { transform: [{ translateX: Math.pow(p, 1.6) * Math.max(0, largura - 44) }] };
  });
  return (
    <View style={{ gap: 4 }}>
      <Text className="text-on-surface-variant" style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.8 }} numberOfLines={1}>
        {rotulo}
      </Text>
      <View style={{ height: 34, justifyContent: "center", borderBottomWidth: 1, borderColor: colors.border, backgroundColor: "#0d0d0d" }}>
        <Animated.View style={estilo}>
          <Carrinho cor={cor} />
        </Animated.View>
      </View>
    </View>
  );
}

function Corrida({ racha, rival, onFim }: { racha: Racha; rival: Nave; onFim: () => void }) {
  const relogio = useSharedValue(0);
  const [largura, setLargura] = useState(0);
  const fim = Math.max(racha.reacao + racha.tempo, racha.rivalReacao + racha.rivalTempo) * COMPRESSAO;

  useEffect(() => {
    if (!largura) return;
    relogio.value = withTiming(fim, { duration: fim * 1000, easing: Easing.linear });
    const t = setTimeout(onFim, fim * 1000 + 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largura]);

  return (
    <View style={{ gap: 14 }} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 && (
        <>
          <Raia rotulo="SUA NAVE" cor={colors.primary} reacao={racha.reacao} tempo={racha.tempo} relogio={relogio} largura={largura} />
          <Raia rotulo={rival.nome.toUpperCase()} cor="#d4d4d4" reacao={racha.rivalReacao} tempo={racha.rivalTempo} relogio={relogio} largura={largura} />
        </>
      )}
      <View className="flex-row justify-between">
        <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700" }}>
          LARGADA
        </Text>
        <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700" }}>
          402 M
        </Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ a tela

export default function FrankensteinScreen() {
  const larga = useLarguraAmpla();
  const dia = hojeEmBrasilia();
  const numero = numeroDoDia(dia);
  const chaveDoDia = `frankenstein:dia:${dia}`;

  const [partida, setPartida] = useState<Partida>(() => novaPartida("dia", sementeDoDia(dia)));
  const [recorde, setRecorde] = useState(0);
  const [confete, setConfete] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const rolagem = useRef<ScrollView>(null);
  const fila = useMemo(() => filaDeDoadores(partida.semente), [partida.semente]);

  // Volta o desafio do dia de onde parou.
  useEffect(() => {
    setRecorde(lerJson<number>(CHAVE_DO_RECORDE) ?? 0);
    const salva = lerJson<Partida>(chaveDoDia);
    if (!salva) return;
    if (salva.etapa === "corrida" && salva.racha) {
      // Saiu durante a animação: o racha já estava decidido, vale o resultado.
      const total = salva.racha.reacao + salva.racha.tempo;
      setPartida({
        ...salva,
        emRacha: false,
        etapa: "resultado",
        vitorias: salva.racha.venceu ? salva.vitorias + 1 : salva.vitorias,
        melhorTempo: salva.melhorTempo == null ? total : Math.min(salva.melhorTempo, total),
      });
    } else if (salva.emRacha) {
      // Saiu na árvore de largada: conta como largada queimada.
      setPartida({ ...salva, emRacha: false, etapa: "fim", racha: null });
    } else {
      setPartida(salva);
    }
  }, [chaveDoDia]);

  // Toda mudança do desafio do dia fica gravada.
  const atualizar = (f: (p: Partida) => Partida) =>
    setPartida((atual) => {
      const nova = f(atual);
      if (nova.modo === "dia") gravarJson(chaveDoDia, nova);
      return nova;
    });

  const subir = () => rolagem.current?.scrollTo({ y: 0, animated: true });
  const doador = nave(partida.doador);
  const completa = montagemCompleta(partida.montagem);
  const ficha = completa ? fichaDa(completa) : null;
  const estimado = ficha ? tempoNo402(ficha) : null;
  const rival = RIVAIS[Math.min(partida.fase, RIVAIS.length - 1)];

  // ---------------------------------------------------------------- ações

  const pegar = (parte: Parte) => {
    if (!doador || partida.montagem[parte]) return;
    vibrar();
    atualizar((p) => {
      const montagem = { ...p.montagem, [parte]: doador.id };
      const cheia = PARTES.every((x) => montagem[x]);
      return {
        ...p,
        montagem,
        doador: cheia ? null : fila[p.cursor].id,
        cursor: cheia ? p.cursor : p.cursor + 1,
        etapa: cheia ? "pronta" : "montando",
      };
    });
    if (PARTES.filter((x) => !partida.montagem[x]).length === 1) subir();
  };

  const trocarDoador = () => {
    if (partida.trocas <= 0) return;
    atualizar((p) => ({ ...p, doador: fila[p.cursor].id, cursor: p.cursor + 1, trocas: p.trocas - 1 }));
  };

  const irProRacha = () => {
    atualizar((p) => ({ ...p, etapa: "largada", emRacha: true, racha: null }));
    subir();
  };

  const largou = (reacao: number | null) => {
    if (!ficha) return;
    const tempo = tempoNo402(ficha);
    const queimou = reacao == null;
    const total = (reacao ?? 0) + tempo;
    const rivalTotal = rival.reacao + rival.tempo;
    const racha: Racha = {
      reacao: reacao ?? 0,
      tempo,
      rivalReacao: rival.reacao,
      rivalTempo: rival.tempo,
      venceu: !queimou && total < rivalTotal,
      queimou,
    };
    if (queimou) vibrar("erro");
    atualizar((p) => ({ ...p, racha, etapa: queimou ? "resultado" : "corrida" }));
  };

  const terminouCorrida = () => {
    atualizar((p) => {
      if (!p.racha) return p;
      const venceu = p.racha.venceu;
      const total = p.racha.reacao + p.racha.tempo;
      const vitorias = venceu ? p.vitorias + 1 : p.vitorias;
      return {
        ...p,
        vitorias,
        melhorTempo: p.melhorTempo == null ? total : Math.min(p.melhorTempo, total),
        etapa: "resultado",
        emRacha: false,
      };
    });
    if (partida.racha?.venceu) {
      vibrar("acerto");
      setConfete(Date.now());
    } else vibrar("erro");
  };

  // Quem queimou a largada também sai do racha.
  useEffect(() => {
    if (partida.etapa === "resultado" && partida.emRacha) atualizar((p) => ({ ...p, emRacha: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida.etapa]);

  // Fim de partida: guarda o recorde do modo livre e o do dia.
  useEffect(() => {
    if (partida.etapa !== "fim") return;
    if (partida.vitorias > recorde) {
      setRecorde(partida.vitorias);
      gravarJson(CHAVE_DO_RECORDE, partida.vitorias);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida.etapa]);

  const depoisDoResultado = () => {
    const r = partida.racha;
    if (!r?.venceu || partida.vitorias >= RIVAIS.length) {
      if (partida.vitorias >= RIVAIS.length) setConfete(Date.now());
      atualizar((p) => ({ ...p, etapa: "fim" }));
      return;
    }
    // Ganhou: oficina com um doador novo antes do próximo racha.
    atualizar((p) => ({ ...p, etapa: "oficina", fase: p.fase + 1, doador: fila[p.cursor].id, cursor: p.cursor + 1 }));
    subir();
  };

  const trocarNaOficina = (parte: Parte | null) => {
    atualizar((p) => ({
      ...p,
      montagem: parte && p.doador ? { ...p.montagem, [parte]: p.doador } : p.montagem,
      doador: null,
      etapa: "pronta",
    }));
    subir();
  };

  const jogarLivre = () => {
    setAviso(null);
    setPartida(novaPartida("livre", Math.floor(Math.random() * 1e9)));
    subir();
  };

  const voltarProDia = () => {
    setAviso(null);
    setPartida(lerJson<Partida>(chaveDoDia) ?? novaPartida("dia", sementeDoDia(dia)));
  };

  const compartilhar = async () => {
    if (!completa) return;
    const texto = textoDeCompartilhar({
      numero: partida.modo === "dia" ? numero : null,
      vitorias: partida.vitorias,
      derrotaFinal: partida.vitorias < RIVAIS.length,
      melhorTempo: partida.melhorTempo,
      montagem: completa,
    });
    try {
      await Share.share({ message: texto });
    } catch {
      setAviso("Não deu pra compartilhar daqui. Tira um print!");
    }
  };

  // ---------------------------------------------------------------- telas

  const cabecalho = (
    <View style={{ gap: 10 }}>
      <View className="flex-row" style={{ gap: 6 }}>
        {(["dia", "livre"] as Modo[]).map((m) => {
          const ativo = partida.modo === m;
          return (
            <Pressable
              key={m}
              onPress={() => (ativo ? null : m === "dia" ? voltarProDia() : jogarLivre())}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativo }}
              className="border px-3 py-2"
              style={{ borderColor: ativo ? colors.primary : colors.border, backgroundColor: ativo ? colors.surfaceHigh : "transparent" }}
            >
              <Text style={{ color: ativo ? colors.onSurface : colors.muted, fontSize: 12.5, fontWeight: "700", letterSpacing: 0.6 }}>
                {m === "dia" ? `DESAFIO DO DIA #${numero}` : "MODO LIVRE"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row items-end justify-between" style={{ gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text className="text-on-surface" style={{ fontSize: larga ? 28 : 21, fontWeight: "800" }}>
            Monte a nave. Encare o racha.
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 13.5, lineHeight: 19 }}>
            Cada rolada traz um carro: tire uma peça dele. Com as cinco vagas cheias, a nave sobe a escada do 402 m, do
            Fusca ao McLaren. Ganhou, passa na oficina e encara o próximo.
          </Text>
        </View>
        <View className="items-end">
          <Text style={{ color: colors.primary, fontSize: larga ? 30 : 24, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
            {partida.vitorias}/{RIVAIS.length}
          </Text>
          <Text className="text-muted" style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 1 }}>
            RECORDE {recorde}
          </Text>
        </View>
      </View>
    </View>
  );

  const cartaoDoDoador = (titulo: string, oficina: boolean) =>
    doador && (
      <Surgir key={doador.id} style={{ gap: 10 }}>
        <View style={{ gap: 2 }}>
          <Text className="text-primary" style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 1.4 }}>
            {titulo}
          </Text>
          <Text className="text-on-surface" style={{ fontSize: larga ? 26 : 21, fontWeight: "800" }}>
            {doador.nome}
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
            {doador.ano} · {doador.pais}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          {PARTES.map((p) => {
            const ocupada = !oficina && !!partida.montagem[p];
            // Na oficina, mostra quanto o 402 muda com a troca.
            let efeito: string | null = null;
            if (oficina && completa) {
              const t = tempoNo402(fichaDa({ ...completa, [p]: doador }));
              const d = t - tempoNo402(fichaDa(completa));
              efeito =
                Math.abs(d) < 0.0005 ? "não muda" : `${formatarTempo(t)} s (${d < 0 ? "−" : "+"}${formatarTempo(Math.abs(d))})`;
            }
            return (
              <Pressable
                key={p}
                disabled={ocupada}
                onPress={() => (oficina ? trocarNaOficina(p) : pegar(p))}
                className="flex-row items-center active:opacity-80"
                style={{
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: ocupada ? colors.border : colors.outline,
                  backgroundColor: ocupada ? "transparent" : colors.surfaceHigh,
                  opacity: ocupada ? 0.4 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel={`${oficina ? "Trocar" : "Pegar"} ${NOME_DA_PARTE[p]}: ${descreverPeca(p, doador)}`}
              >
                <Text className="text-on-surface" style={{ width: 70, fontSize: 12, fontWeight: "900", letterSpacing: 0.8 }}>
                  {NOME_DA_PARTE[p].toUpperCase()}
                </Text>
                <Text className="text-on-surface" style={{ flex: 1, fontSize: 14, fontWeight: "600" }}>
                  {descreverPeca(p, doador)}
                </Text>
                {ocupada ? (
                  <Text className="text-muted" style={{ fontSize: 11.5 }}>
                    já tem
                  </Text>
                ) : efeito ? (
                  <Text style={{ fontSize: 12, fontWeight: "700", color: efeito.includes("−") ? "#4ade80" : efeito.includes("+") ? "#f87171" : colors.muted }}>{efeito}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Surgir>
    );

  const proximoRival = (
    <View className="border border-border" style={{ padding: 14, gap: 4, backgroundColor: colors.surfaceHigh }}>
      <Text className="text-muted" style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
        FASE {partida.fase + 1} DE {RIVAIS.length} · RIVAL
      </Text>
      <Text className="text-on-surface" style={{ fontSize: 19, fontWeight: "800" }}>
        {rival.nave.nome}
      </Text>
      <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
        Faz o 402 em {formatarTempo(rival.tempo)} s e reage em {formatarTempo(rival.reacao)} s.
      </Text>
    </View>
  );

  let miolo: React.ReactNode = null;
  const r = partida.racha;

  if (partida.etapa === "montando") {
    miolo = (
      <View style={{ gap: 12 }}>
        {cartaoDoDoador(`SAIU NA ROLADA · ${PARTES.filter((p) => partida.montagem[p]).length}/5 PEÇAS`, false)}
        <Pressable
          onPress={trocarDoador}
          disabled={partida.trocas <= 0}
          className="flex-row items-center justify-center border border-outline active:bg-white/5"
          style={{ gap: 8, paddingVertical: 12, opacity: partida.trocas > 0 ? 1 : 0.4 }}
        >
          <RefreshCw size={15} color={colors.onSurface} />
          <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1 }}>
            OUTRO CARRO · {partida.trocas} {partida.trocas === 1 ? "TROCA" : "TROCAS"}
          </Text>
        </Pressable>
      </View>
    );
  } else if (partida.etapa === "pronta" && ficha) {
    miolo = (
      <Surgir style={{ gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Text className="text-muted" style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
            SUA NAVE NO 402
          </Text>
          <Text className="text-on-surface" style={{ fontSize: larga ? 40 : 32, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
            {formatarTempo(estimado!)} s
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 12.5 }}>
            Sem contar a reação na largada, que é com você.
          </Text>
        </View>
        {proximoRival}
        <PrimaryButton label="Ir pro racha" onPress={irProRacha} icon={<Flag size={16} color={colors.onPrimaryContainer} />} />
      </Surgir>
    );
  } else if (partida.etapa === "largada") {
    miolo = (
      <View style={{ gap: 12 }}>
        {proximoRival}
        <Largada onLargar={largou} />
      </View>
    );
  } else if (partida.etapa === "corrida" && r) {
    miolo = <Corrida racha={r} rival={rival.nave} onFim={terminouCorrida} />;
  } else if (partida.etapa === "resultado" && r) {
    const seu = r.reacao + r.tempo;
    const dele = r.rivalReacao + r.rivalTempo;
    const ultimaFase = r.venceu && partida.vitorias >= RIVAIS.length;
    miolo = (
      <Surgir>
        <View
          style={{
            gap: 12,
            padding: larga ? 22 : 16,
            borderWidth: 2,
            borderColor: r.venceu ? VERDE : VERMELHO,
            backgroundColor: r.venceu ? "rgba(21,128,61,0.12)" : "rgba(185,28,28,0.12)",
          }}
        >
          <Text style={{ color: r.venceu ? "#4ade80" : "#f87171", fontSize: larga ? 30 : 24, fontWeight: "900", letterSpacing: 1 }}>
            {r.queimou ? "QUEIMOU A LARGADA" : r.venceu ? (ultimaFase ? "ZEROU O FRANKENSTEIN!" : "GANHOU!") : "PERDEU"}
          </Text>
          {!r.queimou && (
            <Text className="text-on-surface-variant" style={{ fontSize: 14 }}>
              {r.venceu ? "Na frente por " : "Atrás por "}
              {formatarTempo(Math.abs(dele - seu))} s
            </Text>
          )}
          {!r.queimou && (
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="border border-border" style={{ flex: 1, padding: 10, gap: 2 }}>
                <Text className="text-muted" style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 1 }}>
                  SUA NAVE
                </Text>
                <Text className="text-on-surface" style={{ fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                  {formatarTempo(seu)} s
                </Text>
                <Text className="text-muted" style={{ fontSize: 11.5 }}>
                  reação {formatarTempo(r.reacao)}
                </Text>
              </View>
              <View className="border border-border" style={{ flex: 1, padding: 10, gap: 2 }}>
                <Text className="text-muted" style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 1 }} numberOfLines={1}>
                  {rival.nave.nome.toUpperCase()}
                </Text>
                <Text className="text-on-surface" style={{ fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                  {formatarTempo(dele)} s
                </Text>
                <Text className="text-muted" style={{ fontSize: 11.5 }}>
                  reação {formatarTempo(r.rivalReacao)}
                </Text>
              </View>
            </View>
          )}
          <PrimaryButton
            label={r.venceu && !ultimaFase ? "Ir pra oficina" : "Ver resultado"}
            onPress={depoisDoResultado}
            icon={r.venceu && !ultimaFase ? <Wrench size={15} color={colors.onPrimaryContainer} /> : undefined}
          />
        </View>
      </Surgir>
    );
  } else if (partida.etapa === "oficina") {
    miolo = (
      <View style={{ gap: 12 }}>
        {cartaoDoDoador("OFICINA · TROQUE UMA PEÇA OU SIGA COMO ESTÁ", true)}
        <Pressable
          onPress={() => trocarNaOficina(null)}
          className="flex-row items-center justify-center border border-outline active:bg-white/5"
          style={{ gap: 8, paddingVertical: 12 }}
        >
          <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1 }}>
            MANTER A NAVE
          </Text>
        </Pressable>
        {proximoRival}
      </View>
    );
  } else if (partida.etapa === "fim") {
    const campeao = partida.vitorias >= RIVAIS.length;
    miolo = (
      <Surgir>
        <View style={{ gap: 12, padding: larga ? 22 : 16, borderWidth: 2, borderColor: campeao ? VERDE : colors.border, backgroundColor: colors.surfaceHigh }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: campeao ? VERDE : colors.primary }}>
              <Trophy size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-on-surface" style={{ fontSize: 22, fontWeight: "900" }}>
                {campeao ? "Zerou as 11 fases!" : `${partida.vitorias} de ${RIVAIS.length} fases`}
              </Text>
              <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                {partida.melhorTempo ? `Melhor 402: ${formatarTempo(partida.melhorTempo)} s` : "Não chegou a cruzar a linha."}
              </Text>
            </View>
          </View>
          {completa && <PrimaryButton label="Compartilhar resultado" onPress={compartilhar} icon={<Share2 size={15} color={colors.onPrimaryContainer} />} />}
          <Pressable
            onPress={jogarLivre}
            className="flex-row items-center justify-center border border-outline active:bg-white/5"
            style={{ gap: 8, paddingVertical: 13 }}
          >
            <RefreshCw size={15} color={colors.onSurface} />
            <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1 }}>
              {partida.modo === "dia" ? "JOGAR NO MODO LIVRE" : "JOGAR DE NOVO"}
            </Text>
          </Pressable>
          {partida.modo === "dia" && (
            <Text className="text-muted" style={{ fontSize: 12 }}>
              Amanhã tem outro desafio, com outros carros na rolada.
            </Text>
          )}
          {aviso && (
            <Text className="text-muted" style={{ fontSize: 12 }}>
              {aviso}
            </Text>
          )}
        </View>
      </Surgir>
    );
  }

  const nave_ = (
    <View style={{ gap: 10 }}>
      <Text className="text-muted" style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
        SUA NAVE
      </Text>
      <Garagem montagem={partida.montagem} />
      {ficha && <FichaDaNave ficha={ficha} />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="FRANKENSTEIN"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)")} accessibilityRole="button" accessibilityLabel="Voltar">
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView
        ref={rolagem}
        className="flex-1"
        contentContainerStyle={{ padding: larga ? 32 : 16, paddingBottom: 48, maxWidth: 1120, width: "100%", alignSelf: "center", gap: 18 }}
      >
        {cabecalho}
        <View style={{ flexDirection: larga ? "row" : "column", gap: larga ? 28 : 18, alignItems: "flex-start" }}>
          <View style={{ flex: larga ? 1.2 : undefined, width: larga ? undefined : "100%", gap: 12 }}>{miolo}</View>
          <View style={{ flex: larga ? 1 : undefined, width: larga ? undefined : "100%" }}>{nave_}</View>
        </View>
        <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 16 }}>
          Tempo do 402 calculado pela potência, pelo peso, pelo câmbio e por quanto a tração e os pneus seguram na
          largada. É uma conta de boteco, não um dinamômetro: carros de série batem perto do tempo real.
        </Text>
      </ScrollView>
      <Confete disparo={confete} />
    </View>
  );
}
