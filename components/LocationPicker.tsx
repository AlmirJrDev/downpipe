import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { PlatformWebView, type PlatformWebViewRef } from "@/components/ui/PlatformWebView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Check, Crosshair, MapPin, Search, X } from "lucide-react-native";
import { PrimaryButton } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { colors } from "@/constants/theme";

/**
 * Escolha do local do evento — os três caminhos que eliminam a adivinhação:
 *
 *  1. buscar o endereço e escolher da lista (a coordenada vem junto);
 *  2. tocar no mapa pra cravar o ponto exato;
 *  3. usar o GPS, quando o organizador está no local.
 *
 * Sem isto, o servidor recebia texto livre e tentava adivinhar depois — o que
 * já mandou "Posto Graal, Marginal Tietê" pra Praça da Sé, 8 km fora.
 *
 * Em WebView com MapLibre GL JS porque o MapLibre nativo não está no Expo Go.
 */

const MAPLIBRE_VERSION = "4.7.1";
const CARTO_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// São Paulo, só como ponto de partida quando não há nada escolhido ainda.
const FALLBACK = { latitude: -23.5505, longitude: -46.6333 };

function buildHtml(latitude: number, longitude: number, accent: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet">
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#121212; }
  .pin { width:20px; height:20px; border-radius:50%; background:${accent};
         border:3px solid #fff; box-shadow:0 0 0 7px ${accent}44; }
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
    zoom: 15,
    attributionControl: { compact: true }
  });

  var el = document.createElement('div');
  el.className = 'pin';
  var marker = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([${longitude}, ${latitude}])
    .addTo(map);

  function envia(lngLat) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      latitude: lngLat.lat, longitude: lngLat.lng
    }));
  }

  // Tocar no mapa move o pino; arrastar o pino também vale.
  map.on('click', function (e) { marker.setLngLat(e.lngLat); envia(e.lngLat); });
  marker.on('dragend', function () { envia(marker.getLngLat()); });

  // Chamado pelo app quando o endereço é escolhido na busca ou vem do GPS.
  window.irPara = function (lat, lng) {
    marker.setLngLat([lng, lat]);
    map.flyTo({ center: [lng, lat], zoom: 16 });
  };
</script>
</body>
</html>`;
}

export function LocationPicker({
  visible,
  initial,
  onCancel,
  onDone,
}: {
  visible: boolean;
  initial?: { latitude: number; longitude: number } | null;
  onCancel: () => void;
  /** `label` vem preenchido só quando o ponto saiu de uma sugestão de endereço. */
  onDone: (coords: { latitude: number; longitude: number }, label?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<PlatformWebViewRef>(null);

  const [coords, setCoords] = useState(initial ?? FALLBACK);
  const [chosenLabel, setChosenLabel] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // O HTML é montado uma vez só: recriá-lo a cada mudança de coordenada
  // recarregaria o mapa inteiro e perderia o zoom do usuário. Movimentos
  // posteriores vão por injectJavaScript.
  const html = useMemo(
    () => buildHtml(initial?.latitude ?? FALLBACK.latitude, initial?.longitude ?? FALLBACK.longitude, colors.primary),
    [initial?.latitude, initial?.longitude]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["address-search", debounced],
    queryFn: () => apiService.searchAddresses(debounced),
    enabled: visible && debounced.length >= 3,
  });

  const moveMap = (latitude: number, longitude: number) => {
    webviewRef.current?.injectJavaScript(`window.irPara(${latitude}, ${longitude}); true;`);
  };

  const useMyLocation = async () => {
    setGpsError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Permissão de localização negada. Você ainda pode tocar no mapa.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoords(next);
      setChosenLabel(undefined);
      moveMap(next.latitude, next.longitude);
    } catch {
      setGpsError("Não consegui pegar sua localização. Tente tocar no mapa.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Pressable hitSlop={8} onPress={onCancel}>
            <X size={22} color={colors.onSurface} />
          </Pressable>
          <Text
            className="text-on-surface"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2 }}
          >
            ONDE É O ROLÊ
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View className="px-4 pt-3">
          <View
            className="flex-row items-center gap-2 px-3"
            style={{ backgroundColor: colors.inputSurface }}
          >
            <Search size={16} color={colors.inputPlaceholder} />
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setShowResults(true);
              }}
              placeholder="Buscar endereço ou lugar..."
              placeholderTextColor={colors.inputPlaceholder}
              style={{ flex: 1, color: colors.onInputSurface, paddingVertical: 12, fontSize: 15 }}
            />
            {isFetching && <ActivityIndicator size="small" color={colors.inputPlaceholder} />}
          </View>
        </View>

        {showResults && suggestions.length > 0 && (
          <View className="px-4 pt-2" style={{ maxHeight: 190 }}>
            <FlatList
              data={suggestions}
              keyExtractor={(s) => `${s.latitude}-${s.longitude}-${s.label}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCoords({ latitude: item.latitude, longitude: item.longitude });
                    setChosenLabel(item.label);
                    moveMap(item.latitude, item.longitude);
                    setShowResults(false);
                  }}
                  className="flex-row items-start gap-2 py-3 border-b border-outline-variant active:opacity-60"
                >
                  <MapPin size={14} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text className="text-on-surface flex-1" style={{ fontSize: 13 }} numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <View className="flex-1 mt-3 border-y border-border">
          <PlatformWebView
            ref={webviewRef}
            source={{ html }}
            style={{ flex: 1, backgroundColor: colors.surface }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(event) => {
              try {
                const next = JSON.parse(event.nativeEvent.data);
                if (typeof next.latitude === "number" && typeof next.longitude === "number") {
                  setCoords(next);
                  // Mover o pino invalida o rótulo da busca: o ponto agora é
                  // do usuário, não daquele endereço.
                  setChosenLabel(undefined);
                }
              } catch {
                // Mensagem que não é coordenada — ignora.
              }
            }}
          />
        </View>

        <View className="px-4 pb-2 pt-3" style={{ paddingBottom: insets.bottom + 12, gap: 10 }}>
          <Text className="text-muted text-center" style={{ fontSize: 12 }}>
            Toque no mapa ou arraste o pino para cravar o ponto.
          </Text>

          {gpsError && (
            <Text className="text-error text-center" style={{ fontSize: 12 }}>
              {gpsError}
            </Text>
          )}

          <Pressable
            onPress={useMyLocation}
            disabled={locating}
            className="flex-row items-center justify-center gap-2 border border-outline py-3 active:bg-white/5"
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.onSurface} />
            ) : (
              <>
                <Crosshair size={15} color={colors.onSurface} />
                <Text
                  className="text-on-surface"
                  style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
                >
                  USAR MINHA LOCALIZAÇÃO
                </Text>
              </>
            )}
          </Pressable>

          <PrimaryButton
            label="Confirmar local"
            icon={<Check size={15} color={colors.onPrimaryContainer} />}
            onPress={() => onDone(coords, chosenLabel)}
          />
        </View>
      </View>
    </Modal>
  );
}
