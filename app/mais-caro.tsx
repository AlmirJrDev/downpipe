/**
 * Mais Caro ou Mais Barato? (ver utils/maisCaro).
 *
 * Aberto pra quem não tem conta, como a Nave do Dia: o recorde é o que se
 * manda no grupo ("fiz 14 seguidos, duvido"), e quem chega pelo link joga
 * na hora. O recorde fica no aparelho.
 */
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Share2 } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import Animated from "react-native-reanimated";
import { Confete, MaisUm, Surgir, usePulo, useTremor, vibrar } from "@/components/jogos/Animacoes";
import { FotoDoCarro, temFoto } from "@/components/jogos/FotoDoCarro";
import { Share } from "@/utils/share";
import { voltarOuIrPara } from "@/utils/navigation";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import {
  REFERENCIA,
  acertou,
  primeiroCarro,
  proximoCarro,
  reais,
  textoDeCompartilhar,
  type CarroDoJogo,
  type Chute,
} from "@/utils/maisCaro";
import { colors } from "@/constants/theme";

const CHAVE_DO_RECORDE = "mais-caro:recorde";
const VERDE = "#15803d";
const VERMELHO = "#b91c1c";

function lerRecorde(): number {
  try {
    return Platform.OS === "web" ? Number(localStorage.getItem(CHAVE_DO_RECORDE)) || 0 : 0;
  } catch {
    return 0;
  }
}
function salvarRecorde(n: number) {
  try {
    if (Platform.OS === "web") localStorage.setItem(CHAVE_DO_RECORDE, String(n));
  } catch {
    // Sem storage: o recorde vale só nesta partida.
  }
}

/** O preço subindo do zero até o valor: o suspense de quando revela. */
function usePrecoAnimado(alvo: number | null, duracao = 650) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (alvo == null) return setValor(0);
    const inicio = Date.now();
    let quadro: ReturnType<typeof requestAnimationFrame>;
    const passo = () => {
      const t = Math.min(1, (Date.now() - inicio) / duracao);
      setValor(Math.round(alvo * (1 - Math.pow(1 - t, 3))));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    passo();
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);
  return valor;
}

function Cartao({
  carro,
  mostrarPreco,
  resultado,
  largo,
}: {
  carro: CarroDoJogo;
  /** null: escondido; número: o valor que aparece (pode estar animando). */
  mostrarPreco: number | null;
  resultado?: "certo" | "errado" | null;
  largo: boolean;
}) {
  const borda = resultado === "certo" ? VERDE : resultado === "errado" ? VERMELHO : colors.border;
  const idDaFoto = `fipe:${carro.id}`;
  const comFoto = temFoto(idDaFoto);
  return (
    <View
      style={{
        flex: 1,
        minHeight: largo ? 340 : 190,
        borderWidth: resultado ? 2 : 1,
        borderColor: borda,
        backgroundColor: colors.surfaceHigh,
        padding: largo ? 28 : 18,
        paddingTop: comFoto ? 0 : largo ? 28 : 18,
        justifyContent: "space-between",
        overflow: "hidden",
        gap: 10,
      }}
    >
      {/* A foto, quando há uma conferida (ver utils/fotosDosCarros.json). */}
      {comFoto && (
        <View style={{ marginHorizontal: largo ? -28 : -18 }}>
          <FotoDoCarro id={idDaFoto} altura={largo ? 190 : 120} credito={false} />
        </View>
      )}
      {/* O ano gigante e apagado ao fundo: é o que dá cara ao cartão sem foto. */}
      <Text
        aria-hidden
        style={{
          position: "absolute",
          right: -8,
          bottom: largo ? -30 : -18,
          fontSize: largo ? 150 : 96,
          fontWeight: "900",
          color: "rgba(255,255,255,0.04)",
        }}
      >
        {carro.ano}
      </Text>
      <View style={{ gap: 6 }}>
        <Text className="text-on-surface-variant" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.4 }}>
          {carro.ano} · {carro.combustivel.toUpperCase()}
        </Text>
        <Text className="text-on-surface" style={{ fontSize: largo ? 28 : 21, fontWeight: "800", lineHeight: largo ? 32 : 25 }}>
          {carro.nome}
        </Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.4 }}>
          TABELA FIPE
        </Text>
        <Text
          style={{
            fontSize: largo ? 40 : 30,
            fontWeight: "900",
            color: mostrarPreco == null ? colors.onSurfaceVariant : colors.onSurface,
            fontVariant: ["tabular-nums"],
          }}
        >
          {mostrarPreco == null ? "R$ ???" : reais(mostrarPreco)}
        </Text>
      </View>
    </View>
  );
}

type Fase = "jogando" | "revelando" | "fim";

export default function MaisCaroScreen() {
  const largo = useLarguraAmpla();
  const [mostrado, setMostrado] = useState<CarroDoJogo>(() => primeiroCarro());
  const [escondido, setEscondido] = useState<CarroDoJogo>(() => proximoCarro(mostrado, [], 0));
  const [sequencia, setSequencia] = useState(0);
  const [recorde, setRecorde] = useState(0);
  const [fase, setFase] = useState<Fase>("jogando");
  const [certo, setCerto] = useState<boolean | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const recentes = useRef<string[]>([]);
  // Animações: tremida no erro, placar que pula, confete no recorde.
  const tremor = useTremor();
  const placar = usePulo();
  const [maisUm, setMaisUm] = useState(0);
  const [confete, setConfete] = useState(0);
  const [bateuRecorde, setBateuRecorde] = useState(false);
  /** O recorde de quando a partida começou: passar dele é o que comemora. */
  const recordeDaPartida = useRef(0);
  const precoRevelado = usePrecoAnimado(fase === "jogando" ? null : escondido.preco);

  useEffect(() => {
    const r = lerRecorde();
    setRecorde(r);
    recordeDaPartida.current = r;
  }, []);

  const chutar = (chute: Chute) => {
    if (fase !== "jogando") return;
    const ok = acertou(chute, mostrado, escondido);
    setCerto(ok);
    setFase("revelando");
    if (ok) vibrar("acerto");
    else {
      vibrar("erro");
      // Espera o preço aparecer pra tremer: é aí que a ficha cai.
      setTimeout(tremor.tremer, 450);
    }
    // Errou: o fim de jogo vem sozinho. Acertou: a pessoa lê o preço e a
    // diferença e segue quando quiser (ver continuar).
    if (!ok) setTimeout(() => setFase("fim"), 1300);
  };

  /** Depois do acerto: soma o ponto e traz o próximo carro. */
  const continuar = () => {
    if (fase !== "revelando" || !certo) return;
    const nova = sequencia + 1;
    setSequencia(nova);
    placar.pular();
    setMaisUm(Date.now());
    // Confete ao passar o recorde (uma vez por partida) e a cada 10.
    const primeiroRecorde = !bateuRecorde && recordeDaPartida.current > 0 && nova > recordeDaPartida.current;
    if (primeiroRecorde) setBateuRecorde(true);
    if (primeiroRecorde || nova % 10 === 0) setConfete(Date.now());
    if (nova > recorde) {
      setRecorde(nova);
      salvarRecorde(nova);
    }
    recentes.current = [...recentes.current, mostrado.id].slice(-12);
    setMostrado(escondido);
    setEscondido(proximoCarro(escondido, recentes.current, nova));
    setCerto(null);
    setFase("jogando");
  };

  // No PC: setas chutam e Enter continua.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const tecla = (e: KeyboardEvent) => {
      if (fase === "jogando" && e.key === "ArrowUp") chutar("mais");
      else if (fase === "jogando" && e.key === "ArrowDown") chutar("menos");
      else if (fase === "revelando" && (e.key === "Enter" || e.key === "ArrowRight" || e.code === "Space")) {
        e.preventDefault();
        continuar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const recomecar = () => {
    const primeiro = primeiroCarro();
    recentes.current = [];
    setMostrado(primeiro);
    setEscondido(proximoCarro(primeiro, [], 0));
    setSequencia(0);
    setCerto(null);
    setAviso(null);
    setBateuRecorde(false);
    recordeDaPartida.current = recorde;
    setFase("jogando");
  };

  const compartilhar = async () => {
    try {
      await Share.share({ message: textoDeCompartilhar(sequencia) });
    } catch {
      setAviso("Não deu pra compartilhar daqui. Tira um print!");
    }
  };

  const botoes = (
    <View style={{ flexDirection: largo ? "column" : "row", gap: 10, justifyContent: "center" }}>
      <Pressable
        onPress={() => chutar("mais")}
        disabled={fase !== "jogando"}
        className="flex-row items-center justify-center active:opacity-80"
        style={{ flex: largo ? undefined : 1, gap: 8, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: colors.primary, opacity: fase === "jogando" ? 1 : 0.5 }}
        accessibilityRole="button"
      >
        <ArrowUp size={18} color={colors.onPrimaryContainer} />
        <Text style={{ color: colors.onPrimaryContainer, fontWeight: "800", letterSpacing: 1.2 }}>MAIS CARO</Text>
      </Pressable>
      <Pressable
        onPress={() => chutar("menos")}
        disabled={fase !== "jogando"}
        className="flex-row items-center justify-center border border-outline active:bg-white/5"
        style={{ flex: largo ? undefined : 1, gap: 8, paddingVertical: 16, paddingHorizontal: 20, opacity: fase === "jogando" ? 1 : 0.5 }}
        accessibilityRole="button"
      >
        <ArrowDown size={18} color={colors.onSurface} />
        <Text className="text-on-surface" style={{ fontWeight: "800", letterSpacing: 1.2 }}>
          MAIS BARATO
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="MAIS CARO OU MAIS BARATO?"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)")} accessibilityRole="button" accessibilityLabel="Voltar">
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: largo ? 32 : 16, paddingBottom: 48, maxWidth: 1120, width: "100%", alignSelf: "center", gap: 18 }}
      >
        <View className="flex-row items-end justify-between" style={{ gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text className="text-on-surface" style={{ fontSize: largo ? 26 : 19, fontWeight: "800" }}>
              Esse vale mais ou menos?
            </Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
              Tabela FIPE{REFERENCIA ? ` de ${REFERENCIA}` : ""}. Acertou, vem outro.
            </Text>
          </View>
          <View className="items-end">
            <Animated.Text
              style={[{ color: colors.primary, fontSize: largo ? 34 : 26, fontWeight: "900", fontVariant: ["tabular-nums"] }, placar.estilo]}
            >
              {sequencia}
            </Animated.Text>
            <MaisUm disparo={maisUm} cor="#4ade80" />
            {bateuRecorde && fase !== "fim" && (
              <Text style={{ color: "#facc15", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>NOVO RECORDE!</Text>
            )}
            <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
              RECORDE {recorde}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: largo ? "row" : "column", gap: largo ? 20 : 10, alignItems: largo ? "center" : "stretch" }}>
          <Surgir key={`m-${mostrado.id}-${sequencia}`} style={{ flex: largo ? 1 : undefined }}>
            <Cartao carro={mostrado} mostrarPreco={mostrado.preco} largo={largo} />
          </Surgir>
          <View className="items-center justify-center" style={{ gap: 10 }}>
            <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 14, letterSpacing: 2 }}>VS</Text>
            {largo && fase === "jogando" && botoes}
          </View>
          <Animated.View style={[{ flex: largo ? 1 : undefined }, tremor.estilo]}>
            <Surgir key={`e-${escondido.id}-${sequencia}`} atraso={120} style={{ flex: largo ? 1 : undefined }}>
              <Cartao
                carro={escondido}
                mostrarPreco={fase === "jogando" ? null : precoRevelado}
                resultado={certo == null ? null : certo ? "certo" : "errado"}
                largo={largo}
              />
            </Surgir>
          </Animated.View>
        </View>

        {!largo && fase === "jogando" && botoes}

        {fase === "revelando" && (
          <Surgir style={{ gap: 10, alignItems: "center" }}>
            <Text style={{ textAlign: "center", fontWeight: "900", fontSize: 22, letterSpacing: 1, color: certo ? "#4ade80" : "#f87171" }}>
              {certo ? "ACERTOU!" : "ERROU…"}
            </Text>
            <Text className="text-on-surface-variant" style={{ textAlign: "center", fontSize: 14.5 }}>
              {escondido.nome} {escondido.ano} é{" "}
              <Text className="text-on-surface" style={{ fontWeight: "800" }}>
                {reais(Math.abs(escondido.preco - mostrado.preco))} {escondido.preco >= mostrado.preco ? "mais caro" : "mais barato"}
              </Text>{" "}
              que o {mostrado.nome}.
            </Text>
            {certo && (
              <View style={{ width: "100%", maxWidth: 420 }}>
                <PrimaryButton label="Continuar" onPress={continuar} icon={<ArrowRight size={16} color={colors.onPrimaryContainer} />} />
                {largo && (
                  <Text className="text-muted" style={{ fontSize: 11.5, textAlign: "center", marginTop: 6 }}>
                    Enter continua · ↑ mais caro · ↓ mais barato
                  </Text>
                )}
              </View>
            )}
          </Surgir>
        )}

        {fase === "fim" && (
          <Surgir>
          <View className="border border-border p-4" style={{ gap: 10, backgroundColor: colors.surfaceHigh }}>
            <Text style={{ color: VERMELHO, fontSize: 12, fontWeight: "700", letterSpacing: 1.4 }}>FIM DE JOGO</Text>
            <Text className="text-on-surface" style={{ fontSize: 20, fontWeight: "800" }}>
              {sequencia === 0 ? "Errou de cara" : `${sequencia} seguido${sequencia === 1 ? "" : "s"}`}
              {sequencia > 0 && sequencia >= recorde ? " · novo recorde!" : ""}
            </Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 13.5 }}>
              {escondido.nome} {escondido.ano} vale {reais(escondido.preco)}, contra {reais(mostrado.preco)} do {mostrado.nome}.
            </Text>
            <View style={{ flexDirection: largo ? "row" : "column", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Jogar de novo" onPress={recomecar} icon={<RotateCcw size={15} color={colors.onPrimaryContainer} />} />
              </View>
              <Pressable
                onPress={compartilhar}
                className="flex-row items-center justify-center border border-outline active:bg-white/5"
                style={{ flex: 1, gap: 8, paddingVertical: 14 }}
              >
                <Share2 size={15} color={colors.onSurface} />
                <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1.1 }}>
                  COMPARTILHAR
                </Text>
              </Pressable>
            </View>
            {aviso && (
              <Text className="text-muted" style={{ fontSize: 12 }}>
                {aviso}
              </Text>
            )}
          </View>
          </Surgir>
        )}

        <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 16 }}>
          Preço médio da Tabela FIPE pro ano e versão mostrados. A FIPE é referência de mercado, não preço de anúncio.
        </Text>
      </ScrollView>
      <Confete disparo={confete} quantidade={50} />
    </View>
  );
}
