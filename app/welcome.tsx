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
    description: "Cadastre seus carros com marca, modelo e versão direto do catálogo FIPE.",
  },
  {
    icon: Wrench,
    title: "Documente o projeto",
    description: "Registre modificações, etapas e orçamento — o progresso é calculado automaticamente.",
  },
  {
    icon: Users,
    title: "Compartilhe com a comunidade",
    description: "Poste fotos do seu build, curta e comente nos projetos de outros gearheads.",
  },
  {
    icon: Sparkles,
    title: "Siga quem também vive de graxa",
    description: "Descubra builds parecidos com o seu e acompanhe a evolução de quem você segue.",
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const goToProfile = () => router.replace("/edit-profile?onboarding=1");

  const goNext = () => {
    if (isLast) {
      goToProfile();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * SCREEN_WIDTH, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
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
        onMomentumScrollEnd={onScrollEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon;
          return (
            <View
              key={i}
              style={{ width: SCREEN_WIDTH, paddingHorizontal: 32 }}
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
