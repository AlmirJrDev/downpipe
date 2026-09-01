/**
 * Compartilhar no navegador.
 *
 * O react-native-web não implementa Share. No celular o navegador tem a Web
 * Share API e abre a bandeja nativa — o mesmo gesto do app. No desktop ela
 * quase nunca existe, e aí copiar pro clipboard é o comportamento honesto:
 * o texto vai pra algum lugar, em vez de o botão não fazer nada.
 *
 * Mesma assinatura do Share do react-native, então as telas só trocam o
 * import.
 */
export const Share = {
  async share({ message }: { message: string }): Promise<{ action: string }> {
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return { action: "sharedAction" };
      } catch {
        // Cancelar a bandeja não é erro, e cai pro clipboard abaixo só se
        // a API nem existir — aqui a pessoa já decidiu não compartilhar.
        return { action: "dismissedAction" };
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      window.alert("Copiado para a área de transferência.");
      return { action: "sharedAction" };
    } catch {
      window.prompt("Copie o texto:", message);
      return { action: "sharedAction" };
    }
  },
};
