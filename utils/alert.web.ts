/**
 * Alert do app no navegador.
 *
 * O react-native-web tem um Alert, mas ele é `static alert() {}` — no-op
 * silencioso. Sair da conta e excluir simplesmente não fariam nada, sem erro
 * nenhum no console. Daí este par: no celular vale o Alert do sistema, aqui
 * vale este.
 *
 * Só a fila mora aqui (sem JSX, pra casar com utils/alert.ts e a resolução
 * por plataforma do Metro não ter margem de dúvida). Quem desenha é o
 * AlertHost, montado no _layout.
 */
export interface BotaoAlerta {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface PedidoAlerta {
  title: string;
  message?: string;
  buttons: BotaoAlerta[];
}

let emitir: ((p: PedidoAlerta | null) => void) | null = null;

/** O AlertHost se registra aqui ao montar. */
export function ouvirAlertas(fn: ((p: PedidoAlerta | null) => void) | null) {
  emitir = fn;
}

export const Alert = {
  alert(title: string, message?: string, buttons?: BotaoAlerta[]) {
    const lista = buttons?.length ? buttons : [{ text: "OK" }];

    // Sem host montado, o diálogo do navegador é feio mas honesto — melhor
    // que engolir a pergunta como o react-native-web faz.
    if (!emitir) {
      const ok = window.confirm([title, message].filter(Boolean).join("\n\n"));
      const escolhido = ok
        ? lista.find((b) => b.style !== "cancel")
        : lista.find((b) => b.style === "cancel");
      escolhido?.onPress?.();
      return;
    }

    emitir({ title, message, buttons: lista });
  },
};
