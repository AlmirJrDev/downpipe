/**
 * Compartilhar no navegador.
 *
 * O react-native-web não implementa Share. No celular o navegador tem a Web
 * Share API e abre a bandeja nativa — o mesmo gesto do app. No desktop ela
 * quase nunca existe, e aí copiar pro clipboard é o comportamento honesto:
 * o texto vai pra algum lugar, em vez de o botão não fazer nada.
 *
 * O link vai no campo próprio (url) da Web Share API: aí o WhatsApp monta o
 * cartão com a prévia do conteúdo em vez de tratar como texto solto.
 */
export const Share = {
  async share({ message, url }: { message: string; url?: string }): Promise<{ action: string }> {
    if (navigator.share) {
      try {
        await navigator.share(url ? { text: message, url } : { text: message });
        return { action: "sharedAction" };
      } catch {
        // Cancelar a bandeja não é erro, e cai pro clipboard abaixo só se
        // a API nem existir — aqui a pessoa já decidiu não compartilhar.
        return { action: "dismissedAction" };
      }
    }

    try {
      await navigator.clipboard.writeText(url ? `${message}
${url}` : message);
      window.alert("Copiado para a área de transferência.");
      return { action: "sharedAction" };
    } catch {
      window.prompt("Copie o texto:", url ? `${message}
${url}` : message);
      return { action: "sharedAction" };
    }
  },
};
