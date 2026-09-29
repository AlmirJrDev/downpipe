import React, { useMemo, useRef } from "react";
import { View } from "react-native";
import { PlatformWebView, type PlatformWebViewRef } from "@/components/ui/PlatformWebView";
import { colors } from "@/constants/theme";
import { estiloDoMapa } from "@/constants/mapa";
import { eventDateLabel } from "@/utils/event";
import type { CarEvent } from "@/types";

/**
 * Mapa com os rolês da busca. Mesma escolha técnica do EventMap — WebView
 * com MapLibre GL JS e basemap do CARTO, porque o MapLibre nativo não está
 * no Expo Go.
 *
 * Aqui o mapa é interativo (arrastar, zoom): ele ocupa a tela inteira da
 * aba, então não disputa rolagem com nada.
 */

const MAPLIBRE_VERSION = "4.7.1";

interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  attendeesCount: number;
  distanceKm?: number;
  attending: boolean;
  /** A arte do rolê. É ela que o pino mostra. */
  photoUrl: string | null;
  /** Dia e mês, para o pino de quem não tem arte. */
  dia: string;
  mes: string;
}

function buildHtml(
  points: MapPoint[],
  center: { latitude: number; longitude: number } | null,
  radiusKm: number | null,
  accent: string,
  going: string,
  /** Distância do topo até abaixo da barra de status e dos controles do app —
   * o WebView ocupa a tela toda, então o zoom nasceria sobre o relógio. */
  controlsTop: number
) {
  const dados = JSON.stringify(points);
  const partida = center ?? points[0] ?? { latitude: -23.5505, longitude: -46.6333 };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet">
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#121212; }
  /**
   * O pino é a arte do rolê.
   *
   * Antes ele mostrava o número de confirmados, e num app novo isso é uma
   * tela cheia de "0" — que não diz nada e ainda passa a impressão de lugar
   * vazio. O cartaz diz na hora que rolê é aquele, e é o que a pessoa
   * reconhece do story que viu.
   */
  .pin {
    width:44px; height:44px; border-radius:22px; cursor:pointer;
    background:#1a1a1a center/cover no-repeat;
    border:2px solid ${accent}; box-shadow:0 2px 10px rgba(0,0,0,.6);
    position:relative;
  }
  /* Rolê que já confirmei fica verde: dá pra ver de relance o que é meu. */
  .pin.going { border-color:${going}; }
  /* Sem arte, o pino vira a data — ainda é informação, ao contrário do zero. */
  .pin .quando {
    position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center; color:#fff;
    font:700 13px/13px -apple-system,system-ui,sans-serif; letter-spacing:.2px;
  }
  .pin .quando span { font-size:8px; font-weight:600; opacity:.75; margin-top:1px; }
  /* O contador só aparece quando existe gente — zero não é notícia. */
  .pin .conf {
    position:absolute; right:-3px; bottom:-3px; min-width:17px; height:17px;
    border-radius:9px; background:${accent}; border:1.5px solid #121212; color:#fff;
    font:700 10px/14px -apple-system,system-ui,sans-serif; text-align:center; padding:0 3px;
  }
  .pin.going .conf { background:${going}; }
  .me { width:14px; height:14px; border-radius:7px; background:#4a9eff;
        border:2px solid #fff; box-shadow:0 0 0 6px #4a9eff33; }
  .maplibregl-popup-content {
    background:#1a1a1a; color:#f0f0f0; border:1px solid #333;
    border-radius:2px; padding:9px 11px; font:13px -apple-system,system-ui,sans-serif;
  }
  .maplibregl-popup-content b { display:block; margin-bottom:3px; }
  .maplibregl-popup-content small { color:#a3a3a3; }
  .maplibregl-popup-tip { display:none; }
  .maplibregl-ctrl-attrib { font-size:9px; background:rgba(0,0,0,.5); }
  .maplibregl-ctrl-attrib a { color:#aaa; }

  /* O zoom desce para baixo da barra de status e dos controles do app. */
  .maplibregl-ctrl-top-right { top:${controlsTop}px; }
  .maplibregl-ctrl-group { background:#1a1a1a; border:1px solid #333; }
  .maplibregl-ctrl-group button + button { border-top:1px solid #333; }
  .maplibregl-ctrl-group button span { filter:invert(1); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<script>
  var pontos = ${dados};
  var map = new maplibregl.Map({
    container: 'map',
    ${estiloDoMapa()}
    center: [${partida.longitude}, ${partida.latitude}],
    zoom: 9,
    attributionControl: { compact: true }
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  ${
    center
      ? `var meEl = document.createElement('div');
         meEl.className = 'me';
         new maplibregl.Marker({ element: meEl })
           .setLngLat([${center.longitude}, ${center.latitude}])
           .addTo(map);`
      : ""
  }

  ${
    center && radiusKm
      ? `map.on('load', function () {
           // Círculo do raio desenhado como polígono: deixa claro até onde a
           // busca alcança, em vez de o usuário adivinhar.
           var pontosCirculo = [];
           for (var i = 0; i <= 64; i++) {
             var ang = (i / 64) * 2 * Math.PI;
             var dLat = (${radiusKm} / 111.32) * Math.cos(ang);
             var dLng = (${radiusKm} / (111.32 * Math.cos(${center.latitude} * Math.PI / 180))) * Math.sin(ang);
             pontosCirculo.push([${center.longitude} + dLng, ${center.latitude} + dLat]);
           }
           map.addSource('raio', {
             type: 'geojson',
             data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pontosCirculo] } }
           });
           map.addLayer({ id: 'raio-fill', type: 'fill', source: 'raio',
             paint: { 'fill-color': '${accent}', 'fill-opacity': 0.06 } });
           map.addLayer({ id: 'raio-line', type: 'line', source: 'raio',
             paint: { 'line-color': '${accent}', 'line-opacity': 0.35, 'line-width': 1, 'line-dasharray': [3, 3] } });
         });`
      : ""
  }

  var bounds = new maplibregl.LngLatBounds();
  ${center ? `bounds.extend([${center.longitude}, ${center.latitude}]);` : ""}

  pontos.forEach(function (p) {
    var el = document.createElement('div');
    el.className = 'pin' + (p.attending ? ' going' : '');
    el.title = p.name;

    if (p.photoUrl) {
      el.style.backgroundImage = 'url("' + p.photoUrl + '")';
    } else {
      var quando = document.createElement('div');
      quando.className = 'quando';
      quando.innerHTML = p.dia + '<span>' + p.mes + '</span>';
      el.appendChild(quando);
    }

    if (p.attendeesCount > 0) {
      var conf = document.createElement('div');
      conf.className = 'conf';
      conf.textContent = p.attendeesCount;
      el.appendChild(conf);
    }

    new maplibregl.Marker({ element: el })
      .setLngLat([p.longitude, p.latitude])
      .addTo(map);

    // Sem popup do MapLibre: a prévia é um card nativo do app, que mostra
    // foto e data e segue o mesmo visual do resto. Aqui só avisa a seleção.
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      map.flyTo({ center: [p.longitude, p.latitude], zoom: Math.max(map.getZoom(), 13) });
      window.ReactNativeWebView.postMessage(JSON.stringify({ eventId: p.id }));
    });

    bounds.extend([p.longitude, p.latitude]);
  });

  // Tocar no mapa fora de um pino fecha o card.
  map.on('click', function () {
    window.ReactNativeWebView.postMessage(JSON.stringify({ clear: true }));
  });

  // Enquadra tudo que existe, em vez de deixar pinos fora da tela.
  if (pontos.length > 0) {
    map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
  }
</script>
</body>
</html>`;
}

export function EventsMap({
  events,
  center,
  radiusKm,
  controlsTop,
  onSelect,
}: {
  events: CarEvent[];
  center: { latitude: number; longitude: number } | null;
  radiusKm: number | null;
  /** Recuo do topo para o zoom não nascer sob a barra de status nem sob os
   * controles flutuantes do app. */
  controlsTop: number;
  /** null = o toque foi no mapa, fora de qualquer pino: fecha o card. */
  onSelect: (eventId: string | null) => void;
}) {
  const webviewRef = useRef<PlatformWebViewRef>(null);

  const points = useMemo<MapPoint[]>(
    () =>
      events
        .filter((e) => e.latitude != null && e.longitude != null)
        .map((e) => ({
          id: e.id,
          name: e.name,
          latitude: e.latitude!,
          longitude: e.longitude!,
          attendeesCount: e.attendeesCount,
          distanceKm: e.distanceKm,
          attending: !!e.attendingByMe,
          photoUrl: e.photoUrl,
          dia: eventDateLabel(e.startsAt).day,
          mes: eventDateLabel(e.startsAt).month,
        })),
    [events]
  );

  // O HTML é remontado quando os pontos mudam — é o que redesenha os pinos
  // ao trocar o raio ou a cidade.
  const html = useMemo(
    () => buildHtml(points, center, radiusKm, colors.primary, colors.success, controlsTop),
    [points, center, radiusKm, controlsTop]
  );

  return (
    <View style={{ flex: 1 }}>
      <PlatformWebView
        ref={webviewRef}
        source={{ html }}
        style={{ flex: 1, backgroundColor: colors.surface }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.clear) onSelect(null);
            else if (msg.eventId) onSelect(msg.eventId);
          } catch {
            // Mensagem que não é seleção de evento — ignora.
          }
        }}
      />
    </View>
  );
}
