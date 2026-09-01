// Cliente HTTP fino sobre o backend Gearhead. Toda resposta segue o envelope
// { data, error } (ou { data, pagination, error } para listas) descrito no
// README do backend — este client desembrulha isso e joga ApiError quando
// error != null, pra quem chama só lidar com o "caminho feliz" ou um catch.
import { Platform } from "react-native";

/**
 * Na web o app é servido pelo próprio backend, então a API vive na mesma
 * origem e a base fica vazia (fetch resolve relativo). No celular não existe
 * "mesma origem": ali a URL absoluta do .env é obrigatória.
 */
const API_URL =
  Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_WEB_API_URL ?? ""
    : process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * Renovação de sessão. O access token do Supabase dura 1 hora — sem isto,
 * depois desse tempo toda escrita (postar, curtir, criar carro) passa a
 * falhar com 401 enquanto a navegação continua funcionando (feed, garagem e
 * catálogo são rotas públicas), que é um sintoma bem confuso de diagnosticar.
 *
 * Fica como callback injetado pelo authStore em vez de import direto: o
 * authStore já importa este módulo, e importar de volta criaria um ciclo.
 */
type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler;
}

/** Uma renovação por vez: várias telas podem tomar 401 ao mesmo tempo. */
function runRefresh(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function send(
  path: string,
  options: RequestInit,
  isRetry = false
): Promise<{ data: unknown; pagination?: PaginationMeta }> {
  const headers: Record<string, string> = {
    // Túnel do ngrok (usado pra demo/teste externo) devolve uma página de
    // aviso em HTML pra clientes que parecem navegador. Como o client espera
    // JSON, isso apareceria como "Erro inesperado do servidor" sem pista
    // nenhuma. O header desliga o aviso; é ignorado fora do ngrok.
    "ngrok-skip-browser-warning": "1",
    ...(options.headers as Record<string, string> | undefined),
  };
  // FormData (upload de foto) define seu próprio Content-Type com boundary —
  // setar "application/json" aqui quebraria o multipart.
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      `Não foi possível conectar em ${API_URL}. Verifique se o backend está rodando e se EXPO_PUBLIC_API_URL aponta pro endereço certo.`,
      0
    );
  }

  // Token expirado: renova uma vez e repete a requisição, de forma
  // transparente. Exclui /auth/* pra não recursar no próprio refresh.
  if (res.status === 401 && !isRetry && !path.startsWith("/auth/") && refreshHandler) {
    const renewed = await runRefresh();
    if (renewed) return send(path, options, true);
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json || json.error) {
    throw new ApiError(
      json?.error?.code ?? "UNKNOWN_ERROR",
      json?.error?.message ?? "Erro inesperado do servidor.",
      res.status,
      json?.error?.details
    );
  }

  return json;
}

function jsonBody(body?: unknown) {
  return body !== undefined ? JSON.stringify(body) : undefined;
}

export const api = {
  get: async <T>(path: string): Promise<T> => (await send(path, { method: "GET" })).data as T,

  getPaginated: async <T>(path: string): Promise<PaginatedResult<T>> => {
    const json = await send(path, { method: "GET" });
    return { data: json.data as T[], pagination: json.pagination as PaginationMeta };
  },

  post: async <T>(path: string, body?: unknown): Promise<T> =>
    (await send(path, { method: "POST", body: jsonBody(body) })).data as T,

  postForm: async <T>(path: string, form: FormData): Promise<T> =>
    (await send(path, { method: "POST", body: form })).data as T,

  patch: async <T>(path: string, body?: unknown): Promise<T> =>
    (await send(path, { method: "PATCH", body: jsonBody(body) })).data as T,

  delete: async <T>(path: string): Promise<T> => (await send(path, { method: "DELETE" })).data as T,

  /**
   * PATCH autenticado por um token que não é o da sessão.
   *
   * Existe para a recuperação de senha: o token vem do link do e-mail, e
   * quem está trocando a senha justamente não tem sessão. Passa por fetch
   * direto, sem o send(), porque o send injeta o token guardado e tentaria
   * renovar a sessão num 401 — os dois errados aqui.
   */
  patchWithToken: async <T>(path: string, body: unknown, token: string): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError("NETWORK_ERROR", "Não foi possível conectar ao servidor.", 0);
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.error) {
      throw new ApiError(
        json?.error?.code ?? "UNKNOWN_ERROR",
        json?.error?.message ?? "Erro inesperado do servidor.",
        res.status
      );
    }
    return json.data as T;
  },
};

/** Monta um FormData com um arquivo de imagem local (URI do expo-image-picker). */
export function imageFormData(fieldName: string, localUri: string, extraFields?: Record<string, string>): FormData {
  const form = new FormData();
  const filename = localUri.split("/").pop() ?? `${fieldName}.jpg`;
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  // @ts-expect-error -- RN's FormData aceita {uri, name, type} nesse formato,
  // diferente do File/Blob do FormData padrão da web.
  form.append(fieldName, { uri: localUri, name: filename, type: mimeType });

  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) form.append(key, value);
  }

  return form;
}
