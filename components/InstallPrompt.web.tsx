/**
 * Convite para instalar o Downpipe na tela inicial.
 *
 * O botão de instalar é a parte fácil. O problema real é onde o link foi
 * aberto: quase todo mundo chega pelo WhatsApp, e o navegador interno dele
 * não instala nada. Sem dizer isso, a pessoa procura a opção, não acha, e
 * conclui que o app é ruim.
 *
 * Por isso cada situação recebe uma instrução diferente, e nunca uma
 * instrução que não vai funcionar ali.
 */
import React, { useEffect, useState } from "react";

type Situacao =
  | "instalando" // Chrome/Edge: dá pra instalar com um toque
  | "ios" // iPhone no Safari: precisa do menu Compartilhar
  | "iosOutroNavegador" // iPhone fora do Safari: nem o menu resolve
  | "navegadorInterno" // WhatsApp/Instagram: não instala de jeito nenhum
  | "android" // Android sem o evento: Samsung Internet, Firefox, Chrome tímido
  | "desktop"
  | "nenhuma";

const CHAVE_DISPENSADO = "downpipe_instalar_dispensado";

function detectar(): Situacao {
  if (typeof window === "undefined") return "nenhuma";

  const ua = navigator.userAgent || "";

  // Já instalado: abrir standalone significa que veio da tela inicial.
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return "nenhuma";

  // Navegador embutido de app de mensagem. O "; wv" é o WebView do Android,
  // que é o que o WhatsApp usa.
  if (/FBAN|FBAV|Instagram|Line\/|Twitter|; wv\)/i.test(ua)) return "navegadorInterno";

  const ehIOS = /iPad|iPhone|iPod/.test(ua);
  if (ehIOS) {
    /**
     * No iPhone só o Safari de verdade adiciona à tela inicial.
     *
     * Não basta excluir CriOS/FxiOS: o WhatsApp abre links num navegador
     * interno cujo user agent parece Safari, mas onde "Adicionar à Tela de
     * Início" não existe. O que separa os dois é a presença de Version/ e
     * Safari/ — o navegador interno não manda nenhum dos dois.
     */
    const ehSafariDeVerdade =
      /Version\//.test(ua) && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return ehSafariDeVerdade ? "ios" : "iosOutroNavegador";
  }

  if (window.__promptInstalar) return "instalando";

  // Android sem o evento: Samsung Internet e Firefox nunca disparam, e o
  // próprio Chrome às vezes demora. Ficar calado aqui deixaria de fora boa
  // parte do público — então explica o caminho pelo menu.
  return /Android/i.test(ua) ? "android" : "desktop";
}

export function InstallPrompt() {
  const [situacao, setSituacao] = useState<Situacao>("nenhuma");
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let dispensado = false;
    try {
      dispensado = localStorage.getItem(CHAVE_DISPENSADO) === "1";
    } catch {
      // Navegação privada bloqueia o storage: mostra o convite, sem memória.
    }
    if (dispensado) return;

    const avaliar = () => {
      const s = detectar();
      setSituacao(s);
      setAberto(s !== "nenhuma");
    };

    avaliar();
    // O beforeinstallprompt pode chegar depois desta primeira avaliação.
    window.addEventListener("downpipe:instalavel", avaliar);
    window.addEventListener("downpipe:instalado", () => setAberto(false));
    return () => window.removeEventListener("downpipe:instalavel", avaliar);
  }, []);

  const dispensar = () => {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      // Sem storage, o convite volta na próxima visita. Tudo bem.
    }
  };

  const instalar = async () => {
    const evento = window.__promptInstalar;
    if (!evento) return;
    evento.prompt();
    await evento.userChoice;
    window.__promptInstalar = null;
    setAberto(false);
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie o endereço:", window.location.origin);
    }
  };

  if (!aberto || situacao === "nenhuma") return null;

  return (
    <div style={estilos.fundo}>
      <div style={estilos.cartao}>
        <div style={estilos.topo}>
          <img src="/icon-192.png" alt="" width={44} height={44} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={estilos.titulo}>{conteudo[situacao].titulo}</div>
            <div style={estilos.texto}>{conteudo[situacao].texto}</div>
          </div>
          <button onClick={dispensar} style={estilos.fechar} aria-label="Agora não">
            ✕
          </button>
        </div>

        {situacao === "instalando" && (
          <button onClick={instalar} style={estilos.botaoPrincipal}>
            INSTALAR
          </button>
        )}

        {(situacao === "navegadorInterno" || situacao === "iosOutroNavegador") && (
          <button onClick={copiarLink} style={estilos.botaoPrincipal}>
            {copiado ? "ENDEREÇO COPIADO" : "COPIAR ENDEREÇO"}
          </button>
        )}

        {passos[situacao] && (
          <ol style={estilos.lista}>
            {passos[situacao]!.map((p, i) => (
              <li key={i} style={estilos.passo}>
                {p}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

const conteudo: Record<Situacao, { titulo: string; texto: string }> = {
  instalando: {
    titulo: "Instale o Downpipe",
    texto: "Fica na tela inicial e abre como app, sem barra de navegador.",
  },
  ios: {
    titulo: "Coloque na tela inicial",
    texto: "Três toques e o Downpipe vira um ícone como qualquer outro app.",
  },
  iosOutroNavegador: {
    titulo: "Abra no Safari",
    texto: "No iPhone, só o Safari coloca um site na tela inicial.",
  },
  navegadorInterno: {
    titulo: "Abra fora do WhatsApp",
    texto: "Este navegador não instala apps. Leva o endereço pro Chrome ou Safari.",
  },
  android: {
    titulo: "Coloque na tela inicial",
    texto: "Pelo menu do navegador, o Downpipe vira um ícone como qualquer app.",
  },
  desktop: {
    titulo: "Instale o Downpipe",
    texto: "Dá pra instalar aqui, mas o app foi feito pro celular — vale abrir lá.",
  },
  nenhuma: { titulo: "", texto: "" },
};

const passos: Partial<Record<Situacao, string[]>> = {
  ios: [
    "Toque em Compartilhar, na barra de baixo",
    'Role e escolha "Adicionar à Tela de Início"',
    'Confirme em "Adicionar"',
  ],
  iosOutroNavegador: [
    "Toque em COPIAR ENDEREÇO aqui em cima",
    "Abra o Safari e cole na barra de endereço",
    "Toque em Compartilhar → Adicionar à Tela de Início",
  ],
  navegadorInterno: [
    "Toque em COPIAR ENDEREÇO aqui em cima",
    "Abra o Chrome (ou o Safari, no iPhone)",
    "Cole o endereço e siga o convite que aparece lá",
  ],
  android: [
    "Toque nos três pontinhos do navegador",
    'Escolha "Instalar app" ou "Adicionar à tela inicial"',
    "Confirme, e o ícone aparece junto dos seus apps",
  ],
  desktop: ["Clique no ícone de instalar, na barra de endereço do navegador"],
};

const estilos: Record<string, React.CSSProperties> = {
  fundo: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    display: "flex",
    justifyContent: "center",
    padding: 12,
    // Sobe acima da barra de abas: um convite que tapa a navegação obriga a
    // pessoa a fechá-lo antes de poder usar o app.
    paddingBottom: "calc(76px + env(safe-area-inset-bottom))",
    pointerEvents: "none",
  },
  cartao: {
    pointerEvents: "auto",
    width: "100%",
    maxWidth: 460,
    background: "#1A1A1A",
    border: "1px solid #2E2E2E",
    padding: 14,
    boxShadow: "0 8px 32px rgba(0,0,0,.55)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  topo: { display: "flex", gap: 12, alignItems: "flex-start" },
  titulo: { color: "#FFF", fontSize: 15, fontWeight: 700, marginBottom: 3 },
  texto: { color: "#B0B0B0", fontSize: 13, lineHeight: 1.4 },
  fechar: {
    appearance: "none",
    background: "transparent",
    border: "none",
    color: "#7A7A7A",
    fontSize: 15,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
    flexShrink: 0,
  },
  botaoPrincipal: {
    appearance: "none",
    width: "100%",
    marginTop: 12,
    padding: "12px 8px",
    background: "#E53935",
    border: "none",
    color: "#FFF",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.5,
    cursor: "pointer",
  },
  // O reset de CSS do Expo zera list-style; sem isto os passos perdem a
  // numeração e viram três frases soltas.
  lista: {
    margin: "12px 0 0",
    paddingLeft: 20,
    color: "#B0B0B0",
    listStyleType: "decimal",
    listStylePosition: "outside",
  },
  passo: { fontSize: 13, lineHeight: 1.55, marginBottom: 2 },
};

declare global {
  interface Window {
    __promptInstalar: { prompt: () => void; userChoice: Promise<unknown> } | null;
  }
}
