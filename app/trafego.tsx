/**
 * Tráfego: quantas pessoas abriram o site, de onde vieram e até onde
 * chegaram. Só quem administra (pros outros o servidor responde 404).
 *
 * O funil é o centro da tela: um anúncio que traz 9 pessoas e nenhuma
 * passa da página inicial diz mais sobre a página do que sobre o anúncio.
 *
 * Abrir esta tela tira este aparelho da contagem (cookie do servidor):
 * senão o número mais alto seria sempre o dono olhando o próprio site.
 */
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { ErrorState } from "@/components/ui/States";
import { CategoryChip } from "@/components/ui/Chips";
import { apiService, type Contagem, type Trafego } from "@/services/apiService";
import { voltarOuIrPara } from "@/utils/navigation";
import { colors } from "@/constants/theme";

const PERIODOS = [
  { dias: 1, rotulo: "Hoje" },
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

const LABEL = { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5 };
const NUM = { fontVariant: ["tabular-nums" as const] };

/** O caminho cru vira o nome que a gente fala. */
function nomeDaPagina(caminho: string): string {
  const fixos: Record<string, string> = {
    "/": "Página inicial",
    "/app": "App · Início",
    "/app/login": "Login",
    "/app/register": "Cadastro",
    "/app/entrar": "Volta do Google",
    "/app/welcome": "Boas-vindas (escolher @)",
    "/app/explore": "Explorar",
    "/app/garage": "Garagem",
    "/app/profile": "Perfil (próprio)",
    "/app/event/:id": "Página de encontro",
    "/app/post/:id": "Publicação",
    "/app/car/:id": "Página de carro",
    "/encontros": "Agenda de encontros",
    "/termos": "Termos de uso",
    "/privacidade": "Privacidade",
  };
  if (fixos[caminho]) return fixos[caminho];
  const cidade = caminho.match(/^\/encontros\/(.+)$/);
  if (cidade) return `Encontros em ${cidade[1].replace(/-/g, " ")}`;
  const perfil = caminho.match(/^\/app\/user\/(.+)$/);
  if (perfil) return `Perfil @${perfil[1]}`;
  return caminho;
}

const diaCurto = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Text className="text-on-surface-variant mb-3" style={LABEL}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
      <Text className="text-on-surface" style={{ fontSize: 26, fontWeight: "700", ...NUM }}>
        {valor}
      </Text>
      <Text className="text-on-surface-variant mt-1" style={{ fontSize: 12 }}>
        {rotulo}
      </Text>
    </View>
  );
}

/** Uma linha com barra: nome, barra proporcional ao maior, número. */
function Linha({ nome, valor, maximo, destaque }: { nome: string; valor: number; maximo: number; destaque?: boolean }) {
  const largura = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View className="flex-row justify-between mb-1" style={{ gap: 12 }}>
        <Text className="text-on-surface" style={{ fontSize: 13.5, flex: 1 }} numberOfLines={1}>
          {nome}
        </Text>
        <Text className="text-on-surface" style={{ fontSize: 13.5, fontWeight: "700", ...NUM }}>
          {valor}
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.surfaceHighest }}>
        <View
          style={{
            height: 6,
            width: `${largura}%`,
            backgroundColor: destaque ? colors.primary : colors.onSurfaceVariant,
          }}
        />
      </View>
    </View>
  );
}

function Lista({ itens, nomear = (n: string) => n }: { itens: Contagem[]; nomear?: (n: string) => string }) {
  if (itens.length === 0) {
    return (
      <Text className="text-muted" style={{ fontSize: 13 }}>
        Nada no período.
      </Text>
    );
  }
  const maximo = itens[0]?.pessoas ?? 0;
  return (
    <>
      {itens.map((i) => (
        <Linha key={i.nome} nome={nomear(i.nome)} valor={i.pessoas} maximo={maximo} />
      ))}
    </>
  );
}

function PorDia({ dias }: { dias: Trafego["porDia"] }) {
  const maximo = Math.max(1, ...dias.map((d) => d.pessoas));
  // Com 90 dias as colunas ficam finas demais pra rótulo em todas.
  const aCada = dias.length > 31 ? 14 : dias.length > 8 ? 5 : 1;
  return (
    <View>
      <View className="flex-row items-end" style={{ height: 120, gap: dias.length > 31 ? 1 : 4 }}>
        {dias.map((d) => (
          <View key={d.dia} style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}>
            <View
              accessibilityLabel={`${diaCurto(d.dia)}: ${d.pessoas} pessoas`}
              style={{
                height: `${(d.pessoas / maximo) * 100}%`,
                minHeight: d.pessoas > 0 ? 3 : 1,
                backgroundColor: d.pessoas > 0 ? colors.primary : colors.border,
              }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row mt-1.5" style={{ gap: dias.length > 31 ? 1 : 4 }}>
        {dias.map((d, i) => (
          <Text
            key={d.dia}
            className="text-muted"
            style={{ flex: 1, fontSize: 10, textAlign: "center", ...NUM }}
            numberOfLines={1}
          >
            {i % aCada === 0 || i === dias.length - 1 ? diaCurto(d.dia) : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Funil({ funil }: { funil: Trafego["funil"] }) {
  const etapas = [
    { nome: "Viram o site", valor: funil.viramOSite },
    { nome: "Abriram o app", valor: funil.abriramOApp },
    { nome: "Foram pro login ou cadastro", valor: funil.foramProCadastro },
    { nome: "Criaram conta", valor: funil.contasCriadas },
  ];
  const maximo = Math.max(1, funil.viramOSite);
  return (
    <>
      {etapas.map((e) => (
        <Linha key={e.nome} nome={e.nome} valor={e.valor} maximo={maximo} destaque />
      ))}
      <Text className="text-muted" style={{ fontSize: 11.5, lineHeight: 16 }}>
        Contas criadas vêm do banco e incluem quem entrou por outro caminho.
      </Text>
    </>
  );
}

export default function TrafegoScreen() {
  const [dias, setDias] = useState(7);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trafego", dias],
    queryFn: () => apiService.getTrafego(dias),
    staleTime: 60_000,
  });
  const t = data && !Array.isArray(data) ? data : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="Tráfego"
        left={
          <Pressable
            hitSlop={8}
            onPress={() => voltarOuIrPara("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 48, maxWidth: 720, width: "100%", alignSelf: "center" }}
      >
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {PERIODOS.map((p) => (
            <CategoryChip key={p.dias} label={p.rotulo} active={dias === p.dias} onPress={() => setDias(p.dias)} />
          ))}
        </View>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError || !t ? (
          <ErrorState message="Não deu pra carregar o tráfego." onRetry={refetch} />
        ) : (
          <>
            <View className="flex-row mt-5" style={{ gap: 10 }}>
              <Numero valor={t.pessoas} rotulo="pessoas" />
              <Numero valor={t.visualizacoes} rotulo="telas abertas" />
              <Numero valor={t.noInstagram} rotulo="pelo Instagram" />
            </View>

            <Secao titulo="ATÉ ONDE CHEGARAM">
              <Funil funil={t.funil} />
            </Secao>

            {t.dias > 1 && (
              <Secao titulo="PESSOAS POR DIA">
                <PorDia dias={t.porDia} />
              </Secao>
            )}

            <Secao titulo="DE ONDE VIERAM">
              <Lista itens={t.origens} />
            </Secao>

            {t.campanhas.length > 0 && (
              <Secao titulo="CAMPANHAS (UTM)">
                <Lista itens={t.campanhas} />
              </Secao>
            )}

            <Secao titulo="PÁGINAS MAIS VISTAS">
              <Lista itens={t.paginas} nomear={nomeDaPagina} />
            </Secao>

            <Secao titulo="APARELHOS">
              <Lista itens={t.aparelhos} />
            </Secao>

            <Text className="text-muted mt-8" style={{ fontSize: 11.5, lineHeight: 17 }}>
              "Pessoas" conta cada aparelho uma vez por dia; quem voltou em
              outro dia conta de novo. Robôs e prévias de link ficam de fora,
              e este aparelho saiu da contagem quando você abriu esta tela.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
