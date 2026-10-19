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
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { bip, ligarSom, ronco, somLigado } from "@/components/jogos/Som";
import { ArrowLeft, CalendarDays, Flag, RefreshCw, Share2, Trophy, Volume2, VolumeX, Wrench, Zap } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { Confete, Surgir, vibrar } from "@/components/jogos/Animacoes";
import { Share } from "@/utils/share";
import { voltarOuIrPara } from "@/utils/navigation";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import { hojeEmBrasilia, numeroDoDia, type Nave } from "@/utils/naveDoDia";
import { dataCurta, diaPedido, diasAnteriores } from "@/utils/diasAnteriores";
import { router, useLocalSearchParams } from "expo-router";
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
  nomeDaNave,
  porQuePerdeu,
  sementeDoDia,
  tempoComPeca,
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

/**
 * A criatura montada, como um carro só: o nome dela e de onde veio cada
 * pedaço, desenhados no lugar da peça (motor na frente, chassi no meio,
 * pneus nas rodas). É o que dá vontade de mostrar pros outros.
 */
function CartaoDaCriatura({ montagem, larga, tempo }: { montagem: Required<Montagem>; larga: boolean; tempo?: number | null }) {
  const curto = (n: Nave) => n.nome.replace(/^(VW|Chevrolet|Ford|Fiat|Toyota|Honda|Nissan|Mitsubishi|Volkswagen|BMW|Porsche|Audi) /, "");
  const etiqueta = (parte: Parte, n: Nave, estilo: object) => (
    <View style={[{ position: "absolute", paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "rgba(10,10,10,0.85)" }, estilo]}>
      <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 }}>{NOME_DA_PARTE[parte].toUpperCase()}</Text>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }} numberOfLines={1}>
        {curto(n)}
      </Text>
    </View>
  );
  const w = larga ? 420 : 300;
  return (
    <View className="border border-border" style={{ padding: larga ? 18 : 14, gap: 12, backgroundColor: colors.surfaceHigh }}>
      <View style={{ gap: 2 }}>
        <Text className="text-muted" style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
          SUA CRIATURA
        </Text>
        <Text className="text-on-surface" style={{ fontSize: larga ? 28 : 22, fontWeight: "900" }}>
          {nomeDaNave(montagem)}
        </Text>
        {tempo != null && (
          <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
            402 m em {formatarTempo(tempo)} s
          </Text>
        )}
      </View>
      <View style={{ width: w, maxWidth: "100%", height: larga ? 170 : 130, alignSelf: "center" }}>
        {/* Carroceria, cabine e rodas: o desenho é só o esqueleto pras etiquetas. */}
        <View style={{ position: "absolute", left: "8%", right: "8%", top: "38%", height: "28%", backgroundColor: colors.primaryContainer }} />
        <View style={{ position: "absolute", left: "30%", right: "30%", top: "18%", height: "24%", backgroundColor: "#991b1b" }} />
        <View style={{ position: "absolute", left: "34%", right: "52%", top: "22%", height: "16%", backgroundColor: "#9ec5ff", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: "52%", right: "34%", top: "22%", height: "16%", backgroundColor: "#9ec5ff", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: "15%", top: "56%", width: "17%", aspectRatio: 1, borderRadius: 999, backgroundColor: "#111", borderWidth: 4, borderColor: "#777" }} />
        <View style={{ position: "absolute", right: "15%", top: "56%", width: "17%", aspectRatio: 1, borderRadius: 999, backgroundColor: "#111", borderWidth: 4, borderColor: "#777" }} />
        {etiqueta("motor", montagem.motor, { right: 0, top: "8%" })}
        {etiqueta("chassi", montagem.chassi, { left: "34%", top: "44%" })}
        {etiqueta("cambio", montagem.cambio, { left: 0, top: "6%" })}
        {etiqueta("pneus", montagem.pneus, { left: 0, bottom: 0 })}
        {etiqueta("tracao", montagem.tracao, { right: 0, bottom: 0 })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- largada

/**
 * A árvore de largada: três âmbar, depois verde num tempo que ninguém
 * adivinha. O botão é o maior da tela: é o momento de tensão do jogo, e no
 * celular o dedo tem que achar ele sem olhar.
 */
function Largada({ onLargar }: { onLargar: (reacao: number | null) => void }) {
  const [acesas, setAcesas] = useState(0);
  const [verde, setVerde] = useState(false);
  const verdeEm = useRef<number | null>(null);
  const feito = useRef(false);
  const aperto = useSharedValue(1);
  const estiloDoBotao = useAnimatedStyle(() => ({ transform: [{ scale: aperto.value }] }));

  const apertar = () => {
    if (feito.current) return;
    feito.current = true;
    aperto.value = withSequence(withTiming(0.94, { duration: 70 }), withTiming(1, { duration: 160 }));
    vibrar(verdeEm.current == null ? "erro" : "leve");
    if (verdeEm.current == null) return onLargar(null); // queimou
    onLargar(Math.max(0.1, (Date.now() - verdeEm.current) / 1000));
  };

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    [400, 900, 1400].forEach((ms, i) =>
      t.push(
        setTimeout(() => {
          setAcesas(i + 1);
          bip();
        }, ms)
      )
    );
    const espera = 1400 + 600 + Math.random() * 1400;
    t.push(
      setTimeout(() => {
        verdeEm.current = Date.now();
        setVerde(true);
        bip(true);
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
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: acesa ? cor : colors.border,
        backgroundColor: acesa ? cor : "#111",
        shadowColor: cor,
        shadowOpacity: acesa ? 0.9 : 0,
        shadowRadius: acesa ? 14 : 0,
      }}
    />
  );

  return (
    <View className="items-center" style={{ gap: 16, paddingVertical: 6 }}>
      <View className="flex-row" style={{ gap: 12, padding: 12, backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: colors.border }}>
        {luz(acesas >= 1 && !verde, AMBAR)}
        {luz(acesas >= 2 && !verde, AMBAR)}
        {luz(acesas >= 3 && !verde, AMBAR)}
        {luz(verde, "#22c55e")}
      </View>
      <Animated.View style={[{ width: "100%" }, estiloDoBotao]}>
        <Pressable
          onPressIn={apertar}
          className="items-center justify-center"
          style={{ gap: 6, width: "100%", minHeight: 150, backgroundColor: verde ? VERDE : "#7f1d1d", borderWidth: 2, borderColor: verde ? "#4ade80" : colors.primary }}
          accessibilityRole="button"
          accessibilityLabel="Acelerar"
        >
          <Zap size={34} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 32, letterSpacing: 3 }}>{verde ? "ACELERA!" : "ACELERAR"}</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, fontWeight: "700", letterSpacing: 1 }}>
            {verde ? "AGORA!" : "ESPERE O VERDE"}
          </Text>
        </Pressable>
      </Animated.View>
      <Text className="text-muted" style={{ fontSize: 12.5, textAlign: "center" }}>
        Antes do verde é largada queimada.{Platform.OS === "web" ? " No PC, espaço também acelera." : ""}
      </Text>
    </View>
  );
}

// ----------------------------------------------------------------- corrida

/** Quanto do tempo real a animação usa: 12 s de racha viram uns 4 s de tela. */
const COMPRESSAO = 0.33;
/** Diferença em que o racha vira foto finish. */
const FOTO_FINISH = 0.05;
const ALTURA_DA_RAIA = 54;
const LARGURA_DO_CARRO = 52;

function Carrinho({ cor }: { cor: string }) {
  return (
    <View style={{ width: LARGURA_DO_CARRO, height: 24 }}>
      <View style={{ position: "absolute", left: 12, top: 0, width: 24, height: 10, backgroundColor: cor, opacity: 0.8 }} />
      <View style={{ position: "absolute", left: 14, top: 2, width: 9, height: 6, backgroundColor: "#9ec5ff", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: 0, top: 8, width: LARGURA_DO_CARRO, height: 10, backgroundColor: cor }} />
      <View style={{ position: "absolute", left: LARGURA_DO_CARRO - 4, top: 10, width: 4, height: 4, backgroundColor: "#fde68a" }} />
      <View style={{ position: "absolute", left: 7, top: 14, width: 11, height: 11, borderRadius: 6, backgroundColor: "#111", borderWidth: 2, borderColor: "#777" }} />
      <View style={{ position: "absolute", left: 34, top: 14, width: 11, height: 11, borderRadius: 6, backgroundColor: "#111", borderWidth: 2, borderColor: "#777" }} />
    </View>
  );
}

/** Bandeira quadriculada da chegada, em duas colunas. */
function LinhaDeChegada({ altura }: { altura: number }) {
  const lado = 6;
  const linhas = Math.ceil(altura / lado);
  return (
    <View style={{ position: "absolute", right: 0, top: 0, width: lado * 2, height: altura, overflow: "hidden" }}>
      {Array.from({ length: linhas }, (_, i) => (
        <View key={i} className="flex-row">
          <View style={{ width: lado, height: lado, backgroundColor: i % 2 ? "#fff" : "#111" }} />
          <View style={{ width: lado, height: lado, backgroundColor: i % 2 ? "#111" : "#fff" }} />
        </View>
      ))}
    </View>
  );
}

function Raia({
  rotulo,
  cor,
  reacao,
  tempo,
  relogio,
  pista,
  cronometro,
  chegou,
}: {
  rotulo: string;
  cor: string;
  reacao: number;
  tempo: number;
  relogio: SharedValue<number>;
  pista: number;
  cronometro: string;
  chegou: boolean;
}) {
  const estilo = useAnimatedStyle(() => {
    const t = relogio.value / COMPRESSAO - reacao;
    const p = Math.max(0, Math.min(1, t / tempo));
    // Arrancada acelera o tempo todo: começa devagar e termina voando.
    return { transform: [{ translateX: Math.pow(p, 1.6) * Math.max(0, pista - LARGURA_DO_CARRO) }] };
  });
  return (
    <View style={{ height: ALTURA_DA_RAIA, justifyContent: "center" }}>
      <View className="flex-row items-center justify-between" style={{ position: "absolute", top: 4, left: 18, right: 18 }}>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8 }} numberOfLines={1}>
          {rotulo}
        </Text>
        <Text style={{ color: chegou ? "#fff" : colors.muted, fontSize: 12, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{cronometro}</Text>
      </View>
      <Animated.View style={[{ marginTop: 14 }, estilo]}>
        <Carrinho cor={cor} />
      </Animated.View>
    </View>
  );
}

function Corrida({ racha, rival, onFim }: { racha: Racha; rival: Nave; onFim: () => void }) {
  const relogio = useSharedValue(0);
  const [largura, setLargura] = useState(0);
  const [decorrido, setDecorrido] = useState(0);
  const seu = racha.reacao + racha.tempo;
  const dele = racha.rivalReacao + racha.rivalTempo;
  const fim = Math.max(seu, dele) * COMPRESSAO;
  const fotoFinish = Math.abs(seu - dele) < FOTO_FINISH;

  useEffect(() => {
    if (!largura) return;
    relogio.value = withTiming(fim, { duration: fim * 1000, easing: Easing.linear });
    ronco(Math.min(seu, dele) * COMPRESSAO);
    const inicio = Date.now();
    // O cronômetro na tela, em tempo de racha (não de animação).
    const relogioDaTela = setInterval(() => setDecorrido((Date.now() - inicio) / 1000 / COMPRESSAO), 40);
    const t = setTimeout(onFim, fim * 1000 + (fotoFinish ? 1600 : 500));
    return () => {
      clearInterval(relogioDaTela);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largura]);

  const pista = Math.max(0, largura - 28);
  const crono = (total: number) => formatarTempo(Math.min(decorrido, total));
  const acabou = decorrido >= Math.max(seu, dele);

  return (
    <View style={{ gap: 10 }}>
      <View
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        style={{ backgroundColor: "#141414", borderWidth: 1, borderColor: colors.border, paddingVertical: 6, overflow: "hidden" }}
      >
        {largura > 0 && (
          <View style={{ paddingLeft: 8, paddingRight: 20 }}>
            {/* A faixa tracejada entre as raias. */}
            <View className="flex-row" style={{ position: "absolute", left: 8, right: 20, top: ALTURA_DA_RAIA + 1, gap: 14 }}>
              {Array.from({ length: Math.ceil(pista / 30) }, (_, i) => (
                <View key={i} style={{ width: 16, height: 2, backgroundColor: "#d4d4d4", opacity: 0.35 }} />
              ))}
            </View>
            <Raia
              rotulo="SUA NAVE"
              cor={colors.primary}
              reacao={racha.reacao}
              tempo={racha.tempo}
              relogio={relogio}
              pista={pista}
              cronometro={crono(seu)}
              chegou={decorrido >= seu}
            />
            <Raia
              rotulo={rival.nome.toUpperCase()}
              cor="#d4d4d4"
              reacao={racha.rivalReacao}
              tempo={racha.rivalTempo}
              relogio={relogio}
              pista={pista}
              cronometro={crono(dele)}
              chegou={decorrido >= dele}
            />
          </View>
        )}
        <LinhaDeChegada altura={ALTURA_DA_RAIA * 2 + 12} />
      </View>
      {acabou && fotoFinish ? (
        <Surgir>
          <Text style={{ color: "#facc15", fontSize: 22, fontWeight: "900", letterSpacing: 2, textAlign: "center" }}>
            FOTO FINISH! {formatarTempo(Math.abs(seu - dele))} s
          </Text>
        </Surgir>
      ) : (
        <View className="flex-row justify-between">
          <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700" }}>
            LARGADA
          </Text>
          <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700" }}>
            402 M
          </Text>
        </View>
      )}
    </View>
  );
}

// ------------------------------------------------------------ dias passados

function estadoDoDia(dia: string): string {
  const p = lerJson<Partida>(`frankenstein:dia:${dia}`);
  if (!p) return "não jogou";
  if (p.etapa === "fim") return p.vitorias >= RIVAIS.length ? "zerou!" : `${p.vitorias}/${RIVAIS.length} fases`;
  return "em andamento";
}

/** Os desafios que passaram: quem chegou agora joga os que perdeu. */
function ListaDeDias({ dia, hoje }: { dia: string; hoje: string }) {
  const dias = [hoje, ...diasAnteriores(hoje)];
  return (
    <View className="border border-border" style={{ backgroundColor: colors.surfaceContainer }}>
      {dias.map((d, i) => {
        const estado = estadoDoDia(d);
        const atual = d === dia;
        return (
          <Pressable
            key={d}
            onPress={() => router.replace((d === hoje ? "/frankenstein" : `/frankenstein?dia=${d}`) as never)}
            className="flex-row items-center active:bg-white/5"
            style={{
              gap: 12,
              paddingVertical: 11,
              paddingHorizontal: 14,
              borderTopWidth: i ? 1 : 0,
              borderColor: colors.border,
              backgroundColor: atual ? colors.surfaceHigh : "transparent",
            }}
            accessibilityRole="link"
          >
            <Text className="text-primary" style={{ width: 34, fontSize: 13, fontWeight: "800" }}>
              #{numeroDoDia(d)}
            </Text>
            <Text className="text-on-surface" style={{ flex: 1, fontSize: 14, fontWeight: atual ? "800" : "600" }}>
              {d === hoje ? "Hoje" : dataCurta(d)}
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: estado === "não jogou" ? colors.muted : estado === "em andamento" ? "#facc15" : "#4ade80" }}>
              {estado}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ a tela

export default function FrankensteinScreen() {
  const larga = useLarguraAmpla();
  const hoje = hojeEmBrasilia();
  // ?dia=2026-10-14 abre o desafio de um dia passado; sem ele, o de hoje.
  const { dia: param } = useLocalSearchParams<{ dia?: string }>();
  const dia = diaPedido(param, hoje);
  const passado = dia !== hoje;
  const [verDias, setVerDias] = useState(false);
  const numero = numeroDoDia(dia);
  const chaveDoDia = `frankenstein:dia:${dia}`;

  const [partida, setPartida] = useState<Partida>(() => novaPartida("dia", sementeDoDia(dia)));
  const [recorde, setRecorde] = useState(0);
  const [confete, setConfete] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [som, setSom] = useState(true);
  useEffect(() => setSom(somLigado()), []);
  const rolagem = useRef<ScrollView>(null);
  const fila = useMemo(() => filaDeDoadores(partida.semente), [partida.semente]);

  // Volta o desafio do dia de onde parou.
  useEffect(() => {
    setRecorde(lerJson<number>(CHAVE_DO_RECORDE) ?? 0);
    setVerDias(false);
    const salva = lerJson<Partida>(chaveDoDia);
    if (!salva) {
      setPartida(novaPartida("dia", sementeDoDia(dia)));
      return;
    }
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
      depois: partida.modo === "dia" && passado,
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
                {m === "dia" ? `DESAFIO #${numero}${passado ? ` · ${dataCurta(dia).slice(5)}` : ""}` : "TREINO"}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setVerDias((v) => !v)}
          className="flex-row items-center justify-center border border-border"
          style={{ marginLeft: "auto", gap: 6, paddingHorizontal: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dias anteriores"
        >
          <CalendarDays size={16} color={verDias ? colors.primary : colors.onSurface} />
          <Text style={{ color: verDias ? colors.primary : colors.onSurface, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 }}>DIAS</Text>
        </Pressable>
        {Platform.OS === "web" && (
          <Pressable
            onPress={() => {
              ligarSom(!som);
              setSom(!som);
            }}
            className="items-center justify-center border border-border"
            style={{ width: 40 }}
            accessibilityRole="button"
            accessibilityLabel={som ? "Desligar o som" : "Ligar o som"}
          >
            {som ? <Volume2 size={17} color={colors.onSurface} /> : <VolumeX size={17} color={colors.muted} />}
          </Pressable>
        )}
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
          {(() => {
            // No treino, cada peça livre mostra o 402 da nave com ela (as
            // vagas ainda abertas entram com peças de carro de rua comum).
            // No desafio do dia não: lá a graça é decidir no olho.
            const treino = !oficina && partida.modo === "livre";
            const estimativas = new Map<Parte, number>();
            if (treino) {
              const montagem: Montagem = {};
              for (const x of PARTES) {
                const n = nave(partida.montagem[x]);
                if (n) montagem[x] = n;
              }
              for (const x of PARTES) if (!partida.montagem[x]) estimativas.set(x, tempoComPeca(montagem, x, doador));
            }
            const melhor = Math.min(...estimativas.values());
            return PARTES.map((p) => {
            const ocupada = !oficina && !!partida.montagem[p];
            // Na oficina, mostra quanto o 402 muda com a troca.
            let efeito: string | null = null;
            if (oficina && completa) {
              const t = tempoNo402(fichaDa({ ...completa, [p]: doador }));
              const d = t - tempoNo402(fichaDa(completa));
              efeito =
                Math.abs(d) < 0.0005 ? "não muda" : `${formatarTempo(t)} s (${d < 0 ? "−" : "+"}${formatarTempo(Math.abs(d))})`;
            }
            const estimativa = estimativas.get(p);
            if (estimativa != null) efeito = `≈ ${formatarTempo(estimativa)} s${estimativa === melhor ? " ★" : ""}`;
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
                  <Text style={{ fontSize: 12, fontWeight: "700", color: efeito.includes("−") || efeito.includes("★") ? "#4ade80" : efeito.includes("+") ? "#f87171" : colors.muted }}>{efeito}</Text>
                ) : null}
              </Pressable>
            );
            });
          })()}
        </View>
        {partida.modo === "livre" && !oficina && (
          <Text className="text-muted" style={{ fontSize: 11.5 }}>
            Treino: o tempo ao lado é a nave com aquela peça e as vagas abertas com peças de um carro de rua. ★ é a melhor escolha agora.
          </Text>
        )}
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
        {completa && <CartaoDaCriatura montagem={completa} larga={larga} />}
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
          {!r.queimou && r.venceu && (
            <Text className="text-on-surface-variant" style={{ fontSize: 14 }}>
              Na frente por {formatarTempo(Math.abs(dele - seu))} s{Math.abs(dele - seu) < 0.05 ? ", no foto finish!" : ""}
            </Text>
          )}
          {r.queimou && (
            <Text className="text-on-surface-variant" style={{ fontSize: 14, lineHeight: 20 }}>
              Você acelerou antes do verde. Espere a última luz verde acender: a reação boa fica entre 0,2 e 0,4 s.
            </Text>
          )}
          {!r.queimou && !r.venceu && completa && (
            <View style={{ gap: 6 }}>
              {porQuePerdeu(completa, r, rival.nave.nome).map((frase, i) => (
                <Text key={i} className={i === 0 ? "text-on-surface" : "text-on-surface-variant"} style={{ fontSize: i === 0 ? 15 : 13.5, fontWeight: i === 0 ? "800" : "400", lineHeight: 20 }}>
                  {frase}
                </Text>
              ))}
            </View>
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
          {completa && <CartaoDaCriatura montagem={completa} larga={larga} tempo={partida.melhorTempo} />}
          {completa && <PrimaryButton label="Compartilhar resultado" onPress={compartilhar} icon={<Share2 size={15} color={colors.onPrimaryContainer} />} />}
          <Pressable
            onPress={jogarLivre}
            className="flex-row items-center justify-center border border-outline active:bg-white/5"
            style={{ gap: 8, paddingVertical: 13 }}
          >
            <RefreshCw size={15} color={colors.onSurface} />
            <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1 }}>
              {partida.modo === "dia" ? "TREINAR" : "JOGAR DE NOVO"}
            </Text>
          </Pressable>
          {partida.modo === "dia" && (
            <Text className="text-muted" style={{ fontSize: 12 }}>
              {passado ? "Desafio de dia passado: o de hoje tem outros carros na rolada." : "Amanhã tem outro desafio, com outros carros na rolada."}
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
        {verDias && <ListaDeDias dia={dia} hoje={hoje} />}
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
