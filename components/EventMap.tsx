import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { PlatformWebView } from "@/components/ui/PlatformWebView";
import { Navigation, TriangleAlert } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { openDirections } from "@/utils/maps";

/**
 * Mapa do local do evento.
 *
 * Feito em WebView com MapLibre GL JS (a versão web) e basemap do CARTO, e
 * não com MapLibre nativo: o módulo nativo não está no Expo Go, e adotá-lo
 * exigiria development build — justamente o que ainda não temos. O WebView
 * está embutido no Expo Go, então isto funciona hoje.
 *
 * O estilo "Dark Matter" do CARTO é gratuito, não pede chave e combina com
 * o carbono e vermelho do app; o Google Maps padrão destoaria.
 */

const MAPLIBRE_VERSION = "4.7.1";
const CARTO_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function buildHtml(latitude: number, longitude: number, accent: string, zoom: number) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet">
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#121212; }
  .pin {
    width:18px; height:18px; border-radius:50%;
    background:${accent}; border:3px solid #fff;
    box-shadow:0 0 0 6px ${accent}44;
  }
  /* A atribuição é exigida pelo OpenStreetMap e pelo CARTO; fica discreta
     mas nunca escondida. */
  .maplibregl-ctrl-attrib { font-size:9px; background:rgba(0,0,0,.5); }
  .maplibregl-ctrl-attrib a { color:#aaa; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<script>
  var map = new maplibregl.Map({
    container: 'map',
    style: '${CARTO_STYLE}',
    center: [${longitude}, ${latitude}],
    zoom: ${zoom},
    // Sem interação: o mapa vive dentro de um ScrollView, e arrastar nele
    // roubaria a rolagem da tela. O toque abre o app de mapa nativo, que é
    // o que a pessoa quer de verdade — traçar rota.
    interactive: false,
    attributionControl: { compact: true }
  });

  var el = document.createElement('div');
  el.className = 'pin';
  new maplibregl.Marker({ element: el })
    .setLngLat([${longitude}, ${latitude}])
    .addTo(map);
</script>
</body>
</html>`;
}

export function EventMap({
  latitude,
  longitude,
  precision,
  location,
  city,
  height = 170,
}: {
  latitude: number | null;
  longitude: number | null;
  precision: "exact" | "city" | "pinned" | null;
  location: string;
  city: string;
  height?: number;
}) {
  // Só "city" é aproximado. "pinned" veio da mão do organizador e "exact"
  // resolveu o endereço — nenhum dos dois merece ressalva.
  const approximate = precision === "city";

  // Ponto aproximado é o centro da cidade: um zoom fechado ali mentiria
  // sobre a precisão, então afasta a câmera.
  const zoom = approximate ? 11 : 15;

  const html = useMemo(
    () =>
      latitude != null && longitude != null
        ? buildHtml(latitude, longitude, colors.primary, zoom)
        : null,
    [latitude, longitude, zoom]
  );

  /**
   * Pergunta em qual app de mapa abrir a rota.
   *
   * Passa a coordenada como confiável só quando ela foi cravada ou o endereço
   * resolveu: coordenada aproximada é o centro da cidade, e traçar rota até
   * lá levaria a pessoa ao lugar errado — melhor mandar o texto e deixar o
   * app de mapa resolver.
   */
  const openInMaps = () =>
    openDirections({
      latitude,
      longitude,
      label: `${location}, ${city}`,
      preciso: precision === "pinned" || precision === "exact",
    });

  if (!html) {
    // Sem coordenada: só o atalho de navegação, que funciona com o texto.
    return (
      <Pressable
        onPress={openInMaps}
        className="flex-row items-center justify-center gap-2 border border-outline py-3.5 active:bg-white/5"
      >
        <Navigation size={15} color={colors.onSurface} />
        <Text
          className="text-on-surface"
          style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
        >
          COMO CHEGAR
        </Text>
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable onPress={openInMaps} className="border border-border overflow-hidden">
        <View style={{ height }} pointerEvents="none">
          <PlatformWebView
            source={{ html }}
            style={{ flex: 1, backgroundColor: colors.surface }}
            scrollEnabled={false}
            originWhitelist={["*"]}
            // Sem isto o Android bloqueia o carregamento do script do CDN.
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      </Pressable>

      {approximate && (
        <View className="flex-row items-start gap-2 mt-2">
          <TriangleAlert size={13} color={colors.warning} style={{ marginTop: 1 }} />
          <Text className="text-muted flex-1" style={{ fontSize: 11, lineHeight: 16 }}>
            Localização aproximada — não conseguimos achar o endereço exato, então
            o mapa mostra a região de {city}.
          </Text>
        </View>
      )}

      <Pressable
        onPress={openInMaps}
        className="flex-row items-center justify-center gap-2 border border-outline py-3.5 mt-3 active:bg-white/5"
      >
        <Navigation size={15} color={colors.onSurface} />
        <Text
          className="text-on-surface"
          style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
        >
          COMO CHEGAR
        </Text>
      </Pressable>
    </View>
  );
}
