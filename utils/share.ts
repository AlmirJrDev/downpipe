// No celular é o compartilhamento do sistema. O par (share.web.ts) usa a
// Web Share API, com cópia pro clipboard onde ela não existe — desktop, na
// maioria dos casos.
import { Share as ShareNativo } from "react-native";

/**
 * O link vai no fim do texto, e não só no campo `url`: no Android o sistema
 * ignora `url`, e o link sumiria da mensagem.
 */
export const Share = {
  share({ message, url }: { message: string; url?: string }) {
    return ShareNativo.share({ message: url ? `${message}\n${url}` : message });
  },
};
