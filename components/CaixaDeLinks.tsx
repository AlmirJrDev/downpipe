/**
 * Caixa de links, na fila de encontros (aba LINKS).
 *
 * Achou um post de encontro rolando o Instagram: cola o link aqui e
 * segue a vida. Depois alguém lê o post e lança como sugestão completa na
 * fila — o link passa de "novo" pra "lançado". Colar o mesmo post de novo
 * não duplica.
 */
import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react-native";
import { PrimaryButton } from "@/components/ui/Button";
import { apiService, type LinkDeEncontro } from "@/services/apiService";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";

const SELO: Record<LinkDeEncontro["status"], { texto: string; cor: string }> = {
  novo: { texto: "NOVO", cor: colors.primary },
  lancado: { texto: "LANÇADO NA FILA", cor: colors.success },
  descartado: { texto: "DESCARTADO", cor: colors.muted },
};

const campo = {
  backgroundColor: colors.inputSurface,
  color: colors.onInputSurface,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
} as const;

export function CaixaDeLinks() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const links = useQuery({ queryKey: ["links-de-encontro"], queryFn: () => apiService.getLinksDeEncontro() });

  const guardar = useMutation({
    mutationFn: () => apiService.guardarLinkDeEncontro({ url: url.trim(), note: nota.trim() || undefined }),
    onSuccess: ({ repetido }) => {
      setAviso(repetido ? "Esse link já estava guardado." : "Guardado. Vai pra fila quando for lançado.");
      setUrl("");
      setNota("");
      queryClient.invalidateQueries({ queryKey: ["links-de-encontro"] });
    },
    onError: (e) => setAviso(e instanceof ApiError ? e.message : "Não deu pra guardar. Tente de novo."),
  });

  const lista = links.data ?? [];
  const novos = lista.filter((l) => l.status === "novo").length;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Text className="text-on-surface-variant" style={{ fontSize: 13, lineHeight: 19 }}>
          Achou um post de encontro? Cola o link e segue rolando. Depois ele é lido e lançado na fila com nome,
          data e local.
        </Text>
        <TextInput
          value={url}
          onChangeText={(t) => {
            setUrl(t);
            setAviso(null);
          }}
          placeholder="https://www.instagram.com/p/..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={campo}
        />
        <TextInput
          value={nota}
          onChangeText={setNota}
          placeholder="Nota (opcional): cidade, data, o que lembrar"
          placeholderTextColor={colors.muted}
          style={campo}
        />
        <PrimaryButton
          label="Guardar link"
          onPress={() => guardar.mutate()}
          disabled={!/^https?:\/\/\S+\.\S+/.test(url.trim())}
          loading={guardar.isPending}
          icon={<Link2 size={15} color={colors.onPrimaryContainer} />}
        />
        {aviso && (
          <Text className="text-on-surface-variant" style={{ fontSize: 12.5 }}>
            {aviso}
          </Text>
        )}
      </View>

      <Text className="text-muted" style={{ fontSize: 12 }}>
        {links.isPending
          ? ""
          : lista.length === 0
            ? "Nenhum link guardado ainda."
            : `${lista.length} ${lista.length === 1 ? "link" : "links"} · ${novos} ${novos === 1 ? "novo" : "novos"}`}
      </Text>

      {links.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        lista.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => Linking.openURL(l.url)}
            className="border border-border p-3 active:opacity-80"
            style={{ gap: 4 }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 1.2, color: SELO[l.status].cor }}>
              {SELO[l.status].texto}
            </Text>
            <Text className="text-on-surface" style={{ fontSize: 13.5 }} numberOfLines={1}>
              {l.url.replace(/^https?:\/\//, "")}
            </Text>
            {!!l.note && (
              <Text className="text-on-surface-variant" style={{ fontSize: 12.5 }}>
                {l.note}
              </Text>
            )}
          </Pressable>
        ))
      )}
    </View>
  );
}
