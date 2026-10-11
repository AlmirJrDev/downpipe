/**
 * Câmera que lê QR — no celular nativo, a do próprio expo-camera.
 *
 * Na web a leitura é outra (ver CameraDeQR.web.tsx): o leitor web do
 * expo-camera baixa a biblioteca de leitura de um CDN na hora, o que a CSP
 * do servidor barra e a portaria offline não pode depender.
 */
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { CameraView } from "expo-camera";

export function CameraDeQR({
  onLer,
  style,
}: {
  onLer: (conteudo: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <CameraView
      style={style}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={({ data }) => onLer(data)}
    />
  );
}
