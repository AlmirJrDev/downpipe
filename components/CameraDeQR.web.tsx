/**
 * Câmera que lê QR, no navegador.
 *
 * O leitor web do expo-camera decodifica num worker que baixa o jsQR do
 * cdn.jsdelivr.net na hora da leitura. A CSP do servidor só libera script
 * do próprio site e do unpkg, então o download era barrado em silêncio: a
 * câmera abria, o QR aparecia na tela e nada acontecia. E mesmo liberado,
 * a portaria passaria a depender de internet pra ler — o contrário do que
 * ela promete.
 *
 * Aqui o jsQR vai dentro do app. Onde o navegador já sabe ler QR sozinho
 * (BarcodeDetector, no Chrome do Android) usa o dele, que é mais rápido;
 * no iPhone, que não tem, o jsQR faz o trabalho.
 */
import React, { useEffect, useRef, useState } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import jsQR from "jsqr";
import { colors } from "@/constants/theme";

/** Lê ~8 quadros por segundo: sobra pra achar o QR e não esquenta o celular. */
const INTERVALO_MS = 120;
/** Quadro reduzido antes de procurar o QR: em 1080p o jsQR travaria a tela. */
const LADO_MAXIMO = 720;

type Detector = { detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function detectorNativo(): Detector | null {
  const Classe = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
    .BarcodeDetector;
  if (!Classe) return null;
  try {
    return new Classe({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export function CameraDeQR({
  onLer,
  style,
}: {
  onLer: (conteudo: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const aoLer = useRef(onLer);
  aoLer.current = onLer;
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let parado = false;
    let fluxo: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const nativo = detectorNativo();

    const ler = async () => {
      if (parado) return;
      const v = video.current;
      try {
        if (v && v.readyState >= 2 && v.videoWidth > 0) {
          if (nativo) {
            const achados = await nativo.detect(v);
            if (achados[0]?.rawValue) aoLer.current(achados[0].rawValue);
          } else if (ctx) {
            const escala = Math.min(1, LADO_MAXIMO / Math.max(v.videoWidth, v.videoHeight));
            canvas.width = Math.round(v.videoWidth * escala);
            canvas.height = Math.round(v.videoHeight * escala);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const quadro = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(quadro.data, quadro.width, quadro.height, { inversionAttempts: "attemptBoth" });
            if (qr?.data) aoLer.current(qr.data);
          }
        }
      } catch {
        // Um quadro que falhou não é motivo pra parar: o próximo vem já.
      }
      if (!parado) timer = setTimeout(ler, INTERVALO_MS);
    };

    (async () => {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (parado) {
          fluxo.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = video.current;
        if (!v) return;
        v.srcObject = fluxo;
        await v.play().catch(() => {});
        ler();
      } catch {
        setErro("Não deu pra abrir a câmera. Confira a permissão do navegador, ou use a aba Lista.");
      }
    })();

    return () => {
      parado = true;
      if (timer) clearTimeout(timer);
      fluxo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <View style={[{ backgroundColor: "#000", overflow: "hidden" }, style]}>
      {/* playsInline e muted: sem eles o Safari do iPhone abre o vídeo em
          tela cheia, ou nem começa a tocar. */}
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {erro && (
        <View className="absolute inset-0 items-center justify-center px-8">
          <Text className="text-center" style={{ color: colors.onSurface, fontSize: 14 }}>
            {erro}
          </Text>
        </View>
      )}
    </View>
  );
}
