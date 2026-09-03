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
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, CalendarPlus, Camera, Globe, Link2, MapPin } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { ImageCropper } from "@/components/ImageCropper";
import { DateTimeFields } from "@/components/ui/DateTimeFields";
import { LocationPicker } from "@/components/LocationPicker";
import {
  useEventById,
  useCreateEvent,
  useUpdateEvent,
  useUploadEventPhoto,
} from "@/stores/eventsStore";
import { inputsToIso, isoToDateInput, isoToTimeInput } from "@/utils/event";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";
import type { EventVisibility } from "@/types";

const LABEL = { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 } as const;
const INPUT = {
  backgroundColor: colors.inputSurface,
  color: colors.onInputSurface,
  padding: 14,
  fontSize: 15,
} as const;

export default function AddEventScreen() {
  // eventId presente = edição do evento existente.
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const isEditing = !!eventId;

  const { data: existing, isPending: loadingExisting } = useEventById(eventId ?? "");
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const uploadPhoto = useUploadEventPhoto();

  const [name, setName] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<EventVisibility>("public");
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [cropping, setCropping] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guarda o rolê já criado quando só a foto falhou: sem isto, tocar de
  // novo no botão criaria um segundo rolê igual.
  const [criadoId, setCriadoId] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Preenche uma vez só, pra um refetch não sobrescrever o que já foi
    // digitado.
    if (!existing || hydrated) return;
    setName(existing.name);
    setDateInput(isoToDateInput(existing.startsAt));
    setTimeInput(isoToTimeInput(existing.startsAt));
    setLocation(existing.location);
    setCity(existing.city);
    setDescription(existing.description ?? "");
    setVisibility(existing.visibility);
    if (existing.latitude != null && existing.longitude != null) {
      setCoords({ latitude: existing.latitude, longitude: existing.longitude });
    }
    setHydrated(true);
  }, [existing, hydrated]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) setCropping(result.assets[0].uri);
  };

  const startsAtIso = inputsToIso(dateInput, timeInput);
  const dateTouched = !!dateInput.trim() || !!timeInput.trim();
  const dateInvalid = dateTouched && startsAtIso === null;
  const isValid = !!name.trim() && !!location.trim() && !!city.trim() && startsAtIso !== null;

  const onError = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");

  const submit = () => {
    if (!isValid || !startsAtIso) return;
    setError(null);

    const fields = {
      name: name.trim(),
      description: description.trim() || null,
      startsAt: startsAtIso,
      location: location.trim(),
      city: city.trim(),
      visibility,
      // Com ponto escolhido, o backend usa ele e nem tenta adivinhar pelo
      // texto; sem ele, cai na geocodificação.
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };

    if (isEditing && eventId) {
      updateEvent.mutate(
        { id: eventId, patch: fields },
        {
          onSuccess: async () => {
            const subiu = await enviarFoto(eventId);
            if (subiu) router.back();
          },
          onError,
        }
      );
      return;
    }

    createEvent.mutate(fields, {
      // A foto só pode subir depois: o upload é por id, e o id só existe
      // depois de criar o evento.
      onSuccess: async (created) => {
        setCriadoId(created.id);
        const subiu = await enviarFoto(created.id);
        if (subiu) router.replace(`/event/${created.id}`);
      },
      onError,
    });
  };

  /**
   * Sobe a foto e diz se deu certo.
   *
   * Sem o try/catch, uma falha aqui estourava dentro do onSuccess: a tela
   * não navegava e também não mostrava nada, então parecia que o botão
   * tinha sido ignorado. O rolê em si já está salvo neste ponto — o que
   * falta é só a foto, e é isso que a mensagem precisa dizer.
   */
  const enviarFoto = async (id: string): Promise<boolean> => {
    if (!localPhoto) return true;
    try {
      await uploadPhoto.mutateAsync({ id, localUri: localPhoto });
      return true;
    } catch (err) {
      // O motivo vai na tela, não só no console. Um erro sem causa vira
      // "não deu certo" no relato de quem testou, e aí só resta adivinhar
      // — já custou duas rodadas de conserto às cegas.
      const motivo =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      setError(`O rolê foi salvo, mas a foto não subiu: ${motivo}`);
      return false;
    }
  };

  const header = (
    <AppHeader
      title={isEditing ? "Editar evento" : "Novo evento"}
      left={
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  if (isEditing && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {header}
        {loadingExisting ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-on-surface-variant text-center">
              Evento não encontrado. Ele pode ter sido cancelado.
            </Text>
          </View>
        )}
      </View>
    );
  }

  const photoPreview = localPhoto ?? existing?.photoUrl ?? null;
  const saving = createEvent.isPending || updateEvent.isPending || uploadPhoto.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {header}

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={pickPhoto} className="mb-5 border border-outline active:opacity-80">
          {photoPreview ? (
            <Image
              source={{ uri: photoPreview }}
              style={{ width: "100%", height: 160 }}
              contentFit="cover"
            />
          ) : (
            <View className="items-center justify-center gap-2" style={{ height: 120 }}>
              <Camera size={22} color={colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                Adicionar foto do rolê (opcional)
              </Text>
            </View>
          )}
        </Pressable>

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          NOME DO EVENTO
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Encontro JDM da Marginal"
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
          invalid={dateInvalid}
        />
        <Text className={dateInvalid ? "text-error mb-5" : "text-muted mb-5"} style={{ fontSize: 12 }}>
          {dateInvalid ? "Data ou hora inválida." : "Encontro tem horário — os dois são obrigatórios."}
        </Text>

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          LOCAL
        </Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Ex: Posto Graal, Marginal Tietê"
          placeholderTextColor={colors.inputPlaceholder}
          maxLength={200}
          className="mb-5"
          style={INPUT}
        />

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          CIDADE
        </Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Ex: São Paulo"
          placeholderTextColor={colors.inputPlaceholder}
          maxLength={80}
          className="mb-5"
          style={INPUT}
        />

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          PONTO NO MAPA
        </Text>
        {/* Sem ponto escolhido o servidor tenta adivinhar pelo texto, e às
            vezes erra por quilômetros. Escolher aqui elimina o palpite. */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="flex-row items-center gap-3 border border-outline p-4 mb-5 active:bg-white/5"
        >
          <MapPin size={18} color={coords ? colors.primary : colors.onSurfaceVariant} />
          <View className="flex-1">
            <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
              {coords ? "Ponto marcado" : "Marcar no mapa"}
            </Text>
            <Text className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              {coords
                ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                : "Sem isso, a localização é estimada pelo endereço — e pode sair errada."}
            </Text>
          </View>
          {coords && (
            <Pressable
              onPress={() => setCoords(null)}
              hitSlop={10}
              className="px-2"
            >
              <Text className="text-muted" style={{ fontSize: 12 }}>
                limpar
              </Text>
            </Pressable>
          )}
        </Pressable>

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          QUEM PODE VER
        </Text>
        <View className="mb-5" style={{ gap: 8 }}>
          <VisibilityOption
            active={visibility === "public"}
            icon={<Globe size={16} color={visibility === "public" ? colors.onPrimaryContainer : colors.primary} />}
            title="Público"
            description="Entra no calendário. Qualquer um encontra e confirma."
            onPress={() => setVisibility("public")}
          />
          <VisibilityOption
            active={visibility === "link"}
            icon={<Link2 size={16} color={visibility === "link" ? colors.onPrimaryContainer : colors.primary} />}
            title="Por link"
            description="Não aparece em lugar nenhum. Só quem receber o link entra."
            onPress={() => setVisibility("link")}
          />
        </View>

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          DESCRIÇÃO (OPCIONAL)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Regras, o que levar, horário de chegada..."
          placeholderTextColor={colors.inputPlaceholder}
          multiline
          maxLength={2000}
          className="mb-8"
          style={{ ...INPUT, minHeight: 100, textAlignVertical: "top" }}
        />

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <PrimaryButton
          label={
            criadoId ? "Abrir o rolê" : isEditing ? "Salvar alterações" : "Criar evento"
          }
          onPress={criadoId ? () => router.replace(`/event/${criadoId}`) : submit}
          loading={saving}
          disabled={!criadoId && !isValid}
          icon={<CalendarPlus size={15} color={colors.onPrimaryContainer} />}
        />
      </ScrollView>

      <LocationPicker
        visible={pickerOpen}
        initial={coords}
        onCancel={() => setPickerOpen(false)}
        onDone={(next, endereco) => {
          setCoords(next);
          // O ponto no mapa preenche local e cidade — é o mesmo dado, e
          // digitar de novo o que já foi apontado só cria divergência entre
          // o texto e o pino.
          //
          // Só preenche o que está vazio: sobrescrever o que a pessoa
          // escreveu seria apagar uma escolha dela.
          if (endereco?.location && !location.trim()) setLocation(endereco.location);
          if (endereco?.city && !city.trim()) setCity(endereco.city);
          setPickerOpen(false);
        }}
      />

      {cropping && (
        <ImageCropper
          uri={cropping}
          aspect={16 / 9}
          onCancel={() => setCropping(null)}
          onDone={(uri) => {
            setLocalPhoto(uri);
            setCropping(null);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function VisibilityOption({
  active,
  icon,
  title,
  description,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start gap-3 p-3 border ${
        active ? "bg-primary-container border-primary-container" : "border-outline-variant"
      }`}
    >
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View className="flex-1">
        <Text
          className={active ? "text-on-primary-container" : "text-on-surface"}
          style={{ fontSize: 14, fontWeight: "600" }}
        >
          {title}
        </Text>
        <Text
          className={active ? "text-on-primary-container" : "text-muted"}
          style={{ fontSize: 12, marginTop: 2 }}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
