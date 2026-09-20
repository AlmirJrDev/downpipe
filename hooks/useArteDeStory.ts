import { useState } from "react";
import { Alert } from "@/utils/alert";
import {
  arteDeStoryDisponivel,
  compartilharArteDeStory,
  type ArteDeStory,
} from "@/utils/arteDeStory";

/**
 * Gera a arte 9:16 e entrega pra pessoa, cuidando do "não deu certo".
 *
 * `disponivel` é falso na versão nativa (ver arteDeStory.ts) — a tela usa
 * isso pra nem mostrar o botão, em vez de mostrar um que dá erro.
 */
export function useArteDeStory() {
  const [gerando, setGerando] = useState(false);

  const gerar = async (arte: ArteDeStory) => {
    if (gerando) return;
    setGerando(true);
    try {
      const resultado = await compartilharArteDeStory(arte);
      if (resultado === "baixado") {
        Alert.alert(
          "Arte baixada",
          "A imagem foi salva no computador. Manda ela pro celular pra postar no Stories."
        );
      }
    } catch {
      Alert.alert("Não deu pra gerar a arte", "Tente de novo daqui a pouco.");
    } finally {
      setGerando(false);
    }
  };

  return { gerar, gerando, disponivel: arteDeStoryDisponivel };
}
