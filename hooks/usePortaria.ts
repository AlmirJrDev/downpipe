/**
 * Estado vivo da portaria de um rolê: carrega o que está guardado no
 * aparelho, sincroniza com o servidor a cada poucos segundos quando dá, e
 * decide cada entrada na hora, com ou sem internet.
 *
 * Não usa React Query de propósito: aqui a fonte da verdade durante o rolê
 * é o celular, não o servidor. O cache do React Query descartaria a lista
 * quando a tela fecha, e é justamente ela que precisa sobreviver.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { apiService } from "@/services/apiService";
import {
  aplicarLista,
  avaliarCodigo,
  avaliarQr,
  carregarEstado,
  contarPresentes,
  estadoVazio,
  guardarEstado,
  idDoAparelho,
  marcarEnviadas,
  pendentes,
  registrarEntrada,
  type EstadoDaPortaria,
  type ResultadoDaLeitura,
} from "@/services/portaria";

/** Com internet, um portão fica sabendo do outro em até este tempo. */
const INTERVALO_DE_SINCRONIA = 15_000;

export type Conexao = "sincronizado" | "sincronizando" | "sem_conexao" | "sem_permissao";

export function usePortaria(eventId: string) {
  const [estado, setEstado] = useState<EstadoDaPortaria>(() => estadoVazio(eventId));
  const [carregado, setCarregado] = useState(false);
  const [conexao, setConexao] = useState<Conexao>("sincronizando");
  const [ultimaSincronia, setUltimaSincronia] = useState<Date | null>(null);

  // A leitura do QR chega por callback da câmera, que guarda a função do
  // primeiro render. O ref garante que ela sempre veja a lista atual — sem
  // ele, o segundo QR lido seria avaliado contra o estado de antes do primeiro.
  const estadoRef = useRef(estado);
  const aparelhoRef = useRef<string | null>(null);
  const sincronizandoRef = useRef(false);
  // Sincronizar antes de ler o que está guardado sobrescreveria as entradas
  // ainda não enviadas com um estado vazio.
  const carregadoRef = useRef(false);

  const atualizar = useCallback((proximo: EstadoDaPortaria) => {
    estadoRef.current = proximo;
    setEstado(proximo);
    void guardarEstado(proximo);
  }, []);

  const sincronizar = useCallback(async () => {
    if (sincronizandoRef.current || !carregadoRef.current) return;
    sincronizandoRef.current = true;
    setConexao("sincronizando");
    try {
      aparelhoRef.current ??= await idDoAparelho();
      const aEnviar = pendentes(estadoRef.current);
      const lista =
        aEnviar.length > 0
          ? await apiService.syncCheckins(
              eventId,
              aEnviar.map((p) => ({ ...p, deviceId: aparelhoRef.current! }))
            )
          : await apiService.getCheckinList(eventId);
      // O estado pode ter mudado durante a chamada (alguém entrou enquanto
      // a resposta vinha). Parte do atual, não do que foi enviado.
      const comEnviadas = marcarEnviadas(estadoRef.current, aEnviar.map((p) => p.code));
      atualizar(aplicarLista(comEnviadas, lista));
      setConexao("sincronizado");
      setUltimaSincronia(new Date());
    } catch (err) {
      // 403 não é falta de internet: é alguém que não organiza o rolê
      // abrindo a portaria por link. Tentar de novo não vai resolver.
      const status = err instanceof ApiError ? err.status : 0;
      setConexao(status === 401 || status === 403 ? "sem_permissao" : "sem_conexao");
    } finally {
      sincronizandoRef.current = false;
    }
  }, [eventId, atualizar]);

  useEffect(() => {
    let ativo = true;
    carregarEstado(eventId).then((guardado) => {
      if (!ativo) return;
      estadoRef.current = guardado;
      carregadoRef.current = true;
      setEstado(guardado);
      setCarregado(true);
      void sincronizar();
    });
    const timer = setInterval(() => void sincronizar(), INTERVALO_DE_SINCRONIA);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [eventId, sincronizar]);

  /** Lê o QR e, se for válido, já registra a entrada. */
  const lerQr = useCallback(
    (conteudo: string): ResultadoDaLeitura => {
      const resultado = avaliarQr(estadoRef.current, conteudo);
      if (resultado.tipo === "liberado") {
        atualizar(registrarEntrada(estadoRef.current, resultado.ingresso.code));
      }
      return resultado;
    },
    [atualizar]
  );

  /** Entrada pela busca por nome — quem chegou sem bateria no celular. */
  const liberarPorCodigo = useCallback(
    (code: string): ResultadoDaLeitura => {
      const resultado = avaliarCodigo(estadoRef.current, code);
      if (resultado.tipo === "liberado") atualizar(registrarEntrada(estadoRef.current, code));
      return resultado;
    },
    [atualizar]
  );

  return {
    estado,
    carregado,
    /** Nunca baixou a lista: sem ela a portaria não tem como validar nada. */
    semLista: carregado && estado.baixadaEm === null,
    conexao,
    ultimaSincronia,
    presentes: contarPresentes(estado),
    total: Object.keys(estado.ingressos).length,
    naoEnviadas: pendentes(estado).length,
    lerQr,
    liberarPorCodigo,
    sincronizar,
  };
}
