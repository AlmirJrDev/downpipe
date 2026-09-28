/**
 * "Vi um rolê" — a pessoa avisa de um encontro que descobriu por aí.
 *
 * O formulário é curto de propósito: quem viu um story na rua sabe o nome, a
 * cidade e mais ou menos quando. Exigir endereço completo faria ninguém
 * sugerir nada, e sugestão incompleta ainda é melhor do que o encontro passar
 * batido — o resto se completa na hora de aprovar.
 *
 * Nada aqui publica: cai numa fila que alguém confere antes.
 */
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, Send } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { DateTimeFields } from "@/components/ui/DateTimeFields";
import { apiService } from "@/services/apiService";
import { inputsToIso } from "@/utils/event";
import { voltarOuIrPara } from "@/utils/navigation";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";

const LABEL = { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5 };

export default function SugerirRoleScreen() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [description, setDescription] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const startsAt = inputsToIso(dateInput, timeInput);
  const dataInvalida = (!!dateInput.trim() || !!timeInput.trim()) && startsAt === null;
  const valido = name.trim().length >= 3 && !!city.trim() && !dataInvalida;

  const sugerir = useMutation({
    mutationFn: () =>
      apiService.sugerirRole({
        name: name.trim(),
        city: city.trim(),
        location: location.trim() || null,
        startsAt,
        description: description.trim() || null,
        sourceNote: sourceNote.trim() || null,
      }),
    onSuccess: () => setEnviado(true),
    onError: (err) =>
      setErro(err instanceof ApiError ? err.message : "Não deu pra enviar. Tente de novo."),
  });

  const cabecalho = (
    <AppHeader
      title="Vi um rolê"
      left={
        <Pressable
          hitSlop={8}
          onPress={() => voltarOuIrPara("/(tabs)/explore")}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  if (enviado) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {cabecalho}
        <View className="flex-1 items-center justify-center px-8">
          <Check size={40} color={colors.primary} />
          <Text
            className="text-on-surface text-center mt-4"
            style={{ fontSize: 18, fontWeight: "600" }}
          >
            Valeu pelo toque
          </Text>
          <Text
            className="text-on-surface-variant text-center mt-2"
            style={{ fontSize: 14, lineHeight: 20 }}
          >
            A gente confere e, se estiver de pé, publica no app com o crédito de
            quem organiza.
          </Text>
          <View className="w-full mt-7">
            <PrimaryButton
              label="Voltar pros rolês"
              onPress={() => voltarOuIrPara("/(tabs)/explore")}
            />
          </View>
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
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-on-surface-variant mb-5" style={{ fontSize: 13, lineHeight: 19 }}>
          Viu um encontro no Instagram, num cartaz, no grupo? Manda o que você
          sabe — o resto a gente completa.
        </Text>

        <FormField
          label="Nome do rolê"
          placeholder="Ex: Encontro de Carros Antigos de Sumaré"
          value={name}
          onChangeText={setName}
        />

        <FormField label="Cidade" placeholder="Ex: Sumaré" value={city} onChangeText={setCity} />

        <FormField
          label="Onde (opcional)"
          placeholder="Ex: Posto Graal da Anhanguera"
          value={location}
          onChangeText={setLocation}
        />

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          QUANDO (OPCIONAL)
        </Text>
        <DateTimeFields
          date={dateInput}
          onChangeDate={setDateInput}
          time={timeInput}
          onChangeTime={setTimeInput}
          invalid={dataInvalida}
        />
        {dataInvalida && (
          <Text className="text-error mb-4" style={{ fontSize: 12 }}>
            Data ou hora inválida.
          </Text>
        )}

        <FormField
          label="Onde você viu"
          placeholder="Ex: story do @perfil_do_role"
          hint="É o que nos deixa conferir antes de publicar — e dar o crédito certo."
          value={sourceNote}
          onChangeText={setSourceNote}
        />

        <FormField
          label="Mais alguma coisa (opcional)"
          placeholder="Entrada, atrações, o que você lembrar"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {erro && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {erro}
          </Text>
        )}

        <PrimaryButton
          label="Enviar"
          onPress={() => sugerir.mutate()}
          disabled={!valido}
          loading={sugerir.isPending}
          icon={<Send size={15} color={colors.onPrimaryContainer} />}
        />

        <Text className="text-muted mt-3" style={{ fontSize: 11.5, lineHeight: 16 }}>
          A sugestão não vai pro ar sozinha. Alguém confere a data e o local
          antes — encontro cancelado ou data errada atrapalha mais do que ajuda.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
