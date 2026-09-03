// Implementação real sobre o backend Gearhead (Express + Supabase),
// substituindo services/mockService.ts. Mantém as assinaturas de
// mockService onde o contrato do backend permite; documenta com comentário
// onde ele obriga a mudar (ex.: createCar não aceita mais brand/model/year
// livres, só vehicleVersionId + version).
import { api, ApiError, imageFormData, type PaginatedResult } from "./api";
import { anexarImagem } from "./anexarImagem";
import type {
  AppNotification,
  Car,
  Comment,
  Modification,
  ModificationCategory,
  Category,
  Post,
  PostMedia,
  PostLiker,
  FollowProfile,
  CarEvent,
  EventAttendee,
  EventVisibility,
  Project,
  ProjectStep,
  ProjectStatus,
  User,
  VehicleBrand,
  VehicleModel,
  VehicleVersion,
  VehicleDetail,
} from "@/types";

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

/**
 * 404 vira `null`, não `undefined`: o React Query v5 recusa `undefined` como
 * dado de query e joga "Query data cannot be undefined", que aparece como
 * erro genérico na tela em vez do estado "não encontrado" que a gente quer.
 * Casos legítimos e comuns passam por aqui — carro sem projeto, por exemplo.
 */
async function nullOn404<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Perfis
// ---------------------------------------------------------------------------

interface RawProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  gearheadSince: number | null;
  followersCount?: number;
  followingCount?: number;
  carsCount?: number;
  projectsCount?: number;
  isFollowing?: boolean | null;
  isOrganizer?: boolean;
  eventsAttendedCount?: number;
}

function toUser(raw: RawProfile): User {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.displayName,
    avatarUrl: raw.avatarUrl,
    bio: raw.bio,
    gearheadSince: raw.gearheadSince,
    carsCount: raw.carsCount ?? 0,
    projectsCount: raw.projectsCount ?? 0,
    followersCount: raw.followersCount ?? 0,
    followingCount: raw.followingCount ?? 0,
    isFollowing: raw.isFollowing,
    isOrganizer: raw.isOrganizer ?? false,
    eventsAttendedCount: raw.eventsAttendedCount ?? 0,
  };
}

async function getCurrentUser(): Promise<User> {
  const raw = await api.get<RawProfile>("/profile/me");
  return toUser(raw);
}

async function getUserByUsername(username: string): Promise<User | null> {
  const raw = await nullOn404(() => api.get<RawProfile>(`/profiles/${username}`));
  return raw ? toUser(raw) : null;
}

async function updateMyProfile(patch: {
  username?: string;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  gearheadSince?: number | null;
  isOrganizer?: boolean;
}): Promise<User> {
  const raw = await api.patch<RawProfile>("/profile/me", patch);
  return toUser(raw);
}

async function uploadAvatar(localUri: string): Promise<User> {
  const raw = await api.postForm<RawProfile>("/profile/me/avatar", await imageFormData("file", localUri));
  return toUser(raw);
}

// ---------------------------------------------------------------------------
// Catálogo de veículos (FIPE)
// ---------------------------------------------------------------------------

async function getVehicleBrands(): Promise<VehicleBrand[]> {
  return api.get<VehicleBrand[]>("/vehicles/brands");
}

async function getVehicleModelsByBrand(brandId: string): Promise<VehicleModel[]> {
  return api.get<VehicleModel[]>(`/vehicles/brands/${brandId}/models`);
}

async function getVehicleYearsByModel(modelId: string): Promise<VehicleVersion[]> {
  return api.get<VehicleVersion[]>(`/vehicles/models/${modelId}/years`);
}

async function getVehicleById(id: string): Promise<VehicleDetail | null> {
  return nullOn404(() => api.get<VehicleDetail>(`/vehicles/${id}`));
}

// ---------------------------------------------------------------------------
// Carros / garagem
// ---------------------------------------------------------------------------

export interface CreateCarInput {
  vehicleVersionId?: string | null;
  version?: string | null;
  engine?: string | null;
  power?: number | null;
  torque?: number | null;
  transmission?: string | null;
  drivetrain?: string | null;
  mileage?: number | null;
  description?: string | null;
  status?: ProjectStatus;
  category?: Category | null;
}

async function getExploreCars(
  page = 1,
  limit = 20,
  filters?: { category?: Category; status?: ProjectStatus }
): Promise<PaginatedResult<Car>> {
  return api.getPaginated<Car>(`/cars${qs({ page, limit, category: filters?.category, status: filters?.status })}`);
}

async function getCarById(id: string): Promise<Car | null> {
  return nullOn404(() => api.get<Car>(`/cars/${id}`));
}

export interface SearchResults {
  users: { username: string; displayName: string; avatarUrl: string | null }[];
  cars: Car[];
  brands: { id: string; name: string }[];
  models: { id: string; name: string; brandId: string }[];
}

/** Busca combinada do backend: acha carro por marca/modelo do catálogo,
 * pelo nome que o dono deu, e também acha pessoas. */
async function search(query: string): Promise<SearchResults> {
  return api.get<SearchResults>(`/search${qs({ q: query })}`);
}

async function getCarsByUsername(username: string, page = 1, limit = 20): Promise<PaginatedResult<Car>> {
  return api.getPaginated<Car>(`/profiles/${username}/cars${qs({ page, limit })}`);
}

async function getMyGarage(): Promise<Car[]> {
  // Não existe "meus carros" direto — resolve o próprio username via
  // /profile/me e usa a rota pública de carros por username. Limite alto
  // (máximo aceito pelo backend) porque essa função não é paginada.
  const me = await getCurrentUser();
  const page = await getCarsByUsername(me.username, 1, 50);
  return page.data;
}

async function createCar(input: CreateCarInput): Promise<Car> {
  return api.post<Car>("/cars", input);
}

async function updateCar(id: string, patch: Partial<CreateCarInput>): Promise<Car> {
  return api.patch<Car>(`/cars/${id}`, patch);
}

async function deleteCar(id: string): Promise<void> {
  await api.delete(`/cars/${id}`);
}

async function uploadCarPhoto(carId: string, localUri: string): Promise<Car> {
  return api.postForm<Car>(`/cars/${carId}/photo`, await imageFormData("file", localUri));
}

// ---------------------------------------------------------------------------
// Modificações
// ---------------------------------------------------------------------------

export interface CreateModificationInput {
  name: string;
  category?: ModificationCategory | null;
  cost?: number | null;
  date?: string | null; // YYYY-MM-DD
  icon?: string | null;
  description?: string | null;
}

async function getModsByCar(carId: string): Promise<Modification[]> {
  return api.get<Modification[]>(`/cars/${carId}/modifications`);
}

async function createModification(carId: string, input: CreateModificationInput): Promise<Modification> {
  return api.post<Modification>(`/cars/${carId}/modifications`, input);
}

async function updateModification(id: string, patch: Partial<CreateModificationInput>): Promise<Modification> {
  return api.patch<Modification>(`/modifications/${id}`, patch);
}

async function deleteModification(id: string): Promise<void> {
  await api.delete(`/modifications/${id}`);
}

// ---------------------------------------------------------------------------
// Projetos / etapas
// ---------------------------------------------------------------------------

interface RawProject {
  id: string;
  carId: string;
  title: string;
  powerGoalFrom: number | null;
  powerGoalTo: number | null;
  budgetTotal: number | null;
  budgetSpent: number;
  modificationsTotal: number;
  modificationsDone: number;
}

async function getProjectByCarId(carId: string): Promise<Project | null> {
  const project = await nullOn404(() => api.get<RawProject>(`/cars/${carId}/project`));
  if (!project) return null;

  const steps = await api.get<ProjectStep[]>(`/projects/${project.id}/steps`);
  return { ...project, steps };
}

export interface CreateProjectInput {
  title: string;
  powerGoalFrom?: number | null;
  powerGoalTo?: number | null;
  budgetTotal?: number | null;
}

/** budgetSpent/modificationsTotal/modificationsDone são derivados — o
 * backend recusa recebê-los, então não fazem parte do input. */
async function createProject(carId: string, input: CreateProjectInput): Promise<RawProject> {
  return api.post<RawProject>(`/cars/${carId}/project`, input);
}

async function updateProject(id: string, patch: Partial<CreateProjectInput>): Promise<RawProject> {
  return api.patch<RawProject>(`/projects/${id}`, patch);
}

async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

export interface CreateStepInput {
  name: string;
  status?: "pending" | "active" | "done";
  estimatedCost?: number | null;
  actualCost?: number | null;
  date?: string | null;
  description?: string | null;
}

async function addProjectStep(projectId: string, input: CreateStepInput): Promise<ProjectStep> {
  return api.post<ProjectStep>(`/projects/${projectId}/steps`, input);
}

async function updateProjectStep(
  projectId: string,
  stepId: string,
  patch: Partial<CreateStepInput>
): Promise<ProjectStep> {
  return api.patch<ProjectStep>(`/projects/${projectId}/steps/${stepId}`, patch);
}

async function removeProjectStep(projectId: string, stepId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/steps/${stepId}`);
}

// ---------------------------------------------------------------------------
// Posts / feed / anúncios
// ---------------------------------------------------------------------------

interface RawPost {
  id: string;
  type: Post["type"];
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  cost: number | null;
  progressPercent: number | null;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null } | null;
  car: {
    id: string;
    ownerId: string;
    version: string | null;
    photoUrl: string | null;
    vehicle: { name: string; year: number; model: string; brand: string } | null;
  } | null;
  media: PostMedia[];
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean | null;
  savedByMe: boolean | null;
  carTagStatus: "approved" | "pending" | null;
  event: { id: string; name: string; startsAt: string; city: string } | null;
}

/** Achata media[] nos campos discretos que o app usa pra desenhar o post. */
function toPost(raw: RawPost): Post {
  const sorted = [...raw.media].sort((a, b) => a.position - b.position);
  const isEvolution = raw.type === "evolution";

  return {
    id: raw.id,
    author: raw.author,
    car: raw.car,
    type: raw.type,
    media: raw.media,
    imageUrl: isEvolution ? undefined : sorted[0]?.mediaUrl,
    beforeImageUrl: isEvolution ? sorted[0]?.mediaUrl : undefined,
    afterImageUrl: isEvolution ? sorted[1]?.mediaUrl : undefined,
    caption: raw.caption ?? "",
    title: raw.title ?? undefined,
    subtitle: raw.subtitle ?? undefined,
    cost: raw.cost ?? undefined,
    progressPercent: raw.progressPercent ?? undefined,
    likesCount: raw.likesCount,
    commentsCount: raw.commentsCount,
    likedByMe: raw.likedByMe,
    savedByMe: raw.savedByMe,
    carTagStatus: raw.carTagStatus,
    event: raw.event,
    createdAt: raw.createdAt,
  };
}

interface RawAd {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

function adToPost(raw: RawAd): Post {
  return {
    id: `ad-${raw.id}`,
    author: null,
    car: null,
    type: "ad",
    title: raw.title ?? undefined,
    caption: raw.caption ?? "",
    imageUrl: raw.imageUrl ?? undefined,
    ctaLabel: raw.ctaLabel ?? undefined,
    ctaUrl: raw.ctaUrl ?? undefined,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function interleaveAds(posts: Post[], ads: Post[], everyN = 4): Post[] {
  if (ads.length === 0) return posts;
  const result: Post[] = [];
  let adIndex = 0;
  posts.forEach((post, i) => {
    result.push(post);
    if ((i + 1) % everyN === 0 && adIndex < ads.length) {
      result.push(ads[adIndex]);
      adIndex++;
    }
  });
  return result;
}

async function getActiveAds(limit = 6): Promise<Post[]> {
  const ads = await api.get<RawAd[]>(`/advertisements/active${qs({ limit })}`);
  return ads.map(adToPost);
}

async function getFeed(page = 1, limit = 20): Promise<PaginatedResult<Post>> {
  const [postsPage, ads] = await Promise.all([
    api.getPaginated<RawPost>(`/feed${qs({ page, limit })}`),
    getActiveAds(6).catch(() => [] as Post[]),
  ]);

  return {
    data: interleaveAds(postsPage.data.map(toPost), ads, 4),
    pagination: postsPage.pagination,
  };
}

async function getPostsByUsername(username: string, page = 1, limit = 20): Promise<PaginatedResult<Post>> {
  const raw = await api.getPaginated<RawPost>(`/profiles/${username}/posts${qs({ page, limit })}`);
  return { data: raw.data.map(toPost), pagination: raw.pagination };
}

async function getPostsByCar(carId: string, page = 1, limit = 20): Promise<PaginatedResult<Post>> {
  const raw = await api.getPaginated<RawPost>(`/cars/${carId}/posts${qs({ page, limit })}`);
  return { data: raw.data.map(toPost), pagination: raw.pagination };
}

async function getPostById(id: string): Promise<Post | null> {
  const raw = await nullOn404(() => api.get<RawPost>(`/posts/${id}`));
  return raw ? toPost(raw) : null;
}

export interface CreatePostInput {
  carId?: string | null;
  /** Rolê onde a foto foi tirada — é o que junta as memórias do encontro. */
  eventId?: string | null;
  type?: Post["type"];
  title?: string | null;
  subtitle?: string | null;
  caption?: string | null;
  cost?: number | null;
  progressPercent?: number | null;
  /** URIs locais (expo-image-picker) — vão no campo multipart "files". */
  localImageUris: string[];
}

async function createPost(input: CreatePostInput): Promise<Post> {
  const form = new FormData();
  const fields: Record<string, string | undefined> = {
    carId: input.carId ?? undefined,
    eventId: input.eventId ?? undefined,
    type: input.type,
    title: input.title ?? undefined,
    subtitle: input.subtitle ?? undefined,
    caption: input.caption ?? undefined,
    cost: input.cost !== undefined && input.cost !== null ? String(input.cost) : undefined,
    progressPercent:
      input.progressPercent !== undefined && input.progressPercent !== null
        ? String(input.progressPercent)
        : undefined,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  for (const uri of input.localImageUris) {
    await anexarImagem(form, "files", uri);
  }

  const raw = await api.postForm<RawPost>("/posts", form);
  return toPost(raw);
}

async function updatePost(
  id: string,
  patch: { title?: string | null; subtitle?: string | null; caption?: string | null; cost?: number | null; progressPercent?: number | null }
): Promise<Post> {
  const raw = await api.patch<RawPost>(`/posts/${id}`, patch);
  return toPost(raw);
}

async function deletePost(id: string): Promise<void> {
  await api.delete(`/posts/${id}`);
}

// ---------------------------------------------------------------------------
// Curtidas
// ---------------------------------------------------------------------------

async function likePost(postId: string): Promise<{ likesCount: number; likedByMe: boolean }> {
  return api.post(`/posts/${postId}/like`);
}

// ---------------------------------------------------------------------------
// Salvos
// ---------------------------------------------------------------------------

/** Salvar é privado — o autor do post não fica sabendo, e a lista só existe
 * pro próprio usuário (por isso /profile/me/saved, e não /profiles/:username). */
async function savePost(postId: string): Promise<{ savedByMe: boolean }> {
  return api.post(`/posts/${postId}/save`);
}

async function unsavePost(postId: string): Promise<{ savedByMe: boolean }> {
  return api.delete(`/posts/${postId}/save`);
}

async function getSavedPosts(page = 1, limit = 20): Promise<PaginatedResult<Post>> {
  const result = await api.getPaginated<RawPost>(`/profile/me/saved${qs({ page, limit })}`);
  return { ...result, data: result.data.map(toPost) };
}

/** Rota pública: dá pra ver quem curtiu mesmo sem estar logado. */
async function getPostLikers(
  postId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<PostLiker>> {
  return api.getPaginated<PostLiker>(`/posts/${postId}/likes${qs({ page, limit })}`);
}

async function unlikePost(postId: string): Promise<{ likesCount: number; likedByMe: boolean }> {
  return api.delete(`/posts/${postId}/like`);
}

// ---------------------------------------------------------------------------
// Comentários
// ---------------------------------------------------------------------------

interface RawComment {
  id: string;
  postId: string;
  text: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null } | null;
}

async function getComments(postId: string, page = 1, limit = 20): Promise<PaginatedResult<Comment>> {
  return api.getPaginated<RawComment>(`/posts/${postId}/comments${qs({ page, limit })}`);
}

async function addComment(postId: string, text: string): Promise<Comment> {
  return api.post<RawComment>(`/posts/${postId}/comments`, { text });
}

/** Só o autor do comentário edita/exclui — nem o dono do post pode (403). */
async function updateComment(id: string, text: string): Promise<Comment> {
  return api.patch<RawComment>(`/comments/${id}`, { text });
}

async function deleteComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}`);
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

async function getNotifications(
  page = 1,
  limit = 20,
  unreadOnly = false
): Promise<PaginatedResult<AppNotification>> {
  return api.getPaginated<AppNotification>(
    `/notifications${qs({ page, limit, unreadOnly: unreadOnly ? "true" : undefined })}`
  );
}

async function getUnreadCount(): Promise<number> {
  const { unreadCount } = await api.get<{ unreadCount: number }>("/notifications/unread-count");
  return unreadCount;
}

async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}

// ---------------------------------------------------------------------------
// Eventos (encontros/rolês)
// ---------------------------------------------------------------------------

export interface CreateEventInput {
  name: string;
  description?: string | null;
  /** ISO 8601 com offset — o backend recusa data sem hora. */
  startsAt: string;
  location: string;
  city: string;
  /** Rua e número resolvidos pelo pino no mapa — ver CarEvent.address. */
  address?: string | null;
  visibility?: EventVisibility;
  /** Ponto escolhido pelo organizador. Quando vai preenchido, o backend usa
   * ele e nem tenta geocodificar o texto do endereço. */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressSuggestion {
  label: string;
  latitude: number;
  longitude: number;
}

/** Sugestões de endereço reais, pra escolha sair de uma lista que já tem
 * coordenada — em vez de o servidor adivinhar depois um texto livre. */
async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  return api.get<AddressSuggestion[]>(`/geocoding/search${qs({ q: query.trim() })}`);
}

/**
 * O caminho inverso: o pino cravado no mapa vira endereço e cidade.
 *
 * Devolve null quando o ponto cai onde o mapa não sabe nomear — o que é
 * resposta, não erro: a pessoa preenche na mão.
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ location: string; city: string } | null> {
  return api.get<{ location: string; city: string } | null>(
    `/geocoding/reverse${qs({ lat: latitude, lng: longitude })}`
  );
}

/** Calendário público: só eventos "public", e por padrão só os que ainda vão
 * acontecer. Evento "link" nunca aparece aqui, por definição. */
async function getEvents(
  page = 1,
  limit = 20,
  filters?: {
    city?: string;
    past?: boolean;
    /** Centro e raio da busca. Com eles, cada evento volta com distanceKm. */
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }
): Promise<PaginatedResult<CarEvent>> {
  return api.getPaginated<CarEvent>(
    `/events${qs({
      page,
      limit,
      city: filters?.city,
      past: filters?.past ? "true" : undefined,
      lat: filters?.lat,
      lng: filters?.lng,
      radiusKm: filters?.radiusKm,
    })}`
  );
}

/** Buscar por id vale pro público e pro "por link" — ter o id É o convite. */
async function getEventById(id: string): Promise<CarEvent | null> {
  return nullOn404(() => api.get<CarEvent>(`/events/${id}`));
}

async function getEventsByOrganizer(
  username: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<CarEvent>> {
  return api.getPaginated<CarEvent>(`/profiles/${username}/events${qs({ page, limit })}`);
}

async function createEvent(input: CreateEventInput): Promise<CarEvent> {
  return api.post<CarEvent>("/events", input);
}

async function updateEvent(id: string, patch: Partial<CreateEventInput>): Promise<CarEvent> {
  return api.patch<CarEvent>(`/events/${id}`, patch);
}

async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`);
}

async function uploadEventPhoto(id: string, localUri: string): Promise<CarEvent> {
  return api.postForm<CarEvent>(`/events/${id}/photo`, await imageFormData("file", localUri));
}

async function attendEvent(
  id: string,
  carId?: string | null
): Promise<{ attendingByMe: boolean; attendeesCount: number }> {
  return api.post(`/events/${id}/attend`, { carId: carId ?? null });
}

/** Trocar (ou tirar) o carro que vai levar, já tendo confirmado presença. */
async function updateAttendanceCar(id: string, carId: string | null): Promise<{ carId: string | null }> {
  return api.patch(`/events/${id}/attend/car`, { carId });
}

async function unattendEvent(id: string): Promise<{ attendingByMe: boolean; attendeesCount: number }> {
  return api.delete(`/events/${id}/attend`);
}

// ---------------------------------------------------------------- Moderação

/** Motivos fechados: o backend valida contra a mesma lista. */
export type MotivoDenuncia =
  | "spam"
  | "conteudo_improprio"
  | "assedio"
  | "carro_nao_e_meu"
  | "informacao_falsa"
  | "outro";

export interface UsuarioBloqueado {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: string;
}

async function denunciar(alvo: {
  postId?: string;
  commentId?: string;
  profileId?: string;
  reason: MotivoDenuncia;
  details?: string;
}): Promise<{ message: string }> {
  return api.post("/reports", alvo);
}

async function bloquear(userId: string): Promise<{ blocked: boolean }> {
  return api.post(`/profiles/${userId}/block`);
}

async function desbloquear(userId: string): Promise<{ blocked: boolean }> {
  return api.delete(`/profiles/${userId}/block`);
}

async function getBloqueados(): Promise<UsuarioBloqueado[]> {
  return api.get("/profile/blocks");
}

/** Dono do carro aceita ou recusa a marcação numa foto de outra pessoa. */
async function respondCarTag(postId: string, accept: boolean): Promise<Post> {
  const raw = await api.patch<RawPost>(`/posts/${postId}/car-tag`, { accept });
  return toPost(raw);
}

/** O que o pessoal registrou no rolê — a memória coletiva do encontro. */
async function getPostsByEvent(
  eventId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<Post>> {
  const result = await api.getPaginated<RawPost>(`/events/${eventId}/posts${qs({ page, limit })}`);
  return { ...result, data: result.data.map(toPost) };
}

async function getEventAttendees(
  id: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<EventAttendee>> {
  return api.getPaginated<EventAttendee>(`/events/${id}/attendees${qs({ page, limit })}`);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

async function followUser(userId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
  return api.post(`/profiles/${userId}/follow`);
}

async function unfollowUser(userId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
  return api.delete(`/profiles/${userId}/follow`);
}

/** Estas duas rotas são por id, não por username (ao contrário de
 * /profiles/:username) — o id vem no próprio perfil já carregado. */
async function getFollowers(
  userId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<FollowProfile>> {
  return api.getPaginated<FollowProfile>(`/profiles/${userId}/followers${qs({ page, limit })}`);
}

async function getFollowing(
  userId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<FollowProfile>> {
  return api.getPaginated<FollowProfile>(`/profiles/${userId}/following${qs({ page, limit })}`);
}

export const apiService = {
  getCurrentUser,
  getUserByUsername,
  updateMyProfile,
  uploadAvatar,

  getVehicleBrands,
  getVehicleModelsByBrand,
  getVehicleYearsByModel,
  getVehicleById,

  search,

  getExploreCars,
  getCarById,
  getCarsByUsername,
  getMyGarage,
  createCar,
  updateCar,
  deleteCar,
  uploadCarPhoto,

  getModsByCar,
  createModification,
  updateModification,
  deleteModification,

  getProjectByCarId,
  createProject,
  updateProject,
  deleteProject,
  addProjectStep,
  updateProjectStep,
  removeProjectStep,

  getFeed,
  getPostById,
  getPostsByUsername,
  getPostsByCar,
  createPost,
  updatePost,
  deletePost,
  getActiveAds,

  likePost,
  unlikePost,
  getPostLikers,

  savePost,
  unsavePost,
  getSavedPosts,

  getComments,
  addComment,
  updateComment,
  deleteComment,

  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,

  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,

  getEvents,
  getEventById,
  getEventsByOrganizer,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventPhoto,
  attendEvent,
  unattendEvent,
  updateAttendanceCar,
  getEventAttendees,
  getPostsByEvent,
  respondCarTag,
  denunciar,
  bloquear,
  desbloquear,
  getBloqueados,
  searchAddresses,
  reverseGeocode,
};
