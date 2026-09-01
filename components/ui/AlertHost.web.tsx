/**
 * Desenha os diálogos do app no navegador.
 *
 * Não dá pra usar window.confirm como regra: metade das chamadas de Alert no
 * app é menu de três opções ("Editar / Excluir / Cancelar"), e confirm só tem
 * OK e Cancelar.
 */
import React, { useEffect, useState } from "react";
import { ouvirAlertas, type BotaoAlerta, type PedidoAlerta } from "@/utils/alert.web";

export function AlertHost() {
  const [pedido, setPedido] = useState<PedidoAlerta | null>(null);

  useEffect(() => {
    ouvirAlertas(setPedido);
    return () => ouvirAlertas(null);
  }, []);

  const cancelar = () => {
    pedido?.buttons.find((b) => b.style === "cancel")?.onPress?.();
    setPedido(null);
  };

  // Esc fecha, como qualquer diálogo de navegador.
  useEffect(() => {
    if (!pedido) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  if (!pedido) return null;

  const escolher = (b: BotaoAlerta) => {
    setPedido(null);
    b.onPress?.();
  };

  const cor = (b: BotaoAlerta) =>
    b.style === "destructive" ? "#E53935" : b.style === "cancel" ? "#9E9E9E" : "#FFFFFF";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={pedido.title}
      onClick={cancelar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          padding: 20,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            color: "#FFF",
            fontSize: 16,
            fontWeight: 700,
            marginBottom: pedido.message ? 8 : 18,
          }}
        >
          {pedido.title}
        </div>
        {pedido.message && (
          <div style={{ color: "#B0B0B0", fontSize: 14, lineHeight: 1.45, marginBottom: 18 }}>
            {pedido.message}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {pedido.buttons.map((b, i) => (
            <button
              key={`${b.text}-${i}`}
              onClick={() => escolher(b)}
              style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                borderTop: "1px solid #2E2E2E",
                color: cor(b),
                fontSize: 14,
                fontWeight: b.style === "cancel" ? 400 : 700,
                padding: "13px 8px",
                textAlign: "center",
                cursor: "pointer",
                width: "100%",
              }}
            >
              {b.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
