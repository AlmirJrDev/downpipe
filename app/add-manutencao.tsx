/**
 * Registrar (ou editar) uma manutenção.
 *
 * Diferente da modificação, que é melhoria e vai pro perfil, aqui é o que o
 * carro cobra sozinho: óleo, correia, pneu. O que faz a tela valer a pena é o
 * intervalo — sem ele isto seria só um caderninho, e com ele o app avisa
 * quando vencer.
 */
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Trash2, Wrench } from "lucide-react-native";
import { Alert } from "@/utils/alert";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useCarById } from "@/stores/garageStore";
import {
  useAddManutencao,
  useManutencoes,
  useRemoveManutencao,
  useUpdateManutencao,
} from "@/stores/manutencaoStore";
import { voltarOuIrPara } from "@/utils/navigation";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";

/**
 * Sugestões, não lista fechada: cada carro tem a mania dele. O intervalo que
 * acompanha cada uma é o que a oficina costuma mandar, e serve de ponto de
 * partida — a pessoa muda se quiser.
 */
const SUGESTOES: { nome: string; km?: number; meses?: number }[] = [
  { nome: "Troca de óleo", km: 10000, meses: 12 },
  { nome: "Filtro de ar", km: 20000 },
  { nome: "Filtro de combustível", km: 20000 },
  { nome: "Velas", km: 30000 },
  { nome: "Correia dentada", km: 60000, meses: 48 },
  { nome: "Pastilhas de freio", km: 30000 },
  { nome: "Fluido de freio", meses: 24 },
  { nome: "Pneus", km: 40000 },
  { nome: "Alinhamento", km: 10000 },
  { nome: "Revisão", meses: 12 },
];

/** O backend fala AAAA-MM-DD; a tela fala DD/MM/AAAA. */
function isoParaTela(iso: string | null | undefined): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

function telaParaIso(texto: string): string | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const iso = `${ano}-${mes}-${dia}`;
  // Rejeita 31/02: o Date reinterpreta e cai noutro dia.
  const data = new Date(`${iso}T00:00:00`);
  return Number.isNaN(data.getTime()) || data.getDate() !== Number(dia) ? null : iso;
}

const hoje = () => isoParaTela(new Date().toISOString().slice(0, 10));

const soNumero = (texto: string) => texto.replace(/[^\d]/g, "");

export default function AddManutencaoScreen() {
  const { carId, id } = useLocalSearchParams<{ carId: string; id?: string }>();
  const editando = !!id;

  const { data: car } = useCarById(carId ?? "");
  const { data: manutencoes, isPending: listaPendente } = useManutencoes(carId ?? "");
  const emEdicao = editando ? manutencoes?.find((m) => m.id === id) : undefined;

  const adicionar = useAddManutencao();
  const atualizar = useUpdateManutencao();
  const remover = useRemoveManutencao();

  const [tipo, setTipo] = useState("");
  const [data, setData] = useState(hoje());
  const [km, setKm] = useState("");
  const [intervaloKm, setIntervaloKm] = useState("");
  const [intervaloMeses, setIntervaloMeses] = useState("");
  const [custo, setCusto] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [preenchida, setPreenchida] = useState(false);

  useEffect(() => {
    if (!emEdicao || preenchida) return;
    setTipo(emEdicao.kind);
    setData(isoParaTela(emEdicao.doneAt));
    setKm(emEdicao.odometer != null ? String(emEdicao.odometer) : "");
    setIntervaloKm(emEdicao.intervalKm != null ? String(emEdicao.intervalKm) : "");
    setIntervaloMeses(emEdicao.intervalMonths != null ? String(emEdicao.intervalMonths) : "");
    setCusto(emEdicao.cost != null ? String(emEdicao.cost) : "");
    setObservacao(emEdicao.notes ?? "");
    setPreenchida(true);
  }, [emEdicao, preenchida]);

  /** Escolher a sugestão já traz o intervalo típico — mudar depois é livre. */
  const usarSugestao = (s: (typeof SUGESTOES)[number]) => {
    setTipo(s.nome);
    if (s.km) setIntervaloKm(String(s.km));
    if (s.meses) setIntervaloMeses(String(s.meses));
  };

  // A quilometragem da troca vem do carro quando a pessoa não digita nada:
  // é quase sempre o número certo, e um campo a menos pra preencher.
  useEffect(() => {
    if (!editando && car?.mileage != null) setKm((atual) => atual || String(car.mileage));
  }, [car, editando]);

  const dataIso = telaParaIso(data);
  const dataInvalida = !!data.trim() && dataIso === null;
  const valido = !!tipo.trim() && !!dataIso;

  const aoFalhar = (err: unknown) =>
    setErro(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente de novo.");

  const voltar = () => voltarOuIrPara(`/car/${carId}`);

  const salvar = () => {
    if (!valido || !dataIso || !carId) return;
    setErro(null);

    const campos = {
      kind: tipo.trim(),
      doneAt: dataIso,
      odometer: km.trim() ? Number(km) : null,
      intervalKm: intervaloKm.trim() ? Number(intervaloKm) : null,
      intervalMonths: intervaloMeses.trim() ? Number(intervaloMeses) : null,
      cost: custo.trim() ? Number(custo) : null,
      notes: observacao.trim() || null,
    };

    if (editando && id) {
      atualizar.mutate({ id, carId, patch: campos }, { onSuccess: voltar, onError: aoFalhar });
      return;
    }
    adicionar.mutate({ carId, input: campos }, { onSuccess: voltar, onError: aoFalhar });
  };

  const confirmarExclusao = () => {
    if (!id || !carId) return;
    Alert.alert("Excluir manutenção", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => remover.mutate({ id, carId }, { onSuccess: voltar, onError: aoFalhar }),
      },
    ]);
  };

  const cabecalho = (
    <AppHeader
      title={editando ? "Editar manutenção" : "Nova manutenção"}
      left={
        <Pressable hitSlop={8} onPress={voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  if (editando && !emEdicao) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {cabecalho}
        <View className="flex-1 items-center justify-center px-8">
          {listaPendente ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text className="text-on-surface-variant text-center">
              Manutenção não encontrada. Ela pode ter sido removida.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {cabecalho}

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {!editando && (
          <>
            <Text
              className="text-on-surface-variant mb-2"
              style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
            >
              O QUE FOI FEITO
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {SUGESTOES.map((s) => (
                <Pressable
                  key={s.nome}
                  onPress={() => usarSugestao(s)}
                  className={`mr-2 px-4 py-2.5 border ${
                    tipo === s.nome
                      ? "bg-primary-container border-primary-container"
                      : "border-outline-variant"
                  }`}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: "600" }}
                    className={tipo === s.nome ? "text-on-primary-container" : "text-on-surface-variant"}
                  >
                    {s.nome}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <FormField
          label={editando ? "O que foi feito" : "Ou escreva"}
          placeholder="Ex: Sangria de freio"
          value={tipo}
          onChangeText={setTipo}
        />

        <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
          QUANDO
        </Text>
        <TextInput
          value={data}
          onChangeText={setData}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="numbers-and-punctuation"
          className={dataInvalida ? "mb-1" : "mb-5"}
          style={{
            backgroundColor: colors.inputSurface,
            color: colors.onInputSurface,
            padding: 14,
            fontSize: 15,
            borderWidth: dataInvalida ? 1 : 0,
            borderColor: colors.error,
          }}
        />
        {dataInvalida && (
          <Text className="text-error mb-5" style={{ fontSize: 12 }}>
            Data inválida. Use DD/MM/AAAA.
          </Text>
        )}

        <FormField
          label="Quilometragem na troca"
          placeholder="Ex: 45000"
          hint="Sai do carro quando você não mexe. É o que conta os km até a próxima."
          value={km}
          onChangeText={(t) => setKm(soNumero(t))}
          keyboardType="numeric"
        />

        <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
          AVISAR DE NOVO EM
        </Text>
        <Text className="text-muted mb-3" style={{ fontSize: 12, lineHeight: 16 }}>
          Preencha um dos dois, ou os dois — vale o que chegar primeiro. Deixando
          vazio, o registro fica só no histórico.
        </Text>
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1">
            <TextInput
              value={intervaloKm}
              onChangeText={(t) => setIntervaloKm(soNumero(t))}
              placeholder="10000 km"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="numeric"
              style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
            />
          </View>
          <View className="flex-1">
            <TextInput
              value={intervaloMeses}
              onChangeText={(t) => setIntervaloMeses(soNumero(t))}
              placeholder="12 meses"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="numeric"
              style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
            />
          </View>
        </View>

        <FormField
          label="Custo (R$)"
          placeholder="Ex: 320"
          value={custo}
          onChangeText={(t) => setCusto(soNumero(t))}
          keyboardType="numeric"
        />

        <FormField
          label="Observação"
          placeholder="Oficina, peça usada, o que notou..."
          value={observacao}
          onChangeText={setObservacao}
          multiline
        />

        {erro && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {erro}
          </Text>
        )}

        <PrimaryButton
          label={editando ? "Salvar" : "Registrar manutenção"}
          onPress={salvar}
          disabled={!valido}
          loading={adicionar.isPending || atualizar.isPending}
          icon={<Wrench size={15} color={colors.onPrimaryContainer} />}
        />

        {editando && (
          <Pressable
            onPress={confirmarExclusao}
            disabled={remover.isPending}
            className="flex-row items-center justify-center gap-2 py-4 mt-2 active:opacity-60"
          >
            {remover.isPending ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <Trash2 size={15} color={colors.error} />
                <Text
                  style={{
                    color: colors.error,
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  Excluir manutenção
                </Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
