/**
 * Nave do Dia — adivinhe o carro de hoje (ver utils/naveDoDia).
 *
 * Aberta pra quem não tem conta, como a página de um encontro: é o tipo de
 * coisa que se manda no grupo do WhatsApp, e quem chega pelo link joga
 * antes de saber o que é o Downpipe. O progresso do dia fica no aparelho.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ArrowDown, ArrowLeft, ArrowUp, Share2 } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { Share } from "@/utils/share";
import { voltarOuIrPara } from "@/utils/navigation";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import {
  NAVES,
  comparar,
  hojeEmBrasilia,
  naveDoDia,
  numeroDoDia,
  textoDeCompartilhar,
  type Cor,
  type Nave,
} from "@/utils/naveDoDia";
import { colors } from "@/constants/theme";

const FUNDO: Record<Cor, string> = { verde: "#15803d", amarelo: "#a16207", vermelho: "#7f1d1d" };
/** Tamanho das peças: no celular, fixo e rola de lado; no computador, cresce até encher a linha. */
interface Medidas {
  pista: number;
  nome: number;
  altura: number;
  fonte: number;
}
const CELULAR: Medidas = { pista: 78, nome: 132, altura: 58, fonte: 12 };
const VAO = 4;

function medidasPara(larga: boolean, espaco: number): Medidas {
  if (!larga || espaco <= 0) return CELULAR;
  const nome = 190;
  const pista = Math.max(CELULAR.pista, Math.min(132, Math.floor((espaco - nome - VAO * 8) / 8)));
  return { pista, nome, altura: 76, fonte: 14 };
}
const COLUNAS = ["Marca", "País", "Carroceria", "Motor", "Tração", "Cilindros", "Ano", "Potência"];

/** O que já se jogou hoje, guardado no aparelho (some sozinho no dia seguinte). */
function useProgresso(dia: string) {
  const chave = `nave-do-dia:${dia}`;
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const salvo = Platform.OS === "web" ? localStorage.getItem(chave) : null;
      if (salvo) setIds(JSON.parse(salvo));
    } catch {
      // Sem storage (aba anônima): joga do mesmo jeito, só não lembra.
    }
  }, [chave]);
  const adicionar = (id: string) =>
    setIds((atual) => {
      const novo = [...atual, id];
      try {
        if (Platform.OS === "web") localStorage.setItem(chave, JSON.stringify(novo));
      } catch {
        // idem
      }
      return novo;
    });
  return { ids, adicionar };
}

/** "Próxima nave em 05:12:40" — meia-noite de Brasília. */
function useContagem() {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const amanha = new Date(`${hojeEmBrasilia(new Date(agora + 86_400_000))}T00:00:00-03:00`).getTime();
  const s = Math.max(0, Math.floor((amanha - agora) / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function Linha({ chute, alvo, m }: { chute: Nave; alvo: Nave; m: Medidas }) {
  const pistas = comparar(chute, alvo);
  const acertou = chute.id === alvo.id;
  return (
    <View className="flex-row" style={{ gap: VAO }}>
      <View
        className="justify-center px-2"
        style={{
          width: m.nome,
          height: m.altura,
          borderWidth: 1,
          borderColor: acertou ? FUNDO.verde : colors.border,
          backgroundColor: colors.surfaceHigh,
        }}
      >
        <Text className="text-on-surface" style={{ fontSize: m.fonte, fontWeight: "700" }} numberOfLines={3}>
          {chute.nome}
        </Text>
      </View>
      {pistas.map((p) => (
        <View
          key={p.chave}
          className="items-center justify-center px-1"
          style={{ width: m.pista, height: m.altura, backgroundColor: FUNDO[p.cor] }}
          accessibilityLabel={`${p.rotulo}: ${p.valor}, ${p.cor}${p.seta ? `, o carro do dia é ${p.seta === "cima" ? "maior" : "menor"}` : ""}`}
        >
          <Text style={{ color: "#fff", fontSize: m.fonte, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
            {p.valor}
          </Text>
          {p.seta === "cima" && <ArrowUp size={m.fonte + 2} color="#fff" />}
          {p.seta === "baixo" && <ArrowDown size={m.fonte + 2} color="#fff" />}
        </View>
      ))}
    </View>
  );
}

export default function NaveDoDiaScreen() {
  const dia = hojeEmBrasilia();
  const alvo = useMemo(() => naveDoDia(dia), [dia]);
  const { ids, adicionar } = useProgresso(dia);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const contagem = useContagem();
  // No computador a tela sai da coluna estreita (ver useLarguraAmpla) e as
  // peças crescem até encher a linha: a galera joga muito pelo PC.
  const larga = useLarguraAmpla();
  const [espaco, setEspaco] = useState(0);
  const m = medidasPara(larga, espaco);

  const palpites = ids.map((id) => NAVES.find((n) => n.id === id)).filter((n): n is Nave => !!n);
  const venceu = palpites.some((p) => p.id === alvo.id);

  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return NAVES.filter(
      (n) => !ids.includes(n.id) && `${n.nome} ${n.marca}`.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [busca, ids]);

  const chutar = (n: Nave) => {
    adicionar(n.id);
    setBusca("");
  };

  const compartilhar = async () => {
    const texto = textoDeCompartilhar(palpites, alvo, dia);
    try {
      await Share.share({ message: texto });
    } catch {
      setAviso("Não deu pra compartilhar daqui. Tira um print!");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="NAVE DO DIA"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)")} accessibilityRole="button" accessibilityLabel="Voltar">
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: larga ? 32 : 16,
          paddingBottom: 48,
          maxWidth: 1120,
          width: "100%",
          alignSelf: "center",
          gap: larga ? 20 : 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View onLayout={(e) => setEspaco(e.nativeEvent.layout.width)} style={{ width: "100%", height: 0 }} />
        <View style={{ gap: 6 }}>
          <Text className="text-primary" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.4 }}>
            #{numeroDoDia(dia)}
          </Text>
          <Text className="text-on-surface" style={{ fontSize: larga ? 30 : 22, fontWeight: "800" }}>
            Qual é a nave de hoje?
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 13.5, lineHeight: 19 }}>
            Chuta um carro. Cada palpite mostra o que bate com a nave do dia: verde acertou, amarelo chegou perto,
            vermelho nada a ver. Nos números, a seta diz pra que lado ir.
          </Text>
        </View>

        {venceu ? (
          <View className="border border-border p-4" style={{ gap: 10, backgroundColor: colors.surfaceHigh }}>
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700", letterSpacing: 1.4 }}>ACERTOU</Text>
            <Text className="text-on-surface" style={{ fontSize: 19, fontWeight: "800" }}>
              {alvo.nome}
            </Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 13.5 }}>
              {palpites.length === 1 ? "De primeira!" : `Em ${palpites.length} palpites.`} Próxima nave em {contagem}.
            </Text>
            <PrimaryButton
              label="Compartilhar resultado"
              onPress={compartilhar}
              icon={<Share2 size={15} color={colors.onPrimaryContainer} />}
            />
            {aviso && (
              <Text className="text-muted" style={{ fontSize: 12 }}>
                {aviso}
              </Text>
            )}
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <TextInput
              value={busca}
              onChangeText={setBusca}
              // Enter chuta a primeira sugestão: no PC ninguém quer ir no mouse.
              onSubmitEditing={() => sugestoes[0] && chutar(sugestoes[0])}
              returnKeyType="go"
              autoFocus={larga}
              blurOnSubmit={false}
              placeholder="Digite um carro ou marca: Civic, Opala, Golf…"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              style={{
                backgroundColor: colors.inputSurface,
                color: colors.onInputSurface,
                paddingHorizontal: 14,
                paddingVertical: larga ? 16 : 14,
                fontSize: larga ? 17 : 15,
              }}
            />
            {larga && sugestoes.length > 0 && (
              <Text className="text-muted" style={{ fontSize: 12 }}>
                Enter escolhe a primeira.
              </Text>
            )}
            {sugestoes.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => chutar(n)}
                className="border border-border px-4 py-3 active:bg-white/5"
              >
                <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
                  {n.nome}
                </Text>
              </Pressable>
            ))}
            {busca.trim().length > 1 && sugestoes.length === 0 && (
              <Text className="text-muted" style={{ fontSize: 12.5 }}>
                Esse não está na garagem do jogo. Tenta outro.
              </Text>
            )}
          </View>
        )}

        {palpites.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ gap: VAO }}>
              <View className="flex-row" style={{ gap: VAO }}>
                <Text className="text-muted" style={{ width: m.nome, fontSize: larga ? 11.5 : 10.5, fontWeight: "700", letterSpacing: 1 }}>
                  CARRO
                </Text>
                {COLUNAS.map((c) => (
                  <Text
                    key={c}
                    className="text-muted"
                    style={{ width: m.pista, fontSize: larga ? 11.5 : 10, fontWeight: "700", letterSpacing: 0.4, textAlign: "center" }}
                    numberOfLines={1}
                  >
                    {c.toUpperCase()}
                  </Text>
                ))}
              </View>
              {/* O palpite mais novo em cima: é o que a pessoa quer ver. */}
              {[...palpites].reverse().map((p) => (
                <Linha key={p.id} chute={p} alvo={alvo} m={m} />
              ))}
            </View>
          </ScrollView>
        )}

        <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 16 }}>
          {NAVES.length} carros na garagem do jogo. Potência de fábrica da versão, arredondada: o amarelo cobre a
          diferença entre fontes. Um carro novo todo dia à meia-noite.
        </Text>
      </ScrollView>
    </View>
  );
}
