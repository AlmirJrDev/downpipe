/**
 * Convite pra ativar notificação push, uma vez só.
 *
 * Pedir a permissão do sistema sem explicar nada antes é o jeito mais
 * confiável de fazer a pessoa recusar por reflexo — e depois de recusado,
 * o navegador não deixa perguntar de novo, só nas configurações do site.
 * Este cartão existe pra explicar o motivo ANTES de disparar o pedido de
 * verdade, que é o que muda a taxa de quem aceita.
 *
 * Só aparece:
 *  - depois que a conta já tem @ definido (não durante o cadastro — a
 *    pessoa ainda nem decidiu como vai se chamar no app);
 *  - com o app instalado (display-mode: standalone). No iPhone é
 *    obrigatório de qualquer forma (Safari solto não tem Web Push); no
 *    Android isso evita competir com o InstallPrompt pela mesma faixa
 *    embaixo da tela — primeiro instala, depois oferece notificação.
 *  - uma vez: decidiu (ativou ou dispensou), não aparece de novo.
 */
import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/authStore";
import { isPlaceholderUsername } from "@/utils/profile";
import { statusPush, inscreverPush } from "@/services/webPush";

const CHAVE_DECIDIDO = "downpipe_notificacoes_decidido";

export function NotificationPrompt() {
  const status = useAuthStore((s) => s.status);
  const { data: me } = useCurrentUser();
  const [aberto, setAberto] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const prontoParaOferecer =
    status === "signedIn" && !!me && !isPlaceholderUsername(me.username);

  useEffect(() => {
    if (!prontoParaOferecer) return;

    const avaliar = () => {
      let decidido = false;
      try {
        decidido = localStorage.getItem(CHAVE_DECIDIDO) === "1";
      } catch {
        // Navegação privada bloqueia o storage: melhor não repetir o
        // convite a cada render do que arriscar mostrar toda hora.
        decidido = true;
      }
      if (decidido) return;

      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!standalone) return;

      statusPush().then((s) => {
        if (s === "nao-inscrito") setAberto(true);
      });
    };

    avaliar();
    // Instalar sem recarregar a página (o caminho comum: o convite de
    // instalar aparece, a pessoa toca, segue na mesma aba) não mudaria
    // "pronto pra oferecer" — sem ouvir este evento, quem acabou de
    // instalar só veria o convite de notificação na próxima vez que abrisse
    // o app, não logo depois de instalar, que é o momento mais natural.
    window.addEventListener("downpipe:instalado", avaliar);
    return () => window.removeEventListener("downpipe:instalado", avaliar);
  }, [prontoParaOferecer]);

  const decidir = () => {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE_DECIDIDO, "1");
    } catch {
      // Sem storage, o convite pode voltar na próxima visita. Tudo bem.
    }
  };

  const ativar = async () => {
    setAtivando(true);
    setErro(null);
    try {
      await inscreverPush();
      decidir();
    } catch (err) {
      // Recusou a permissão do sistema, ou o servidor não respondeu — os
      // dois casos fecham o cartão do mesmo jeito: insistir de novo na
      // hora é o próprio comportamento que este cartão existe pra evitar.
      // A pessoa ainda pode ativar depois em Conta, se mudar de ideia.
      setErro(err instanceof Error ? err.message : "Não deu pra ativar agora.");
      setTimeout(decidir, 2200);
    } finally {
      setAtivando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div style={estilos.fundo}>
      <div style={estilos.cartao}>
        <div style={estilos.topo}>
          <img src="/icon-192.png" alt="" width={44} height={44} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={estilos.titulo}>Ativar notificações?</div>
            <div style={estilos.texto}>
              {erro ??
                "Um aviso no aparelho quando alguém comentar, seguir ou marcar seu carro."}
            </div>
          </div>
          <button onClick={decidir} style={estilos.fechar} aria-label="Agora não">
            ✕
          </button>
        </div>

        {!erro && (
          <button onClick={ativar} disabled={ativando} style={estilos.botaoPrincipal}>
            {ativando ? "ATIVANDO..." : "ATIVAR NOTIFICAÇÕES"}
          </button>
        )}
      </div>
    </div>
  );
}

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
};
