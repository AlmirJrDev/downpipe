/**
 * Editor da arte pro Stories.
 *
 * A arte automática resolve o caso comum, mas cada um quer mostrar uma coisa:
 * um quer a foto do rolê com a potência, outro quer a foto da oficina sem
 * número nenhum. Aqui a pessoa escolhe a foto, o texto e até três números, e
 * vê o resultado antes de postar — é a mesma imagem que vai sair, não uma
 * simulação.
 */
import React, { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { ArrowLeft, ImagePlus, Instagram } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useArteDeStory } from "@/hooks/useArteDeStory";
import { useCarById, useCarPosts } from "@/stores/garageStore";
import { useModsByCar } from "@/stores/projectStore";
import { apiService } from "@/services/apiService";
import { gerarArteDeStory } from "@/utils/arteDeStory";
import {
  MAXIMO_DE_DESTAQUES,
  arteDoCarro,
  arteDoPost,
  destaquesDoCarro,
  destaquesDoPost,
  fotosDoCarro,
  fotosDoPost,
  selosSugeridos,
  type OpcaoDeDestaque,
} from "@/utils/montarArte";
import { voltarOuIrPara } from "@/utils/navigation";
import { colors } from "@/constants/theme";
import type { ArteDeStory } from "@/utils/arteDeStory";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text
        className="text-on-surface-variant mb-2"
        style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
      >
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  ativo,
  onPress,
}: {
  label: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 px-4 py-2.5 border ${
        ativo ? "bg-primary-container border-primary-container" : "border-outline-variant"
      }`}
    >
      <Text
        style={{ fontSize: 13, fontWeight: "600" }}
        className={ativo ? "text-on-primary-container" : "text-on-surface-variant"}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function EditorDeArteScreen() {
  const { tipo, id } = useLocalSearchParams<{ tipo: string; id: string }>();
  const ehCarro = tipo === "carro";
  const { data: me } = useCurrentUser();
  const arte = useArteDeStory();

  const { data: car, isPending: carroPendente } = useCarById(ehCarro ? id : "");
  const { data: mods } = useModsByCar(ehCarro ? id : "");
  const { data: postsDoCarro } = useCarPosts(ehCarro ? id : "");
  const { data: post, isPending: postPendente } = useQuery({
    queryKey: ["post", id],
    queryFn: () => apiService.getPostById(id),
    enabled: !ehCarro && !!id,
  });

  // A base é a arte automática — o editor começa pronto pra postar, e mexer
  // nele é opcional.
  const base: ArteDeStory | null = useMemo(() => {
    if (ehCarro) return car ? arteDoCarro(car, mods?.length ?? 0) : null;
    return post ? arteDoPost(post, me?.instagram) : null;
  }, [ehCarro, car, mods, post, me]);

  const opcoesDeDestaque: OpcaoDeDestaque[] = useMemo(() => {
    if (ehCarro) return car ? destaquesDoCarro(car, mods?.length ?? 0) : [];
    return post ? destaquesDoPost(post) : [];
  }, [ehCarro, car, mods, post]);

  const fotos = useMemo(() => {
    if (ehCarro) return car ? fotosDoCarro(car, postsDoCarro?.data ?? []) : [];
    return post ? fotosDoPost(post) : [];
  }, [ehCarro, car, postsDoCarro, post]);

  const [foto, setFoto] = useState<string | null>(null);
  /** Foto escolhida da galeria, que não está em foto nenhuma do app. */
  const [fotoDeFora, setFotoDeFora] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [selo, setSelo] = useState<string | null>(null);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [comArroba, setComArroba] = useState(true);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    if (!base || pronta) return;
    setFoto(base.foto);
    setTitulo(base.titulo);
    setSubtitulo(base.subtitulo ?? "");
    setSelo(base.selo ?? null);
    setEscolhidos(
      opcoesDeDestaque
        .filter((o) => base.destaques?.some((d) => d.rotulo === o.rotulo))
        .map((o) => o.chave)
    );
    setPronta(true);
  }, [base, opcoesDeDestaque, pronta]);

  const arteAtual: ArteDeStory | null = useMemo(() => {
    if (!base) return null;
    return {
      ...base,
      foto,
      titulo: titulo.trim() || base.titulo,
      subtitulo: subtitulo.trim() || null,
      selo,
      // Na ordem em que a pessoa marcou, não na ordem da lista.
      destaques: escolhidos
        .map((chave) => opcoesDeDestaque.find((o) => o.chave === chave))
        .filter((o): o is OpcaoDeDestaque => !!o),
      arroba: comArroba ? base.arroba : null,
    };
  }, [base, foto, titulo, subtitulo, selo, escolhidos, comArroba, opcoesDeDestaque]);

  // Prévia: a imagem de verdade, gerada de novo a cada mexida. O respiro de
  // 200ms evita redesenhar a cada tecla digitada no título.
  const [previa, setPrevia] = useState<string | null>(null);
  useEffect(() => {
    if (!arteAtual || !arte.disponivel) return;
    let cancelado = false;
    let url: string | null = null;
    const espera = setTimeout(async () => {
      try {
        const blob = await gerarArteDeStory(arteAtual);
        if (cancelado) return;
        url = URL.createObjectURL(blob);
        setPrevia((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior);
          return url;
        });
      } catch {
        // A prévia falhar não impede tentar compartilhar, que avisa direito.
      }
    }, 200);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [arteAtual, arte.disponivel]);

  // A última prévia fica viva enquanto a tela existe; some junto com ela.
  useEffect(() => () => setPrevia((url) => (url && URL.revokeObjectURL(url), null)), []);

  const escolherDaGaleria = async () => {
    const escolha = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (escolha.canceled || !escolha.assets[0]) return;
    setFotoDeFora(escolha.assets[0].uri);
    setFoto(escolha.assets[0].uri);
  };

  const alternarDestaque = (chave: string) =>
    setEscolhidos((atuais) =>
      atuais.includes(chave)
        ? atuais.filter((c) => c !== chave)
        : atuais.length >= MAXIMO_DE_DESTAQUES
          ? atuais
          : [...atuais, chave]
    );

  const voltar = () => voltarOuIrPara(ehCarro ? `/car/${id}` : `/post/${id}`);

  const cabecalho = (
    <AppHeader
      title="Arte pro Stories"
      left={
        <Pressable hitSlop={8} onPress={voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  const carregando = ehCarro ? carroPendente : postPendente;
  const conteudo = ehCarro ? car : post;
  const souDono = ehCarro
    ? !!me && !!car?.owner && car.owner.username === me.username
    : !!me && !!post?.author && post.author.username === me.username;

  if (carregando) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!conteudo || !souDono) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <EmptyState
          title={conteudo ? "Essa arte não é sua" : "Não encontramos isso"}
          description={
            conteudo
              ? "A arte leva o @ de quem publicou, então só quem publicou pode gerar."
              : "Pode ter sido apagado."
          }
          actionLabel="Voltar"
          onAction={voltar}
        />
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
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-6">
          <View
            className="bg-surface-container"
            style={{ width: 236, height: 420, overflow: "hidden" }}
          >
            {previa ? (
              <Image
                source={{ uri: previa }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        {fotos.length + (fotoDeFora ? 1 : 0) > 1 && (
          <Secao titulo="FOTO">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[...(fotoDeFora ? [fotoDeFora] : []), ...fotos].map((url) => (
                <Pressable
                  key={url}
                  onPress={() => setFoto(url)}
                  className={`mr-2 border-2 ${foto === url ? "border-primary-container" : "border-transparent"}`}
                >
                  <Image source={{ uri: url }} style={{ width: 64, height: 64 }} contentFit="cover" />
                </Pressable>
              ))}
              <Pressable
                onPress={escolherDaGaleria}
                className="border border-dashed border-outline items-center justify-center"
                style={{ width: 64, height: 64 }}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto da galeria"
              >
                <ImagePlus size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </ScrollView>
          </Secao>
        )}

        <Secao titulo="TÍTULO">
          <TextInput
            value={titulo}
            onChangeText={setTitulo}
            placeholder="O nome que aparece grande"
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              backgroundColor: colors.inputSurface,
              color: colors.onInputSurface,
              padding: 14,
              fontSize: 15,
            }}
          />
        </Secao>

        <Secao titulo="LINHA DE BAIXO">
          <TextInput
            value={subtitulo}
            onChangeText={setSubtitulo}
            placeholder="Motor, carro, o que quiser (ou deixe vazio)"
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              backgroundColor: colors.inputSurface,
              color: colors.onInputSurface,
              padding: 14,
              fontSize: 15,
            }}
          />
        </Secao>

        <Secao titulo="ETIQUETA">
          <View className="flex-row flex-wrap">
            <Chip label="Sem etiqueta" ativo={!selo} onPress={() => setSelo(null)} />
            {selosSugeridos(base?.selo ?? null).map((s) => (
              <Chip key={s} label={s} ativo={selo === s} onPress={() => setSelo(s)} />
            ))}
          </View>
        </Secao>

        {opcoesDeDestaque.length > 0 && (
          <Secao titulo={`NÚMEROS (ATÉ ${MAXIMO_DE_DESTAQUES})`}>
            <View className="flex-row flex-wrap">
              {opcoesDeDestaque.map((o) => (
                <Chip
                  key={o.chave}
                  label={`${o.rotulo}: ${o.valor}`}
                  ativo={escolhidos.includes(o.chave)}
                  onPress={() => alternarDestaque(o.chave)}
                />
              ))}
            </View>
          </Secao>
        )}

        {base?.arroba && (
          <Secao titulo="ASSINATURA">
            <View className="flex-row flex-wrap">
              <Chip label={`@${base.arroba}`} ativo={comArroba} onPress={() => setComArroba(true)} />
              <Chip label="Sem @" ativo={!comArroba} onPress={() => setComArroba(false)} />
            </View>
          </Secao>
        )}

        <PrimaryButton
          label="Compartilhar"
          loading={arte.gerando}
          icon={<Instagram size={15} color={colors.onPrimaryContainer} />}
          onPress={() => arteAtual && arte.gerar(arteAtual)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
