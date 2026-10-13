/**
 * As animações dos jogos: peça que vira, confete de vitória, cartão que
 * treme no erro, número que pula.
 *
 * Quem pediu "reduzir movimento" no sistema não vê nada disso: as peças
 * aparecem prontas e o confete não cai.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

/** Vibração curta no celular; no navegador não faz nada. */
export function vibrar(tipo: "acerto" | "erro" | "leve" = "leve") {
  if (Platform.OS === "web") return;
  if (tipo === "leve") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      tipo === "acerto" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
}

/**
 * Peça que vira de pé, como no Termo: a linha do palpite se revela uma
 * casa de cada vez. `pulo` faz a peça saltar depois (a linha da vitória).
 */
export function Virar({
  animar,
  atraso,
  pulo,
  style,
  children,
}: {
  animar: boolean;
  atraso: number;
  /** Atraso do salto, em ms; sem ele a peça só vira. */
  pulo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reduzir = useReducedMotion();
  const giro = useSharedValue(animar && !reduzir ? 0 : 1);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!animar || reduzir) return;
    giro.value = withDelay(atraso, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    if (pulo != null)
      y.value = withDelay(
        pulo,
        withSequence(withTiming(-12, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 220 }))
      );
    // Só na montagem: a peça vira uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: giro.value < 0.15 ? 0 : 1,
    transform: [{ perspective: 600 }, { translateY: y.value }, { rotateX: `${(1 - giro.value) * 90}deg` }],
  }));
  return <Animated.View style={[style, estilo]}>{children}</Animated.View>;
}

/** Entra crescendo de leve, com mola: o cartão da vitória. */
export function Surgir({ children, atraso = 0, style }: { children: React.ReactNode; atraso?: number; style?: StyleProp<ViewStyle> }) {
  const reduzir = useReducedMotion();
  const p = useSharedValue(reduzir ? 1 : 0);
  useEffect(() => {
    if (!reduzir) p.value = withDelay(atraso, withSpring(1, { damping: 11, stiffness: 140 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const estilo = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.5),
    transform: [{ scale: 0.86 + 0.14 * p.value }, { translateY: (1 - p.value) * 14 }],
  }));
  return <Animated.View style={[style, estilo]}>{children}</Animated.View>;
}

/** Tremida de "não": chama `tremer()` e aplica `estilo`. */
export function useTremor() {
  const x = useSharedValue(0);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const tremer = () => {
    x.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 70 }),
      withTiming(-8, { duration: 70 }),
      withTiming(6, { duration: 70 }),
      withTiming(0, { duration: 60 })
    );
  };
  return { estilo, tremer };
}

/** Pulo de placar: cresce e volta. */
export function usePulo() {
  const s = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const pular = (forca = 1.35) => {
    s.value = withSequence(withTiming(forca, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 200 }));
  };
  return { estilo, pular };
}

/** "+1" que sobe e some em cima do placar. */
export function MaisUm({ disparo, cor }: { disparo: number; cor: string }) {
  const p = useSharedValue(1);
  useEffect(() => {
    if (!disparo) return;
    p.value = 0;
    p.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
  }, [disparo, p]);
  const estilo = useAnimatedStyle(() => ({
    opacity: p.value >= 1 ? 0 : 1 - p.value,
    transform: [{ translateY: -28 * p.value }],
  }));
  return (
    <Animated.Text
      pointerEvents="none"
      style={[{ position: "absolute", top: -6, right: 0, color: cor, fontWeight: "900", fontSize: 18 }, estilo]}
    >
      +1
    </Animated.Text>
  );
}

// ------------------------------------------------------------------ confete

const CORES = ["#da291c", "#ff4a3d", "#f0f0f0", "#15803d", "#22c55e", "#facc15"];

interface Pedaco {
  x0: number;
  vx: number;
  subida: number;
  giro: number;
  atraso: number;
  duracao: number;
  w: number;
  h: number;
  cor: string;
}

function UmPedaco({ p, largura, altura, relogio }: { p: Pedaco; largura: number; altura: number; relogio: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (relogio.value - p.atraso) / p.duracao));
    // Sobe e cai em parábola, abrindo pros lados.
    const x = largura * p.x0 + p.vx * t;
    const y = altura * 0.42 - p.subida * t + altura * 1.25 * t * t;
    return {
      opacity: t === 0 || t >= 1 ? 0 : t > 0.8 ? (1 - t) / 0.2 : 1,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${p.giro * t}deg` }, { rotateX: `${p.giro * 1.7 * t}deg` }],
    };
  });
  return <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: p.w, height: p.h, backgroundColor: p.cor }, estilo]} />;
}

/**
 * Chuva de confete por cima da tela. Cada valor novo de `disparo` (> 0)
 * solta uma leva. Não pega toque: dá pra seguir mexendo na tela.
 */
export function Confete({ disparo, quantidade = 70 }: { disparo: number; quantidade?: number }) {
  const reduzir = useReducedMotion();
  const [tam, setTam] = useState({ largura: 0, altura: 0 });
  const relogio = useSharedValue(0);
  const DURACAO_MAX = 3000;

  const pedacos = useMemo<Pedaco[]>(() => {
    if (!disparo) return [];
    const r = Math.random;
    return Array.from({ length: quantidade }, () => ({
      x0: 0.5 + (r() - 0.5) * 0.3,
      vx: (r() - 0.5) * (tam.largura || 400) * 1.2,
      subida: (tam.altura || 700) * (0.45 + r() * 0.5),
      giro: (r() - 0.5) * 900,
      atraso: r() * 250,
      duracao: 1700 + r() * 1000,
      w: 6 + r() * 6,
      h: 9 + r() * 9,
      cor: CORES[Math.floor(r() * CORES.length)],
    }));
  }, [disparo, quantidade, tam.largura, tam.altura]);

  useEffect(() => {
    if (!disparo || reduzir) return;
    relogio.value = 0;
    relogio.value = withTiming(DURACAO_MAX, { duration: DURACAO_MAX, easing: Easing.linear });
  }, [disparo, reduzir, relogio]);

  if (!disparo || reduzir) return null;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setTam({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height })}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 50 }}
    >
      {tam.largura > 0 &&
        pedacos.map((p, i) => <UmPedaco key={`${disparo}-${i}`} p={p} largura={tam.largura} altura={tam.altura} relogio={relogio} />)}
    </View>
  );
}
