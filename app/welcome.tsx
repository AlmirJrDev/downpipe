import React, { useRef, useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Car, Wrench, Users, Sparkles } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/ui/Button";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    icon: Car,
    title: "Monte sua garagem",
    description: "Cadastre seus carros com marca, modelo e versão direto do catálogo.",
  },
  {
    icon: Wrench,
    title: "Documente o projeto",
    description: "Registre modificações, etapas e orçamento — o progresso é calculado automaticamente.",
  },
  {
    icon: Users,
    title: "Compartilhe com a comunidade",
    description: "Poste fotos do seu carro, curta e comente no projeto da galera.",
  },
  {
    icon: Sparkles,
    title: "Siga quem também vive de graxa",
    description: "Descubra projetos parecidos com o seu e acompanhe a evolução de quem você segue.",
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  // Largura de verdade do carrossel, medida na tela. A da janela errava no
  // computador, onde o app fica numa coluna mais estreita que a janela.
  const [largura, setLargura] = useState(SCREEN_WIDTH);
  const isLast = index === SLIDES.length - 1;

  const goToProfile = () => router.replace("/edit-profile?onboarding=1");

  const irPara = (i: number) => {
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * largura, animated: true });
  };

  /**
   * O "Próximo" anda pelo índice que ele mesmo guarda. Antes o índice só
   * mudava no fim da rolagem (onMomentumScrollEnd) — evento que o
   * navegador não dispara: o primeiro toque ia pro slide 2 e os outros
   * mandavam ir pro 2 de novo, e o botão nunca chegava em "Vamos começar".
   */
  const goNext = () => {
    if (isLast) {
      goToProfile();
      return;
    }
    irPara(index + 1);
  };

  // Arrastar com o dedo também troca o slide (e o pontinho embaixo).
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const atual = Math.round(e.nativeEvent.contentOffset.x / largura);
    if (atual !== index && atual >= 0 && atual < SLIDES.length) setIndex(atual);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View className="flex-row justify-end px-5" style={{ paddingTop: insets.top + 12 }}>
        <Pressable onPress={goToProfile} hitSlop={8}>
          <Text
            className="text-on-surface-variant"
            style={{ fontSize: 13, fontWeight: "600", letterSpacing: 1 }}
          >
            PULAR
          </Text>
        </Pressable>
      </View>

      {/* Marca acima do carrossel: é a primeira tela depois do cadastro, e
          era o único ponto do onboarding sem identidade nenhuma. */}
      <View className="items-center pt-2 pb-6">
        <Logo height={40} />
        <Text
          className="text-on-surface-variant mt-3"
          style={{ fontSize: 10, fontWeight: "500", letterSpacing: 4.2 }}
        >
          REDE SOCIAL AUTOMOTIVA
        </Text>
        <Text className="text-muted mt-2" style={{ fontSize: 13 }}>
          Todo projeto tem uma história.
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon;
          return (
            <View
              key={i}
              style={{ width: largura, paddingHorizontal: 32 }}
              className="items-center justify-center"
            >
              <View
                className="items-center justify-center mb-8"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.surfaceHigh,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Icon size={36} color={colors.primary} />
              </View>
              <Text className="text-on-surface text-center mb-3" style={typography.headlineSm}>
                {slide.title}
              </Text>
              <Text
                className="text-on-surface-variant text-center"
                style={{ fontSize: 15, lineHeight: 22 }}
              >
                {slide.description}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="flex-row justify-center items-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? colors.primary : colors.outlineVariant,
            }}
          />
        ))}
      </View>

      <View className="px-6" style={{ marginBottom: insets.bottom + 24 }}>
        <PrimaryButton label={isLast ? "Vamos começar" : "Próximo"} onPress={goNext} />
      </View>
    </View>
  );
}
