import { Linking, Platform } from "react-native";
// Do shim, não do react-native: no navegador o Alert de lá é `static
// alert() {}`, um no-op silencioso. Era por isso que "COMO CHEGAR" não
// fazia nada no PWA — o menu de escolha do app de mapa nunca aparecia, e
// nenhum erro era registrado.
import { Alert } from "@/utils/alert";

/**
 * Abre a rota até um local no app de mapa que o usuário escolher.
 *
 * Não usamos `canOpenURL` para detectar o que está instalado: no iOS ela só
 * responde para esquemas declarados no Info.plist, e no Android depende de
 * `<queries>` no manifesto — nenhum dos dois vale dentro do Expo Go, onde o
 * app roda no container do próprio Expo. A detecção daria "não instalado"
 * para tudo.
 *
 * Em vez disso oferecemos as opções e tentamos o esquema nativo; se não
 * houver app que o atenda, cai na versão web, que por sua vez oferece abrir
 * no aplicativo. O resultado é o mesmo e funciona em qualquer ambiente.
 */

interface Destino {
  latitude: number | null;
  longitude: number | null;
  /** Endereço legível — usado quando não há coordenada confiável. */
  label: string;
  /**
   * Se a coordenada pode ser usada para traçar rota. Coordenada aproximada
   * (centro da cidade) levaria a pessoa ao lugar errado, então nesse caso é
   * melhor mandar o texto e deixar o app de mapa resolver.
   */
  preciso: boolean;
}

type App = "google" | "waze" | "apple";

function urls(destino: Destino, app: App): { nativo: string; web: string } {
  const { latitude, longitude, label, preciso } = destino;
  const usaCoord = preciso && latitude != null && longitude != null;
  const coord = `${latitude},${longitude}`;
  const texto = encodeURIComponent(label);

  switch (app) {
    case "waze":
      return {
        nativo: usaCoord ? `waze://?ll=${coord}&navigate=yes` : `waze://?q=${texto}&navigate=yes`,
        web: usaCoord
          ? `https://waze.com/ul?ll=${coord}&navigate=yes`
          : `https://waze.com/ul?q=${texto}&navigate=yes`,
      };

    case "apple":
      // dirflg=d pede rota de carro em vez de só marcar o ponto.
      return {
        nativo: usaCoord
          ? `maps://?daddr=${coord}&dirflg=d`
          : `maps://?daddr=${texto}&dirflg=d`,
        web: usaCoord
          ? `http://maps.apple.com/?daddr=${coord}&dirflg=d`
          : `http://maps.apple.com/?daddr=${texto}&dirflg=d`,
      };

    case "google":
    default:
      return {
        nativo: usaCoord
          ? // No Android este esquema entra direto em modo navegação.
            Platform.OS === "android"
            ? `google.navigation:q=${coord}`
            : `comgooglemaps://?daddr=${coord}&directionsmode=driving`
          : Platform.OS === "android"
          ? `google.navigation:q=${texto}`
          : `comgooglemaps://?daddr=${texto}&directionsmode=driving`,
        web: usaCoord
          ? `https://www.google.com/maps/dir/?api=1&destination=${coord}`
          : `https://www.google.com/maps/dir/?api=1&destination=${texto}`,
      };
  }
}

async function abrir(destino: Destino, app: App) {
  const { nativo, web } = urls(destino, app);

  // No navegador não se tenta o esquema nativo. Um waze:// dentro de uma
  // aba abre janela em branco quando não é interceptado, e no PWA em tela
  // cheia isso é um beco sem saída. A URL web funciona nos dois casos e ela
  // mesma oferece continuar no aplicativo.
  if (Platform.OS === "web") {
    Linking.openURL(web).catch(() => {});
    return;
  }

  try {
    await Linking.openURL(nativo);
  } catch {
    // App não instalado (ou esquema não atendido): a versão web abre no
    // navegador e ela mesma oferece continuar no aplicativo.
    Linking.openURL(web).catch(() => {});
  }
}

export function openDirections(destino: Destino) {
  const opcoes: { text: string; onPress?: () => void; style?: "cancel" }[] = [
    { text: "Google Maps", onPress: () => abrir(destino, "google") },
    { text: "Waze", onPress: () => abrir(destino, "waze") },
  ];

  // Apple Maps só existe em aparelho da Apple. No PWA o Platform.OS é
  // "web" mesmo num iPhone, então lá a checagem é pelo user agent — senão
  // quem usa o app instalado no iPhone perde justamente o mapa padrão dele.
  const ehApple =
    Platform.OS === "ios" ||
    (Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent));

  if (ehApple) {
    opcoes.push({ text: "Apple Maps", onPress: () => abrir(destino, "apple") });
  }

  opcoes.push({ text: "Cancelar", style: "cancel" });

  Alert.alert("Como chegar", destino.label, opcoes);
}
