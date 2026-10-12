/**
 * O apiService do modo demonstração: responde com os dados inventados de
 * dados.ts em vez de chamar o servidor.
 *
 * Só o catálogo de veículos (FIPE) e a busca de endereço continuam indo pro
 * servidor de verdade — são dados públicos, de ninguém, e refazer o
 * catálogo inteiro aqui seria inventar marca e modelo.
 *
 * Tudo que "grava" (publicar, curtir, confirmar presença) responde como se
 * tivesse dado certo e não guarda nada. Fechou a aba, voltou ao começo.
 */
import type { PaginatedResult } from "@/services/api";
import type { CarEvent, CheckinList, EventTicket, FollowProfile, Post, Sugestao } from "@/types";
import {
  CARROS,
  COMENTARIOS,
  ENCONTROS,
  EU,
  MODS,
  NOTIFICACOES,
  PESSOAS,
  POSTS,
  PROJETO_DO_GOLF,
  TODAS_AS_PESSOAS,
  autor,
  carroPorId,
  confirmados,
  encontroPorId,
  perfil,
  pessoaPorUsername,
  postPorId,
  type Pessoa,
} from "./dados";

/** Um respiro de rede, pra tela não piscar estado de carregando de um jeito estranho. */
const esperar = <T>(valor: T, ms = 120): Promise<T> => new Promise((ok) => setTimeout(() => ok(valor), ms));

function pagina<T>(lista: T[], page = 1, limit = 20): PaginatedResult<T> {
  const ini = (page - 1) * limit;
  return {
    data: lista.slice(ini, ini + limit),
    pagination: { page, limit, total: lista.length, hasNextPage: ini + limit < lista.length },
  };
}

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const agora = () => Date.now();
const jaFoi = (e: CarEvent) => new Date(e.startsAt).getTime() < agora();

const seguindo = (quem: Pessoa): FollowProfile => ({
  id: quem.id,
  username: quem.username,
  displayName: quem.displayName,
  avatarUrl: quem.avatarUrl,
  followedAt: new Date(agora() - 86_400_000 * 30).toISOString(),
});

/** Funções que leem dado público e podem ir ao servidor mesmo na demonstração. */
const DE_VERDADE = new Set([
  "getVehicleBrands",
  "getVehicleModelsByBrand",
  "getVehicleYearsByModel",
  "getVehicleById",
  "searchAddresses",
  "reverseGeocode",
]);

const respostas: Record<string, (...args: any[]) => unknown> = {
  // Conta
  getCurrentUser: () => perfil(EU),
  getUserByUsername: (username: string) => {
    const p = pessoaPorUsername(username);
    return p ? perfil(p) : null;
  },
  getSugestoes: (): Sugestao[] =>
    [PESSOAS.vortex, PESSOAS.marina, PESSOAS.duda].map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
      isOrganizer: !!(p as { isOrganizer?: boolean }).isOrganizer,
      carsCount: CARROS.filter((c) => c.ownerId === p.id).length,
      postsCount: POSTS.filter((x) => x.author?.username === p.username).length,
    })),
  getFollowers: (_id: string, page?: number, limit?: number) =>
    pagina(TODAS_AS_PESSOAS.filter((p) => p.id !== EU.id).map(seguindo), page, limit),
  getFollowing: (_id: string, page?: number, limit?: number) =>
    pagina(TODAS_AS_PESSOAS.filter((p) => p.id !== EU.id && p.id !== PESSOAS.duda.id).map(seguindo), page, limit),
  getBloqueados: () => [],
  contarRolesNaFila: () => 0,
  contarDenunciasAbertas: () => 0,

  // Carros e projeto
  getExploreCars: (page?: number, limit?: number, filtros?: { category?: string }) =>
    pagina(CARROS.filter((c) => !filtros?.category || c.category === filtros.category), page, limit),
  getCarById: (id: string) => carroPorId(id),
  getCarsByUsername: (username: string, page?: number, limit?: number) =>
    pagina(CARROS.filter((c) => c.owner?.username === username), page, limit),
  getMyGarage: () => CARROS.filter((c) => c.ownerId === EU.id),
  getModsByCar: (carId: string) => MODS.filter((m) => m.carId === carId),
  getProjectByCarId: (carId: string) => (carId === PROJETO_DO_GOLF.carId ? PROJETO_DO_GOLF : null),
  getMaintenances: () => [],
  search: (q: string) => {
    const t = q.toLowerCase();
    return {
      users: TODAS_AS_PESSOAS.filter((p) => `${p.username} ${p.displayName}`.toLowerCase().includes(t)).map(autor),
      cars: CARROS.filter((c) =>
        `${c.vehicle?.brand.name} ${c.vehicle?.model.name} ${c.version}`.toLowerCase().includes(t)
      ),
      brands: [],
      models: [],
    };
  },

  // Posts
  getFeed: (page?: number, limit?: number) => pagina(POSTS, page, limit),
  getActiveAds: () => [],
  getPostById: (id: string) => postPorId(id),
  getPostsByUsername: (username: string, page?: number, limit?: number) =>
    pagina(POSTS.filter((p) => p.author?.username === username), page, limit),
  getPostsByCar: (carId: string, page?: number, limit?: number) =>
    pagina(POSTS.filter((p) => p.car?.id === carId), page, limit),
  getPostsByEvent: (eventId: string, page?: number, limit?: number) =>
    pagina(POSTS.filter((p) => p.event?.id === eventId), page, limit),
  getSavedPosts: (page?: number, limit?: number) => pagina(POSTS.slice(0, 3), page, limit),
  getPostLikers: (_postId: string, page?: number, limit?: number) =>
    pagina(
      TODAS_AS_PESSOAS.filter((p) => p.id !== EU.id).map((p, i) => ({
        userId: p.id,
        likedAt: new Date(agora() - i * 3_600_000).toISOString(),
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      })),
      page,
      limit
    ),
  getComments: (postId: string, page?: number, limit?: number) =>
    pagina(COMENTARIOS.map((c) => ({ ...c, postId })), page, limit),

  // Notificações
  getNotifications: (page?: number, limit?: number, soNaoLidas?: boolean) =>
    pagina(NOTIFICACOES.filter((n) => !soNaoLidas || !n.readAt), page, limit),
  getUnreadCount: () => NOTIFICACOES.filter((n) => !n.readAt).length,

  // Encontros
  getEvents: (
    page?: number,
    limit?: number,
    filtros?: { city?: string; past?: boolean; lat?: number; lng?: number; radiusKm?: number }
  ) => {
    let lista = ENCONTROS.filter((e) => (filtros?.past ? jaFoi(e) : !jaFoi(e)));
    if (filtros?.city) {
      const c = filtros.city.toLowerCase();
      lista = lista.filter((e) => e.city.toLowerCase().includes(c));
    }
    if (filtros?.lat != null && filtros?.lng != null) {
      const centro = { lat: filtros.lat, lng: filtros.lng };
      lista = lista
        .map((e) => ({ ...e, distanceKm: Math.round(distanciaKm(centro, { lat: e.latitude!, lng: e.longitude! })) }))
        .filter((e) => !filtros.radiusKm || e.distanceKm <= filtros.radiusKm);
    }
    lista.sort((a, b) => (filtros?.past ? -1 : 1) * a.startsAt.localeCompare(b.startsAt));
    return pagina(lista, page, limit);
  },
  getEventById: (id: string) => encontroPorId(id),
  getEventsByOrganizer: (username: string, page?: number, limit?: number) =>
    pagina(ENCONTROS.filter((e) => e.organizer?.username === username && !jaFoi(e)), page, limit),
  getEventAttendees: (id: string, page?: number, limit?: number) => {
    const e = encontroPorId(id);
    return pagina(e ? confirmados(e) : [], page, limit);
  },
  getEventChat: (eventId: string) => {
    const e = encontroPorId(eventId);
    const org = e?.organizer ? pessoaPorUsername(e.organizer.username) : null;
    const msg = (id: string, quem: Pessoa | null, text: string, horas: number) => ({
      id,
      kind: quem ? ("mensagem" as const) : ("sistema" as const),
      text,
      createdAt: new Date(agora() - horas * 3_600_000).toISOString(),
      author: quem ? { id: quem.id, username: quem.username, displayName: quem.displayName, avatarUrl: quem.avatarUrl } : null,
    });
    return {
      organizerId: e?.organizerId ?? "",
      isOrganizer: e?.organizerId === EU.id,
      hasOlder: false,
      agora: new Date().toISOString(),
      removedIds: [],
      messages: [
        msg("ch1", org ?? PESSOAS.vortex, "Galera, portão abre às 19h30. Tragam o alimento que a gente separa na entrada!", 26),
        msg("ch2", PESSOAS.lu, "Vou com o Civic, alguém sai de Campinas centro?", 20),
        msg("ch3", PESSOAS.kenji, "Saio do Cambuí 19h, bora em comboio", 19),
        msg("ch4", null, "O horário mudou para 20h.", 6),
        msg("ch5", EU, "Fechado, encontro vocês no posto antes", 2),
      ],
    };
  },
  getEventChatUnread: () => 0,
  getMyTicket: (eventId: string): EventTicket | null => {
    const e = encontroPorId(eventId);
    if (!e?.attendingByMe) return null;
    return {
      eventId,
      code: "K7QM4XPZ2R",
      holderName: EU.displayName,
      holderUsername: EU.username,
      carLabel: "Volkswagen Golf GTI 2015",
      checkedInAt: null,
    };
  },
  getCheckinList: (eventId: string): CheckinList => {
    const e = encontroPorId(eventId)!;
    const codigos = ["H3TJ8WQNKA", "P9XC2MRVBE", "Z4LD7SFUGY", "T6NB3KHWCQ", "M2VF9EJRXU", "R8QA5YZPLD"];
    return {
      eventId,
      generatedAt: new Date().toISOString(),
      entries: confirmados(e).map((a, i) => ({
        code: codigos[i % codigos.length],
        userId: a.userId,
        username: a.username,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
        carLabel: a.car?.vehicle ? `${a.car.vehicle.brand} ${a.car.vehicle.model} ${a.car.vehicle.year}` : null,
        checkedInAt: i < 3 ? new Date(agora() - (i + 1) * 600_000).toISOString() : null,
      })),
    };
  },

  // O que "grava": responde que deu certo, sem guardar.
  likePost: (postId: string) => ({ likesCount: (postPorId(postId)?.likesCount ?? 0) + 1, likedByMe: true }),
  unlikePost: (postId: string) => ({ likesCount: postPorId(postId)?.likesCount ?? 0, likedByMe: false }),
  savePost: () => ({ savedByMe: true }),
  unsavePost: () => ({ savedByMe: false }),
  followUser: () => ({ isFollowing: true, followersCount: 1 }),
  unfollowUser: () => ({ isFollowing: false, followersCount: 0 }),
  attendEvent: (id: string) => ({ attendingByMe: true, attendeesCount: (encontroPorId(id)?.attendeesCount ?? 0) + 1 }),
  unattendEvent: (id: string) => ({ attendingByMe: false, attendeesCount: encontroPorId(id)?.attendeesCount ?? 0 }),
  addComment: (postId: string, text: string) => ({
    id: `cm-${agora()}`,
    postId,
    author: autor(EU),
    text,
    createdAt: new Date().toISOString(),
  }),
  createPost: (): Post => POSTS[0],
  // A portaria manda as entradas lidas e recebe a lista de volta, com elas.
  syncCheckins: (eventId: string, entradas: { code: string; at: string }[]): CheckinList => {
    const lista = respostas.getCheckinList(eventId) as CheckinList;
    for (const e of entradas) {
      const achada = lista.entries.find((x) => x.code === e.code);
      if (achada && !achada.checkedInAt) achada.checkedInAt = e.at;
    }
    return lista;
  },
  getVapidPublicKey: () => null,
  markNotificationRead: () => undefined,
  markAllNotificationsRead: () => undefined,
};

export function criarApiDemo<T extends Record<string, unknown>>(real: T): T {
  const demo: Record<string, unknown> = {};
  for (const nome of Object.keys(real)) {
    if (DE_VERDADE.has(nome)) {
      demo[nome] = real[nome];
    } else if (respostas[nome]) {
      demo[nome] = (...args: unknown[]) => esperar(respostas[nome](...args));
    } else {
      // Sem resposta inventada: leitura volta vazia, escrita finge que deu
      // certo. Nada chega ao servidor em nenhum dos casos.
      demo[nome] = () => esperar(nome.startsWith("get") ? [] : undefined);
    }
  }
  return demo as T;
}
