/**
 * O jogo da Nave do Dia — adivinhe o carro de hoje (ver utils/naveDoDia).
 * Uma tela por modo (app/nave-do-dia e app/nave-do-dia-brasil), o mesmo jogo.
 *
 * Aberta pra quem não tem conta, como a página de um encontro: é o tipo de
 * coisa que se manda no grupo do WhatsApp, e quem chega pelo link joga
 * antes de saber o que é o Downpipe. O progresso do dia fica no aparelho.
 *
 * Cada palpite se revela peça por peça; o acerto solta confete e o cartão
 * da vitória (ver components/jogos/Animacoes).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, CircleHelp, Flame, Lightbulb, Share2, Trophy, X } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { Confete, Surgir, Virar, vibrar } from "@/components/jogos/Animacoes";
import { FotoDoCarro } from "@/components/jogos/FotoDoCarro";
import { buscarNaves, dicas, DICAS_EM } from "@/utils/naveDoDiaAjuda";
import { Share } from "@/utils/share";
import { router, useLocalSearchParams } from "expo-router";
import { dataCurta, diaPedido, diasAnteriores } from "@/utils/diasAnteriores";
import { voltarOuIrPara } from "@/utils/navigation";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import {
  MODOS,
  comparar,
  hojeEmBrasilia,
  naveDoDia,
  numeroDoDia,
  textoDeCompartilhar,
  type Cor,
  type Modo,
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
const CELULAR: Medidas = { pista: 78, nome: 108, altura: 58, fonte: 12 };
const VAO = 4;

function medidasPara(larga: boolean, espaco: number): Medidas {
  if (!larga || espaco <= 0) return CELULAR;
  const nome = 190;
  const pista = Math.max(CELULAR.pista, Math.min(132, Math.floor((espaco - nome - VAO * 9) / 8)));
  return { pista, nome, altura: 76, fonte: 14 };
}
const COLUNAS = ["Marca", "País", "Carroceria", "Motor", "Tração", "Cilindros", "Ano", "Potência"];

/** Intervalo entre uma peça e a próxima na revelação. */
const PASSO = 140;
/** Quanto a linha leva pra se revelar inteira (nome + 8 pistas). */
const REVELACAO = PASSO * 8 + 380;

const lerJson = <T,>(chave: string): T | null => {
  try {
    const t = Platform.OS === "web" ? localStorage.getItem(chave) : null;
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    // Sem storage (aba anônima): joga do mesmo jeito, só não lembra.
    return null;
  }
};
const gravarJson = (chave: string, valor: unknown) => {
  try {
    if (Platform.OS === "web") localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // idem
  }
};

/** O que já se jogou hoje, guardado no aparelho (some sozinho no dia seguinte). */
function useProgresso(prefixo: string, dia: string) {
  const chave = `${prefixo}:${dia}`;
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(lerJson<string[]>(chave) ?? []);
  }, [chave]);
  const adicionar = (id: string) =>
    setIds((atual) => {
      const novo = [...atual, id];
      gravarJson(chave, novo);
      return novo;
    });
  return { ids, adicionar };
}

const diaAnterior = (dia: string) => new Date(Date.parse(`${dia}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/**
 * Dias seguidos acertando: o motivo pra voltar amanhã. Vale enquanto o
 * último acerto foi hoje ou ontem; registrar duas vezes no mesmo dia não soma.
 */
function useSequencia(prefixo: string, dia: string) {
  const chave = `${prefixo}:sequencia`;
  const [dias, setDias] = useState(0);
  useEffect(() => {
    const s = lerJson<{ ultimo: string; dias: number }>(chave);
    setDias(s && (s.ultimo === dia || s.ultimo === diaAnterior(dia)) ? s.dias : 0);
  }, [chave, dia]);
  const registrar = () => {
    const s = lerJson<{ ultimo: string; dias: number }>(chave);
    if (s?.ultimo === dia) return;
    const novo = s?.ultimo === diaAnterior(dia) ? s.dias + 1 : 1;
    gravarJson(chave, { ultimo: dia, dias: novo });
    setDias(novo);
  };
  return { dias, registrar };
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

/**
 * Um palpite, em duas metades: o nome fica numa coluna parada e as pistas
 * rolam de lado. No celular a linha não cabe, e antes o nome sumia junto
 * na rolagem: dava pra ver as cores sem saber de qual carro eram.
 *
 * O recém-chutado vira peça por peça; os de antes já aparecem prontos. Na
 * linha da vitória, depois de virar tudo, as peças pulam em onda.
 */
const pulo = (acertou: boolean, animar: boolean, i: number) => (acertou && animar ? REVELACAO + i * 70 : undefined);

function NomeDoPalpite({ chute, alvo, m, animar }: { chute: Nave; alvo: Nave; m: Medidas; animar: boolean }) {
  const acertou = chute.id === alvo.id;
  return (
    <Virar
      animar={animar}
      atraso={0}
      pulo={pulo(acertou, animar, 0)}
      style={{
        width: m.nome,
        height: m.altura,
        justifyContent: "center",
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: acertou ? FUNDO.verde : colors.border,
        backgroundColor: acertou ? FUNDO.verde : colors.surfaceHigh,
      }}
    >
      <Text style={{ color: acertou ? "#fff" : colors.onSurface, fontSize: m.fonte, fontWeight: "700" }} numberOfLines={3}>
        {chute.nome}
      </Text>
    </Virar>
  );
}

function PistasDoPalpite({ chute, alvo, m, animar }: { chute: Nave; alvo: Nave; m: Medidas; animar: boolean }) {
  const pistas = comparar(chute, alvo);
  const acertou = chute.id === alvo.id;
  return (
    <View className="flex-row" style={{ gap: VAO }}>
      {pistas.map((p, i) => (
        // O fundo neutro marca o lugar da peça enquanto ela ainda não virou.
        <View key={p.chave} style={{ width: m.pista, height: m.altura, backgroundColor: animar ? colors.surfaceHigh : undefined }}>
          <Virar
            animar={animar}
            atraso={(i + 1) * PASSO}
            pulo={pulo(acertou, animar, i + 1)}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, backgroundColor: FUNDO[p.cor] }}
          >
            <View
              accessible
              accessibilityLabel={`${chute.nome}, ${p.rotulo}: ${p.valor}, ${p.cor}${p.seta ? `, o carro do dia é ${p.seta === "cima" ? "maior" : "menor"}` : ""}`}
              style={{ alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontSize: m.fonte, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
                {p.valor}
              </Text>
              {p.seta === "cima" && <ArrowUp size={m.fonte + 2} color="#fff" />}
              {p.seta === "baixo" && <ArrowDown size={m.fonte + 2} color="#fff" />}
            </View>
          </Virar>
        </View>
      ))}
    </View>
  );
}

/** Geral ou Brasil: troca de tela, cada modo tem o seu endereço pra compartilhar. */
function TrocaDeModo({ modo }: { modo: Modo }) {
  return (
    <View className="flex-row" style={{ gap: 6 }}>
      {(Object.keys(MODOS) as Modo[]).map((m) => {
        const ativo = m === modo;
        return (
          <Pressable
            key={m}
            onPress={() => !ativo && router.replace(MODOS[m].caminho as never)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            className="border px-3 py-2"
            style={{
              borderColor: ativo ? colors.primary : colors.border,
              backgroundColor: ativo ? colors.surfaceHigh : "transparent",
            }}
          >
            <Text
              style={{ color: ativo ? colors.onSurface : colors.muted, fontSize: 12.5, fontWeight: "700", letterSpacing: 0.6 }}
            >
              {m === "geral" ? "TODOS OS CARROS" : "SÓ DO BRASIL"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Como jogar, com um palpite de exemplo: abre sozinho na primeira visita
 * (antes, quem chegava só entendia as cores depois de errar umas vezes) e
 * depois pelo botão de ajuda.
 */
function ComoJogar({ onFechar, larga }: { onFechar: () => void; larga: boolean }) {
  const exemplo: { valor: string; cor: Cor; seta?: "cima" | "baixo"; nota: string }[] = [
    { valor: "Honda", cor: "vermelho", nota: "marca diferente" },
    { valor: "Japão", cor: "amarelo", nota: "mesmo continente" },
    { valor: "Cupê", cor: "verde", nota: "igual" },
    { valor: "1999", cor: "amarelo", seta: "cima", nota: "perto; a nave é mais nova" },
  ];
  return (
    <Surgir>
      <View className="border border-border" style={{ padding: larga ? 20 : 16, gap: 12, backgroundColor: colors.surfaceHigh }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-on-surface" style={{ fontSize: 16, fontWeight: "800" }}>
            Como jogar
          </Text>
          <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar como jogar">
            <X size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
        <Text className="text-on-surface-variant" style={{ fontSize: 13.5, lineHeight: 19 }}>
          Digite um carro e escolha na lista. Cada palpite vira uma linha de pistas comparando com a nave do dia:
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {exemplo.map((e) => (
            <View key={e.valor} style={{ gap: 4, width: larga ? 150 : "47%" }}>
              <View style={{ height: 46, alignItems: "center", justifyContent: "center", backgroundColor: FUNDO[e.cor] }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{e.valor}</Text>
                {e.seta === "cima" && <ArrowUp size={14} color="#fff" />}
              </View>
              <Text className="text-muted" style={{ fontSize: 11.5 }}>
                {e.cor === "verde" ? "Verde" : e.cor === "amarelo" ? "Amarelo" : "Vermelho"}: {e.nota}
              </Text>
            </View>
          ))}
        </View>
        <Text className="text-on-surface-variant" style={{ fontSize: 13, lineHeight: 18 }}>
          Amarelo é perto: mesmo continente, turbo e biturbo, ano a até 5 anos, potência a até 15%. A seta diz pra que lado
          ir. Empacou? A partir do {DICAS_EM[0]}º palpite aparecem dicas.
        </Text>
        <PrimaryButton label="Bora jogar" onPress={onFechar} />
      </View>
    </Surgir>
  );
}

/**
 * As dicas de quem empacou: a década, depois a primeira letra, depois o
 * tamanho do nome. Nada de resumo das pistas: juntar as pistas de cabeça é
 * o jogo.
 */
function Dicas({ palpites, alvo }: { palpites: Nave[]; alvo: Nave }) {
  const ajuda = dicas(alvo, palpites.length);
  const proxima = DICAS_EM.find((n) => n > palpites.length);
  if (palpites.length === 0) return null;
  return (
    <View className="border border-border" style={{ padding: 12, gap: 8, backgroundColor: colors.surfaceContainer }}>
      {ajuda.map((d) => (
        <View key={d} className="flex-row items-center" style={{ gap: 8 }}>
          <Lightbulb size={15} color="#facc15" />
          <Text style={{ color: "#fde68a", fontSize: 13.5, flex: 1 }}>{d}</Text>
        </View>
      ))}
      {proxima && (
        <Text className="text-muted" style={{ fontSize: 11.5 }}>
          {ajuda.length === 0 ? "Primeira dica" : "Próxima dica"} no {proxima}º palpite.
        </Text>
      )}
    </View>
  );
}

/** Desistiu de um dia passado: mostra a resposta. */
const chaveDeDesistencia = (prefixo: string, dia: string) => `${prefixo}:${dia}:desistiu`;

function estadoDoDia(prefixo: string, dia: string, modo: Modo): string {
  const ids = lerJson<string[]>(`${prefixo}:${dia}`) ?? [];
  if (ids.includes(naveDoDia(dia, modo).id)) return ids.length === 1 ? "acertou de primeira" : `acertou em ${ids.length}`;
  if (lerJson<boolean>(chaveDeDesistencia(prefixo, dia))) return "desistiu";
  if (ids.length) return `${ids.length} ${ids.length === 1 ? "palpite" : "palpites"}, em aberto`;
  return "não jogou";
}

/**
 * Os dias que passaram, pra quem chegou agora ou perdeu algum. A lista
 * mostra só número, data e como a pessoa foi: a resposta continua
 * escondida até ela jogar ou desistir.
 */
function ListaDeDias({ modo, prefixo, dia, hoje }: { modo: Modo; prefixo: string; dia: string; hoje: string }) {
  const dias = [hoje, ...diasAnteriores(hoje)];
  const abrir = (d: string) => router.replace((d === hoje ? MODOS[modo].caminho : `${MODOS[modo].caminho}?dia=${d}`) as never);
  return (
    <View className="border border-border" style={{ backgroundColor: colors.surfaceContainer }}>
      {dias.map((d, i) => {
        const estado = estadoDoDia(prefixo, d, modo);
        const atual = d === dia;
        return (
          <Pressable
            key={d}
            onPress={() => abrir(d)}
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
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: "700",
                color: estado.startsWith("acertou") ? "#4ade80" : estado === "desistiu" ? "#f87171" : colors.muted,
              }}
            >
              {estado}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** O cartão de quando acerta: grande, verde, impossível de não ver. */
function CartaoDaVitoria({
  alvo,
  palpites,
  dias,
  contagem,
  outroModo,
  aoCompartilhar,
  aviso,
  larga,
  passado,
  aoVoltarProDeHoje,
}: {
  passado: boolean;
  aoVoltarProDeHoje: () => void;
  alvo: Nave;
  palpites: number;
  dias: number;
  contagem: string;
  outroModo: Modo;
  aoCompartilhar: () => void;
  aviso: string | null;
  larga: boolean;
}) {
  return (
    <Surgir>
      <View style={{ borderWidth: 2, borderColor: FUNDO.verde, backgroundColor: "rgba(21,128,61,0.12)", padding: larga ? 24 : 18, gap: 14 }}>
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", backgroundColor: FUNDO.verde }}>
            <Trophy size={28} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: "#4ade80", fontSize: larga ? 30 : 24, fontWeight: "900", letterSpacing: 1 }}>ACERTOU!</Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 13.5 }}>
              {palpites === 1 ? "De primeira. Isso é raro." : `Em ${palpites} palpites.`}
            </Text>
          </View>
        </View>

        <View style={{ gap: 2 }}>
          <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.4 }}>
            A NAVE DE HOJE ERA
          </Text>
          <Text className="text-on-surface" style={{ fontSize: larga ? 26 : 21, fontWeight: "800" }}>
            {alvo.nome}
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
            {alvo.ano} · {alvo.cv} cv · {alvo.cilindros} cilindros {alvo.aspiracao === "Aspirado" ? "aspirado" : alvo.aspiracao.toLowerCase()} · tração {alvo.tracao.toLowerCase()}
          </Text>
        </View>

        <FotoDoCarro id={alvo.id} comResumo altura={larga ? 300 : 210} />

        {passado ? (
          <Text className="text-muted" style={{ fontSize: 12.5 }}>
            Dia passado não conta pros dias seguidos.
          </Text>
        ) : (
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="border border-border" style={{ flex: 1, padding: 12, gap: 2 }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Flame size={18} color={colors.primary} />
              <Text className="text-on-surface" style={{ fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                {dias}
              </Text>
            </View>
            <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
              {dias === 1 ? "DIA SEGUIDO" : "DIAS SEGUIDOS"}
            </Text>
          </View>
          <View className="border border-border" style={{ flex: 1, padding: 12, gap: 2 }}>
            <Text className="text-on-surface" style={{ fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
              {contagem}
            </Text>
            <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
              PRÓXIMA NAVE
            </Text>
          </View>
        </View>
        )}

        <PrimaryButton label="Compartilhar resultado" onPress={aoCompartilhar} icon={<Share2 size={15} color={colors.onPrimaryContainer} />} />
        {passado && (
          <Pressable
            onPress={aoVoltarProDeHoje}
            className="flex-row items-center justify-center border border-outline active:bg-white/5"
            style={{ gap: 8, paddingVertical: 13 }}
            accessibilityRole="link"
          >
            <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1 }}>
              JOGAR A NAVE DE HOJE
            </Text>
            <ArrowRight size={16} color={colors.onSurface} />
          </Pressable>
        )}
        <Pressable
          onPress={() => router.replace(MODOS[outroModo].caminho as never)}
          className="flex-row items-center justify-center border border-outline active:bg-white/5"
          style={{ gap: 8, paddingVertical: 13 }}
          accessibilityRole="link"
        >
          <Text className="text-on-surface" style={{ fontWeight: "700", letterSpacing: 1 }}>
            {outroModo === "brasil" ? "AGORA A NAVE DO DIA BRASIL" : "AGORA COM TODOS OS CARROS"}
          </Text>
          <ArrowRight size={16} color={colors.onSurface} />
        </Pressable>
        {aviso && (
          <Text className="text-muted" style={{ fontSize: 12 }}>
            {aviso}
          </Text>
        )}
      </View>
    </Surgir>
  );
}

export function JogoNaveDoDia({ modo }: { modo: Modo }) {
  const hoje = hojeEmBrasilia();
  // ?dia=2026-10-14 abre um dia passado; sem ele (ou com data inválida) é hoje.
  const { dia: param } = useLocalSearchParams<{ dia?: string }>();
  const dia = diaPedido(param, hoje);
  const passado = dia !== hoje;
  const [verDias, setVerDias] = useState(false);
  const voltarProDeHoje = () => router.replace(MODOS[modo].caminho as never);
  const { lista, titulo } = MODOS[modo];
  const prefixo = modo === "geral" ? "nave-do-dia" : `nave-do-dia-${modo}`;
  const alvo = useMemo(() => naveDoDia(dia, modo), [dia, modo]);
  const { ids, adicionar } = useProgresso(prefixo, dia);
  const { dias, registrar } = useSequencia(prefixo, dia);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  /** O palpite que acabou de entrar: só ele vira peça por peça. */
  const [novo, setNovo] = useState<string | null>(null);
  /** Acertou agora e a linha ainda está virando: o cartão espera. */
  const [revelando, setRevelando] = useState(false);
  const [confete, setConfete] = useState(0);
  const rolagem = useRef<ScrollView>(null);
  const contagem = useContagem();
  // No computador a tela sai da coluna estreita (ver useLarguraAmpla) e as
  // peças crescem até encher a linha: a galera joga muito pelo PC.
  const larga = useLarguraAmpla();
  const [espaco, setEspaco] = useState(0);
  const m = medidasPara(larga, espaco);

  const palpites = ids.map((id) => lista.find((n) => n.id === id)).filter((n): n is Nave => !!n);
  const venceu = palpites.some((p) => p.id === alvo.id);

  // Desistir só existe em dia passado: é o jeito de ver a resposta sem jogar.
  const [desistiu, setDesistiu] = useState(false);
  useEffect(() => {
    setDesistiu(!!lerJson<boolean>(chaveDeDesistencia(prefixo, dia)));
    setVerDias(false);
    setNovo(null);
    setBusca("");
  }, [prefixo, dia]);
  const desistir = () => {
    gravarJson(chaveDeDesistencia(prefixo, dia), true);
    setDesistiu(true);
  };

  // Inclui quem já tinha ganhado hoje antes da sequência existir.
  useEffect(() => {
    if (venceu && !passado) registrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venceu]);

  // Sem acento, sem hífen, em qualquer ordem e com um erro de digitação:
  // "gtr", "corola", "civic si" (ver utils/naveDoDiaAjuda).
  const sugestoes = useMemo(() => buscarNaves(lista, busca, ids), [busca, ids, lista]);

  // Como jogar abre sozinho na primeira visita.
  const [ajuda, setAjuda] = useState(false);
  useEffect(() => {
    try {
      if (Platform.OS === "web" && !localStorage.getItem("nave-do-dia:viu-como-jogar")) setAjuda(true);
    } catch {
      // sem storage: não insiste
    }
  }, []);
  const fecharAjuda = () => {
    setAjuda(false);
    try {
      if (Platform.OS === "web") localStorage.setItem("nave-do-dia:viu-como-jogar", "1");
    } catch {
      // idem
    }
  };

  const chutar = (n: Nave) => {
    adicionar(n.id);
    setNovo(n.id);
    setBusca("");
    vibrar();
    if (n.id === alvo.id) {
      setRevelando(true);
      setTimeout(() => {
        setRevelando(false);
        setConfete(Date.now());
        vibrar("acerto");
        rolagem.current?.scrollTo({ y: 0, animated: true });
      }, REVELACAO);
    }
  };

  const compartilhar = async () => {
    const texto = textoDeCompartilhar(palpites, alvo, dia, modo, passado);
    try {
      await Share.share({ message: texto });
    } catch {
      setAviso("Não deu pra compartilhar daqui. Tira um print!");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title={titulo.toUpperCase()}
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)")} accessibilityRole="button" accessibilityLabel="Voltar">
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView
        ref={rolagem}
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
        <TrocaDeModo modo={modo} />
        <View style={{ gap: 6 }}>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Text className="text-primary" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.4 }}>
              #{numeroDoDia(dia)}
              {passado ? ` · ${dataCurta(dia).toUpperCase()}` : ""}
            </Text>
            {palpites.length > 0 && !venceu && (
              <Text className="text-muted" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                {palpites.length} {palpites.length === 1 ? "PALPITE" : "PALPITES"}
              </Text>
            )}
            {dias > 0 && !venceu && !passado && (
              <View className="flex-row items-center" style={{ gap: 3 }}>
                <Flame size={13} color={colors.primary} />
                <Text className="text-muted" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                  {dias} {dias === 1 ? "DIA" : "DIAS"}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => setVerDias((v) => !v)}
              className="flex-row items-center"
              style={{ gap: 4, marginLeft: "auto" }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <CalendarDays size={15} color={verDias ? colors.primary : colors.onSurfaceVariant} />
              <Text style={{ color: verDias ? colors.primary : colors.onSurfaceVariant, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 }}>
                DIAS
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAjuda((v) => !v)}
              className="flex-row items-center"
              style={{ gap: 4 }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <CircleHelp size={15} color={colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6 }}>
                COMO JOGAR
              </Text>
            </Pressable>
          </View>
          <Text className="text-on-surface" style={{ fontSize: larga ? 30 : 22, fontWeight: "800" }}>
            {passado
              ? `Qual era a nave ${modo === "brasil" ? "brasileira " : ""}de ${dataCurta(dia).slice(5)}?`
              : modo === "brasil"
                ? "Qual é a nave brasileira de hoje?"
                : "Qual é a nave de hoje?"}
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 13.5, lineHeight: 19 }}>
            Chuta um carro. Cada palpite mostra o que bate com a nave do dia: verde acertou, amarelo chegou perto,
            vermelho nada a ver. Nos números, a seta diz pra que lado ir.
          </Text>
        </View>

        {verDias && <ListaDeDias modo={modo} prefixo={prefixo} dia={dia} hoje={hoje} />}

        {ajuda && !venceu && <ComoJogar onFechar={fecharAjuda} larga={larga} />}

        {desistiu && !venceu ? (
          <View className="border border-border" style={{ padding: larga ? 22 : 16, gap: 12, backgroundColor: colors.surfaceHigh }}>
            <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.4 }}>
              A NAVE DESSE DIA ERA
            </Text>
            <Text className="text-on-surface" style={{ fontSize: larga ? 26 : 21, fontWeight: "800" }}>
              {alvo.nome}
            </Text>
            <FotoDoCarro id={alvo.id} comResumo altura={larga ? 280 : 200} />
            <PrimaryButton label="Jogar a nave de hoje" onPress={voltarProDeHoje} icon={<ArrowRight size={16} color={colors.onPrimaryContainer} />} />
          </View>
        ) : venceu ? (
          !revelando && (
            <CartaoDaVitoria
              passado={passado}
              aoVoltarProDeHoje={voltarProDeHoje}
              alvo={alvo}
              palpites={palpites.length}
              dias={dias}
              contagem={contagem}
              outroModo={modo === "geral" ? "brasil" : "geral"}
              aoCompartilhar={compartilhar}
              aviso={aviso}
              larga={larga}
            />
          )
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
                  <Text className="text-muted" style={{ fontWeight: "400" }}>
                    {"  "}
                    {n.ano}
                  </Text>
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

        {!venceu && !desistiu && <Dicas palpites={palpites} alvo={alvo} />}

        {passado && !venceu && !desistiu && (
          <Pressable onPress={desistir} hitSlop={6} accessibilityRole="button" style={{ alignSelf: "flex-start" }}>
            <Text className="text-muted" style={{ fontSize: 12.5, textDecorationLine: "underline" }}>
              Desistir e ver a resposta desse dia
            </Text>
          </Pressable>
        )}

        {palpites.length > 0 && (
          <View className="flex-row" style={{ gap: VAO }}>
            {/* Os nomes ficam parados; só as pistas rolam de lado. */}
            <View style={{ gap: VAO }}>
              <Text className="text-muted" style={{ width: m.nome, height: 16, fontSize: larga ? 11.5 : 10.5, fontWeight: "700", letterSpacing: 1 }}>
                CARRO
              </Text>
              {[...palpites].reverse().map((p) => (
                <NomeDoPalpite key={p.id} chute={p} alvo={alvo} m={m} animar={p.id === novo} />
              ))}
            </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ gap: VAO }}>
              <View className="flex-row" style={{ gap: VAO, height: 16 }}>
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
                <PistasDoPalpite key={p.id} chute={p} alvo={alvo} m={m} animar={p.id === novo} />
              ))}
            </View>
          </ScrollView>
          </View>
        )}

        <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 16 }}>
          {lista.length} carros na garagem {modo === "brasil" ? "deste modo, todos que rodaram muito por aqui" : "do jogo"}. Potência de fábrica da versão, arredondada: o amarelo cobre a
          diferença entre fontes. Um carro novo todo dia à meia-noite.
        </Text>
      </ScrollView>
      <Confete disparo={confete} />
    </View>
  );
}
