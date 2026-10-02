/**
 * Portaria do rolê: o organizador aponta o celular pro QR e a tela responde
 * em cor — verde entra, amarelo já entrou, vermelho não entra. Funciona sem
 * internet; ver services/portaria.ts.
 *
 * Duas abas: a câmera, que é o caminho normal, e a lista com busca, pra quem
 * chegou com o celular sem bateria ou com a tela quebrada.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Camera, List, RefreshCw, WifiOff } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui/States";
import { PrimaryButton } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useEventById } from "@/stores/eventsStore";
import { usePortaria, type Conexao } from "@/hooks/usePortaria";
import { horaDaEntrada, type ResultadoDaLeitura } from "@/services/portaria";
import { voltarOuIrPara } from "@/utils/navigation";
import { colors } from "@/constants/theme";
import type { CheckinEntry } from "@/types";

/** Verde some sozinho: a fila anda sem ninguém tocar na tela. */
const TEMPO_DO_VERDE = 1600;
/** O mesmo QR parado na frente da câmera não conta duas vezes. */
const IGNORAR_REPETIDO_POR = 4000;

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

type Aba = "camera" | "lista";

export default function PortariaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useEventById(id);
  const portaria = usePortaria(id);
  const [aba, setAba] = useState<Aba>("camera");

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Portaria"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara(`/event/${id}`)}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
        right={
          <Pressable hitSlop={8} onPress={() => void portaria.sincronizar()}>
            <RefreshCw size={19} color={colors.onSurface} />
          </Pressable>
        }
      />

      {/* O placar: é o número que o organizador olha a noite inteira. */}
      <View className="px-5 pt-4 pb-3 border-b border-outline-variant">
        {event && (
          <Text className="text-muted mb-1" style={{ fontSize: 12 }} numberOfLines={1}>
            {event.name}
          </Text>
        )}
        <View className="flex-row items-end justify-between">
          <Text className="text-on-surface" style={{ fontSize: 30, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
            {portaria.presentes}
            <Text className="text-muted" style={{ fontSize: 16, fontWeight: "500" }}>
              {" "}/ {portaria.total} dentro
            </Text>
          </Text>
          <SeloDeConexao
            conexao={portaria.conexao}
            naoEnviadas={portaria.naoEnviadas}
            ultima={portaria.ultimaSincronia}
          />
        </View>
      </View>

      {!portaria.carregado ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : portaria.conexao === "sem_permissao" ? (
        <EmptyState
          title="Só quem organiza"
          description="A portaria é do organizador do rolê. Entre com a conta que criou o encontro."
        />
      ) : portaria.semLista ? (
        portaria.conexao === "sincronizando" ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-muted mt-3" style={{ fontSize: 13 }}>
              Baixando a lista de ingressos…
            </Text>
          </View>
        ) : (
          <EmptyState
            icon={<WifiOff size={36} color={colors.muted} />}
            title="Lista não baixada"
            description="A portaria precisa de internet uma vez, antes do rolê, pra baixar quem confirmou. Depois funciona sem sinal."
            actionLabel="Tentar de novo"
            onAction={() => void portaria.sincronizar()}
          />
        )
      ) : (
        <>
          <View className="flex-row border-b border-outline-variant">
            <BotaoDaAba ativa={aba === "camera"} onPress={() => setAba("camera")} icone={Camera} rotulo="Câmera" />
            <BotaoDaAba ativa={aba === "lista"} onPress={() => setAba("lista")} icone={List} rotulo="Lista" />
          </View>
          {aba === "camera" ? (
            <Leitor lerQr={portaria.lerQr} />
          ) : (
            <ListaDaPortaria portaria={portaria} />
          )}
        </>
      )}
    </View>
  );
}

function SeloDeConexao({
  conexao,
  naoEnviadas,
  ultima,
}: {
  conexao: Conexao;
  naoEnviadas: number;
  ultima: Date | null;
}) {
  if (conexao === "sem_conexao") {
    return (
      <View className="items-end">
        <View className="flex-row items-center gap-1.5">
          <WifiOff size={12} color={colors.warning} />
          <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "600" }}>Sem internet</Text>
        </View>
        {naoEnviadas > 0 && (
          <Text className="text-muted" style={{ fontSize: 11 }}>
            {naoEnviadas} {naoEnviadas === 1 ? "entrada" : "entradas"} pra enviar
          </Text>
        )}
      </View>
    );
  }
  if (conexao === "sincronizando") {
    return <ActivityIndicator size="small" color={colors.muted} />;
  }
  if (conexao === "sincronizado" && ultima) {
    return (
      <Text className="text-muted" style={{ fontSize: 11 }}>
        atualizado {hora(ultima.toISOString())}
      </Text>
    );
  }
  return null;
}

function BotaoDaAba({
  ativa,
  onPress,
  icone: Icone,
  rotulo,
}: {
  ativa: boolean;
  onPress: () => void;
  icone: typeof Camera;
  rotulo: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-2 py-3"
      style={{ borderBottomWidth: 2, borderBottomColor: ativa ? colors.primary : "transparent" }}
    >
      <Icone size={15} color={ativa ? colors.onSurface : colors.muted} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: ativa ? colors.onSurface : colors.muted,
        }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------- Câmera

function Leitor({ lerQr }: { lerQr: (conteudo: string) => ResultadoDaLeitura }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [resultado, setResultado] = useState<ResultadoDaLeitura | null>(null);
  const ultimaLeitura = useRef<{ conteudo: string; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A câmera dispara a mesma leitura várias vezes por segundo; enquanto há
  // um resultado na tela, nada mais é lido.
  const ocupado = useRef(false);

  const limpar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    ocupado.current = false;
    setResultado(null);
  }, []);

  const aoLer = useCallback(
    ({ data }: { data: string }) => {
      if (ocupado.current) return;
      const anterior = ultimaLeitura.current;
      if (anterior && anterior.conteudo === data && Date.now() - anterior.at < IGNORAR_REPETIDO_POR) return;
      ultimaLeitura.current = { conteudo: data, at: Date.now() };

      ocupado.current = true;
      const r = lerQr(data);
      setResultado(r);

      if (r.tipo === "liberado") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        timer.current = setTimeout(limpar, TEMPO_DO_VERDE);
      } else {
        // Amarelo e vermelho esperam um toque: quem está na porta precisa
        // perceber e conversar com a pessoa, não ver a cor piscar e sumir.
        void Haptics.notificationAsync(
          r.tipo === "ja_entrou"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error
        );
      }
    },
    [lerQr, limpar]
  );

  if (!permissao) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permissao.granted) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Camera size={36} color={colors.muted} />
        <Text className="text-on-surface text-center mt-4 mb-2" style={{ fontSize: 18, fontWeight: "600" }}>
          Câmera pra ler os ingressos
        </Text>
        <Text className="text-on-surface-variant text-center mb-6" style={{ fontSize: 14 }}>
          {permissao.canAskAgain
            ? "A portaria usa a câmera só pra ler o QR. Nada é gravado."
            : "A câmera foi bloqueada. Libere nas configurações do celular, ou use a aba Lista."}
        </Text>
        {permissao.canAskAgain && (
          <PrimaryButton label="Liberar câmera" onPress={() => void pedirPermissao()} fullWidth={false} />
        )}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={aoLer}
      />
      {/* Mira: mostra onde pôr o QR sem precisar explicar. */}
      {!resultado && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View style={{ width: 230, height: 230, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" }} />
          <Text className="mt-4" style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>
            Aponte para o QR do ingresso
          </Text>
        </View>
      )}
      {resultado && <CartaoDeResultado resultado={resultado} onFechar={limpar} />}
    </View>
  );
}

function CartaoDeResultado({
  resultado,
  onFechar,
}: {
  resultado: ResultadoDaLeitura;
  onFechar: () => void;
}) {
  const visual = visualDoResultado(resultado);
  const ingresso = "ingresso" in resultado ? resultado.ingresso : null;

  return (
    // A tela inteira vira a cor: quem está na porta vê de relance, de longe,
    // sem ler nada.
    <Pressable
      onPress={onFechar}
      className="absolute inset-0 items-center justify-center px-8"
      style={{ backgroundColor: visual.fundo }}
    >
      <Text style={{ color: visual.texto, fontSize: 34, fontWeight: "800", letterSpacing: 1, textAlign: "center" }}>
        {visual.titulo}
      </Text>
      {visual.detalhe && (
        <Text style={{ color: visual.texto, fontSize: 16, marginTop: 8, textAlign: "center", opacity: 0.9 }}>
          {visual.detalhe}
        </Text>
      )}

      {ingresso && (
        <View className="items-center mt-8">
          <UserAvatar uri={ingresso.avatarUrl ?? ""} size={72} />
          <Text style={{ color: visual.texto, fontSize: 22, fontWeight: "700", marginTop: 12, textAlign: "center" }}>
            {ingresso.displayName ?? ingresso.username ?? "Sem nome"}
          </Text>
          {ingresso.carLabel && (
            <Text style={{ color: visual.texto, fontSize: 15, marginTop: 4, opacity: 0.85 }}>
              {ingresso.carLabel}
            </Text>
          )}
        </View>
      )}

      {resultado.tipo !== "liberado" && (
        <Text style={{ color: visual.texto, fontSize: 13, marginTop: 40, opacity: 0.8, fontWeight: "600" }}>
          TOQUE PARA LER O PRÓXIMO
        </Text>
      )}
    </Pressable>
  );
}

function visualDoResultado(r: ResultadoDaLeitura): {
  fundo: string;
  texto: string;
  titulo: string;
  detalhe: string | null;
} {
  switch (r.tipo) {
    case "liberado":
      return { fundo: colors.success, texto: "#0a0a0a", titulo: "LIBERADO", detalhe: null };
    case "ja_entrou":
      return {
        fundo: colors.warning,
        texto: "#0a0a0a",
        titulo: "JÁ ENTROU",
        detalhe: `às ${hora(r.at)} · ${r.aqui ? "por esta portaria" : "por outro portão"}`,
      };
    case "outro_role":
      return {
        fundo: colors.primaryContainer,
        texto: "#ffffff",
        titulo: "OUTRO ROLÊ",
        detalhe: "Esse ingresso é de outro encontro.",
      };
    case "nao_encontrado":
      return {
        fundo: colors.primaryContainer,
        texto: "#ffffff",
        titulo: "NÃO ESTÁ NA LISTA",
        detalhe:
          "Presença desmarcada ou confirmada agora há pouco. Com internet, atualize a lista e leia de novo.",
      };
    case "invalido":
      return {
        fundo: colors.primaryContainer,
        texto: "#ffffff",
        titulo: "QR INVÁLIDO",
        detalhe: "Não é um ingresso do Downpipe.",
      };
  }
}

// -------------------------------------------------------------------- Lista

function ListaDaPortaria({ portaria }: { portaria: ReturnType<typeof usePortaria> }) {
  const [busca, setBusca] = useState("");
  const { estado, liberarPorCodigo } = portaria;

  const linhas = useMemo(() => {
    const termo = normalizar(busca);
    return Object.values(estado.ingressos)
      .filter((e) => {
        if (!termo) return true;
        return [e.displayName, e.username, e.carLabel, e.code].some((campo) =>
          normalizar(campo ?? "").includes(termo)
        );
      })
      .sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), "pt-BR"));
  }, [estado.ingressos, busca]);

  return (
    <View className="flex-1">
      <View className="px-5 pt-4">
        <SearchBar value={busca} onChangeText={setBusca} placeholder="Nome, @, carro ou código" />
      </View>
      <FlatList
        data={linhas}
        keyExtractor={(e) => e.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text className="text-muted text-center mt-10" style={{ fontSize: 14 }}>
            {busca ? "Ninguém com esse nome na lista." : "Ninguém confirmou presença ainda."}
          </Text>
        }
        renderItem={({ item }) => {
          const entrada = horaDaEntrada(estado, item.code);
          return (
            <View className="flex-row items-center gap-3 px-5 py-3 border-b border-outline-variant">
              <UserAvatar uri={item.avatarUrl ?? ""} size={40} />
              <View className="flex-1">
                <Text className="text-on-surface" style={{ fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                  {nomeDe(item)}
                </Text>
                <Text className="text-muted" style={{ fontSize: 12 }} numberOfLines={1}>
                  {[item.username && `@${item.username}`, item.carLabel].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {entrada ? (
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>
                  DENTRO {hora(entrada)}
                </Text>
              ) : (
                <Pressable
                  onPress={() => {
                    liberarPorCodigo(item.code);
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  className="px-3 py-2 active:opacity-70"
                  style={{ backgroundColor: colors.success }}
                >
                  <Text style={{ color: "#0a0a0a", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                    LIBERAR
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function nomeDe(e: CheckinEntry): string {
  return e.displayName ?? e.username ?? "Sem nome";
}

/** Busca sem acento e sem caixa: "joao" acha "João". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
