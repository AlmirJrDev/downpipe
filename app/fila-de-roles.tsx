/**
 * A fila de rolês garimpados, pra quem publica.
 *
 * O que chega aqui vem de fora do app — post de Instagram, cartaz, alguém
 * que avisou — e chega torto: sem hora, sem cidade, com data do ano passado.
 * Por isso a tela não é só "aprovar ou recusar": cada card abre no mesmo
 * formulário do rolê, já preenchido com o que se descobriu, pra corrigir
 * antes de publicar. Data errada em post de rede social é a regra.
 *
 * A fonte fica sempre à mão porque conferir o flyer é parte do trabalho — e
 * ela vai junto pro evento publicado, pra quem for saber que a informação é
 * de segunda mão antes de dirigir 80 km até lá.
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink } from "lucide-react-native";
import { Alert } from "@/utils/alert";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui/States";
import { DateTimeFields } from "@/components/ui/DateTimeFields";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { voltarOuIrPara } from "@/utils/navigation";
import { eventFullDate, inputsToIso, isoToDateInput, isoToTimeInput } from "@/utils/event";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";
import { ATRACOES, PROIBICOES, TIPOS_DE_ROLE } from "@/constants/detalhesDoRole";
import { categoryLabel } from "@/utils/labels";
import type { Category, RoleNaFila } from "@/types";

const LABEL = { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5 };
const INPUT = {
  backgroundColor: colors.inputSurface,
  color: colors.onInputSurface,
  padding: 14,
  fontSize: 15,
} as const;

const CATEGORIAS_DE_CARRO: Category[] = [
  "JDM",
  "Euro",
  "Muscle",
  "Performance",
  "Clássicos",
  "Stance",
  "Other",
];

const ABAS = [
  { chave: "pending", rotulo: "NA FILA" },
  { chave: "approved", rotulo: "PUBLICADOS" },
  { chave: "rejected", rotulo: "DESCARTADOS" },
] as const;

type Aba = (typeof ABAS)[number]["chave"];

const ORIGEM: Record<RoleNaFila["source"], string> = {
  web: "achado na web",
  usuario: "alguém avisou",
  manual: "digitado à mão",
};

const alternar = (lista: string[], chave: string) =>
  lista.includes(chave) ? lista.filter((c) => c !== chave) : [...lista, chave];

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 px-3.5 py-2 border ${
        ativo ? "bg-primary-container border-primary-container" : "border-outline-variant"
      }`}
    >
      <Text
        style={{ fontSize: 12.5, fontWeight: "600" }}
        className={ativo ? "text-on-primary-container" : "text-on-surface-variant"}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Botao({
  label,
  onPress,
  destrutivo,
  ocupado,
  desabilitado,
}: {
  label: string;
  onPress: () => void;
  destrutivo?: boolean;
  ocupado?: boolean;
  desabilitado?: boolean;
}) {
  const apagado = ocupado || desabilitado;
  return (
    <Pressable
      onPress={onPress}
      disabled={apagado}
      className={`flex-1 border py-3 items-center active:opacity-70 ${
        destrutivo ? "border-error" : "border-outline"
      } ${apagado ? "opacity-40" : ""}`}
    >
      <Text
        style={{
          color: destrutivo ? colors.error : colors.onSurface,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

/** A linha de crédito: de onde veio e o link pra conferir. */
function Fonte({ role }: { role: RoleNaFila }) {
  const nota = role.sourceNote ?? ORIGEM[role.source];
  return (
    <View className="mt-3">
      <Text className="text-muted" style={{ fontSize: 12 }}>
        {nota}
        {role.suggestedBy ? ` · @${role.suggestedBy}` : ""}
      </Text>
      {role.sourceUrl ? (
        <Pressable
          onPress={() => Linking.openURL(role.sourceUrl as string)}
          className="flex-row items-center gap-1.5 mt-1.5 active:opacity-60"
          hitSlop={6}
        >
          <ExternalLink size={13} color={colors.primary} />
          <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
            Abrir a fonte
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Um rolê da fila: resumo do que se sabe, e o formulário inteiro quando
 * se abre pra revisar.
 *
 * O estado do formulário nasce aqui dentro, um por card, pra fechar e abrir
 * outro não misturar o que foi digitado.
 */
function CardDaFila({ role, aba }: { role: RoleNaFila; aba: Aba }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [name, setName] = useState(role.name);
  const [dateInput, setDateInput] = useState(isoToDateInput(role.startsAt));
  const [timeInput, setTimeInput] = useState(isoToTimeInput(role.startsAt));
  const [endTimeInput, setEndTimeInput] = useState(
    role.endsAt ? isoToTimeInput(role.endsAt) : ""
  );
  const [endEstimated, setEndEstimated] = useState(role.endsAtEstimated ?? true);
  const [location, setLocation] = useState(role.location ?? "");
  const [city, setCity] = useState(role.city ?? "");
  const [entryNote, setEntryNote] = useState(role.entryNote ?? "");
  const [organizerInstagram, setOrganizerInstagram] = useState(role.organizerInstagram ?? "");
  const [kind, setKind] = useState<string | null>(role.kind);
  const [attractions, setAttractions] = useState<string[]>(role.attractions ?? []);
  const [rules, setRules] = useState<string[]>(role.rules ?? []);
  const [carCategories, setCarCategories] = useState<string[]>(role.carCategories ?? []);
  const [description, setDescription] = useState(role.description ?? "");

  const startsAtIso = inputsToIso(dateInput, timeInput);
  const dataMexida = !!dateInput.trim() || !!timeInput.trim();
  const dataInvalida = dataMexida && startsAtIso === null;

  /** Mesma regra do formulário de evento: hora menor que a do começo virou o dia. */
  const endsAtIso = (() => {
    if (!endTimeInput.trim() || !startsAtIso) return null;
    const fim = inputsToIso(dateInput, endTimeInput);
    if (!fim) return null;
    return Date.parse(fim) > Date.parse(startsAtIso)
      ? fim
      : new Date(Date.parse(fim) + 86_400_000).toISOString();
  })();

  // O que ainda falta pra isso ser um rolê de verdade. Aparece no card
  // fechado pra dar pra escolher o que revisar sem abrir um por um.
  const falta = [
    !startsAtIso ? "data e hora" : null,
    !location.trim() ? "o lugar" : null,
    !city.trim() ? "a cidade" : null,
  ].filter(Boolean) as string[];

  const podePublicar = falta.length === 0 && !!name.trim();

  const atualizar = () => {
    queryClient.invalidateQueries({ queryKey: ["fila-de-roles"] });
    queryClient.invalidateQueries({ queryKey: ["roles-na-fila-count"] });
    // O rolê novo entra no calendário e nos mapas.
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const naoDeu = (err: unknown) =>
    setErro(err instanceof ApiError ? err.message : "Não deu pra salvar. Tente de novo.");

  const publicar = useMutation({
    mutationFn: () =>
      apiService.aprovarRole(role.id, {
        name: name.trim(),
        description: description.trim() || null,
        startsAt: startsAtIso as string,
        endsAt: endsAtIso,
        endsAtEstimated: endsAtIso ? endEstimated : false,
        location: location.trim(),
        city: city.trim(),
        entryNote: entryNote.trim() || null,
        organizerInstagram: organizerInstagram.trim() || null,
        attractions,
        rules,
        kind,
        carCategories,
      }),
    onSuccess: ({ eventId }) => {
      atualizar();
      Alert.alert("Rolê publicado", "Ele já está no calendário.", [
        { text: "Fechar", style: "cancel" },
        { text: "Ver o rolê", onPress: () => router.push(`/event/${eventId}`) },
      ]);
    },
    onError: naoDeu,
  });

  const descartar = useMutation({
    mutationFn: () => apiService.descartarRole(role.id),
    onSuccess: atualizar,
    onError: naoDeu,
  });

  const confirmarDescarte = () =>
    Alert.alert("Descartar este rolê?", "Ele sai da fila e não vira evento.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: () => descartar.mutate() },
    ]);

  const salvando = publicar.isPending || descartar.isPending;

  return (
    <View className="border border-border p-4 mb-3">
      <Text className="text-on-surface" style={{ fontSize: 16, fontWeight: "700" }}>
        {role.name}
      </Text>

      <Text
        className={role.startsAt ? "text-on-surface-variant mt-1" : "text-error mt-1"}
        style={{ fontSize: 13 }}
      >
        {role.startsAt ? eventFullDate(role.startsAt) : "Sem data"}
      </Text>

      <Text className="text-on-surface-variant mt-0.5" style={{ fontSize: 13 }}>
        {[role.location, role.city].filter(Boolean).join(" · ") || "Sem lugar definido"}
      </Text>

      {role.entryNote ? (
        <Text className="text-on-surface-variant mt-0.5" style={{ fontSize: 13 }}>
          Entrada: {role.entryNote}
        </Text>
      ) : null}

      {role.organizerInstagram ? (
        <Text className="text-on-surface-variant mt-0.5" style={{ fontSize: 13 }}>
          Organiza: @{role.organizerInstagram}
        </Text>
      ) : null}

      <Fonte role={role} />

      {aba === "approved" && role.eventId ? (
        <Pressable
          onPress={() => router.push(`/event/${role.eventId}`)}
          className="mt-3 active:opacity-60"
          hitSlop={6}
        >
          <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
            Ver o rolê publicado
          </Text>
        </Pressable>
      ) : null}

      {aba !== "pending" ? null : !aberto ? (
        <>
          {falta.length > 0 && (
            <Text className="text-muted mt-3" style={{ fontSize: 12 }}>
              Falta {falta.join(", ").replace(/, ([^,]*)$/, " e $1")} pra publicar.
            </Text>
          )}
          <View className="flex-row gap-2 mt-4">
            <Botao label="Revisar" onPress={() => setAberto(true)} />
            <Botao
              label="Descartar"
              destrutivo
              onPress={confirmarDescarte}
              ocupado={salvando}
            />
          </View>
        </>
      ) : (
        <View className="mt-5 border-t border-border pt-5">
          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            NOME DO ROLÊ
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.inputPlaceholder}
            maxLength={120}
            className="mb-5"
            style={INPUT}
          />

          <DateTimeFields
            date={dateInput}
            time={timeInput}
            onChangeDate={setDateInput}
            onChangeTime={setTimeInput}
            invalid={dataInvalida}
          />
          <Text
            className={dataInvalida ? "text-error mb-5" : "text-muted mb-5"}
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {dataInvalida
              ? "Data ou hora inválida."
              : "Confira no flyer antes de publicar — post reaproveitado de outro ano é o erro mais comum."}
          </Text>

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            ATÉ QUE HORAS (OPCIONAL)
          </Text>
          <View className="flex-row items-center gap-3 mb-5">
            <View style={{ width: 120 }}>
              <TextInput
                value={endTimeInput}
                onChangeText={setEndTimeInput}
                placeholder="22:00"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numbers-and-punctuation"
                style={INPUT}
              />
            </View>
            {!!endTimeInput.trim() && (
              <Pressable
                onPress={() => setEndEstimated((v) => !v)}
                className="flex-1 flex-row items-center gap-2 active:opacity-70"
              >
                <View
                  className="items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderWidth: 1,
                    borderColor: endEstimated ? colors.primaryContainer : colors.outline,
                    backgroundColor: endEstimated ? colors.primaryContainer : "transparent",
                  }}
                >
                  {endEstimated && <Check size={13} color={colors.onPrimaryContainer} />}
                </View>
                <Text className="text-on-surface-variant flex-1" style={{ fontSize: 12.5 }}>
                  É por volta disso, não hora marcada
                </Text>
              </Pressable>
            )}
          </View>

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            NOME DO LUGAR
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Ex: Posto Graal"
            placeholderTextColor={colors.inputPlaceholder}
            maxLength={200}
            className="mb-5"
            style={INPUT}
          />

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            CIDADE
          </Text>
          {/* Sem ponto no mapa aqui de propósito: o servidor acha pelo texto,
              e quem revisa vinte rolês não vai marcar vinte pinos. Quem quiser
              ajustar o ponto edita o rolê depois de publicado. */}
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Ex: Campinas"
            placeholderTextColor={colors.inputPlaceholder}
            maxLength={80}
            className="mb-5"
            style={INPUT}
          />

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            QUEM ORGANIZA (@ DO INSTAGRAM)
          </Text>
          {/* O rolê é de quem divulgou. Você entra como organizador no app
              porque alguém precisa poder editar e tirar do ar, mas é este @
              que a tela credita — e é pra ele que quem tem dúvida escreve. */}
          <TextInput
            value={organizerInstagram}
            onChangeText={setOrganizerInstagram}
            placeholder="amante_dos_baixos"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
            className="mb-5"
            style={INPUT}
          />

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            ENTRADA (OPCIONAL)
          </Text>
          <TextInput
            value={entryNote}
            onChangeText={setEntryNote}
            placeholder="Ex: 1 kg de alimento não perecível"
            placeholderTextColor={colors.inputPlaceholder}
            maxLength={120}
            className="mb-5"
            style={INPUT}
          />

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            TIPO DE ROLÊ
          </Text>
          <View className="flex-row flex-wrap mb-5">
            {TIPOS_DE_ROLE.map((t) => (
              <Chip
                key={t.chave}
                label={t.rotulo}
                ativo={kind === t.chave}
                onPress={() => setKind(kind === t.chave ? null : t.chave)}
              />
            ))}
          </View>

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            O QUE TEM NO ROLÊ
          </Text>
          <View className="flex-row flex-wrap mb-5">
            {ATRACOES.map((a) => (
              <Chip
                key={a.chave}
                label={a.rotulo}
                ativo={attractions.includes(a.chave)}
                onPress={() => setAttractions(alternar(attractions, a.chave))}
              />
            ))}
          </View>

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            O QUE NÃO PODE
          </Text>
          <View className="flex-row flex-wrap mb-5">
            {PROIBICOES.map((r) => (
              <Chip
                key={r.chave}
                label={r.rotulo}
                ativo={rules.includes(r.chave)}
                onPress={() => setRules(alternar(rules, r.chave))}
              />
            ))}
          </View>

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            CARROS ESPERADOS
          </Text>
          <Text className="text-muted mb-2" style={{ fontSize: 12, lineHeight: 16 }}>
            Vazio = qualquer carro. Marcando, só quem tem carro dessas categorias
            confirma levando ele.
          </Text>
          <View className="flex-row flex-wrap mb-5">
            {CATEGORIAS_DE_CARRO.map((c) => (
              <Chip
                key={c}
                label={categoryLabel(c)}
                ativo={carCategories.includes(c)}
                onPress={() => setCarCategories(alternar(carCategories, c))}
              />
            ))}
          </View>

          <Text className="text-on-surface-variant mb-2" style={LABEL}>
            DESCRIÇÃO (OPCIONAL)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="O que levar, como é a entrada, quem organiza..."
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            maxLength={2000}
            className="mb-5"
            style={{ ...INPUT, minHeight: 90, textAlignVertical: "top" }}
          />

          {erro && (
            <Text className="text-error mb-3" style={{ fontSize: 13 }}>
              {erro}
            </Text>
          )}

          {!podePublicar && falta.length > 0 && (
            <Text className="text-muted mb-3" style={{ fontSize: 12 }}>
              Ainda falta {falta.join(", ").replace(/, ([^,]*)$/, " e $1")}.
            </Text>
          )}

          <View className="flex-row gap-2">
            <Botao label="Fechar" onPress={() => setAberto(false)} ocupado={salvando} />
            <Botao
              label="Publicar"
              onPress={() => {
                setErro(null);
                publicar.mutate();
              }}
              ocupado={publicar.isPending}
              desabilitado={!podePublicar}
            />
          </View>

          <View className="flex-row gap-2 mt-2">
            <Botao
              label="Descartar este rolê"
              destrutivo
              onPress={confirmarDescarte}
              ocupado={salvando}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export default function FilaDeRolesScreen() {
  const { data: me, isPending: mePendente } = useCurrentUser();
  const [aba, setAba] = useState<Aba>("pending");

  const fila = useQuery({
    queryKey: ["fila-de-roles", aba],
    queryFn: () => apiService.getFilaDeRoles(aba),
    enabled: !!me?.isAdmin,
  });

  const cabecalho = (
    <AppHeader
      title="Rolês na fila"
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
  );

  if (mePendente) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  // Mesma escolha da moderação: pra quem não publica, a página não existe —
  // o backend responde 404 e a entrada nem aparece no menu.
  if (!me?.isAdmin) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <EmptyState
          title="Página não encontrada"
          description="Confira o endereço."
          actionLabel="Ir pro feed"
          onAction={() => router.replace("/(tabs)")}
        />
      </View>
    );
  }

  const roles = fila.data ?? [];

  return (
    <View className="flex-1 bg-surface">
      {cabecalho}

      <View className="flex-row border-b border-border px-4">
        {ABAS.map(({ chave, rotulo }) => (
          <Pressable key={chave} onPress={() => setAba(chave)} className="mr-6 pb-3 pt-1">
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 0.5,
                color: aba === chave ? colors.onSurface : colors.muted,
              }}
            >
              {rotulo}
            </Text>
            {aba === chave && (
              <View style={{ height: 2, backgroundColor: colors.primaryContainer, marginTop: 8 }} />
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={fila.isFetching}
            onRefresh={() => fila.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {fila.isPending ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : roles.length === 0 ? (
          <EmptyState
            title={aba === "pending" ? "Fila vazia" : "Nada aqui ainda"}
            description={
              aba === "pending"
                ? "Nenhum rolê esperando conferência."
                : aba === "approved"
                  ? "Os rolês que você publicar aparecem aqui."
                  : "Os rolês que você descartar aparecem aqui."
            }
          />
        ) : (
          <>
            {aba === "pending" && (
              <Text className="text-muted mb-4" style={{ fontSize: 12, lineHeight: 16 }}>
                {roles.length === 1 ? "1 rolê esperando" : `${roles.length} rolês esperando`}.
                Abra a fonte, confira a data e publique.
              </Text>
            )}
            {roles.map((r) => (
              <CardDaFila key={r.id} role={r} aba={aba} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
