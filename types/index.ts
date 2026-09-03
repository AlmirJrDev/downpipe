// Espelha os enums reais do backend (cars.schema.ts / modifications.schema.ts).
export type ProjectStatus = "planning" | "building" | "complete";

export type Category = "JDM" | "Euro" | "Muscle" | "Performance" | "Clássicos" | "Stance" | "Other";

export type ModificationCategory =
  | "Performance"
  | "Suspensão"
  | "Estética"
  | "Eletrônica"
  | "Motor"
  | "Freios"
  | "Interior"
  | "Escape"
  | "Rodas"
  | "Other";

/** Autor/dono embutido nas respostas de post/comentário (join do backend — não é um id solto). */
export interface AuthorRef {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  gearheadSince: number | null;
  carsCount: number;
  projectsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean | null;
  /** Marca no perfil que já existe — não é um segundo tipo de conta. */
  isOrganizer?: boolean;
  /** Rolês em que a pessoa já esteve — só os que já aconteceram. */
  eventsAttendedCount?: number;
}

// Catálogo próprio de veículos (GET /vehicles/*), alimentado pela FIPE.
export interface VehicleBrand {
  id: string;
  name: string;
  fipeCode: string;
}

export interface VehicleModel {
  id: string;
  brandId: string;
  name: string;
  fipeCode: string;
}

export interface VehicleVersion {
  id: string;
  modelId: string;
  name: string;
  year: number;
  fuel: string | null;
  fipeCode: string;
  fipePrice: number | null;
  fipeReferenceMonth: string | null;
}

export interface VehicleDetail extends VehicleVersion {
  model: { id: string; name: string };
  brand: { id: string; name: string };
}

// cars não tem brand/model/year em texto livre — só um vehicleVersionId
// opcional apontando pro catálogo acima. O backend já resolve esse link e
// embute marca/modelo/ano prontos em `vehicle` (join, sem request extra por
// carro) — fica null pra carro sem catálogo.
export interface Car {
  id: string;
  ownerId: string;
  /** Dono embutido via join — evita uma requisição por card na Explorar. */
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  vehicleVersionId: string | null;
  vehicle: {
    id: string;
    name: string;
    year: number;
    model: { id: string; name: string };
    brand: { id: string; name: string };
  } | null;
  version: string | null;
  engine: string | null;
  power: number | null; // cv
  torque: number | null;
  transmission: string | null;
  drivetrain: string | null;
  mileage: number | null; // km
  description: string | null;
  photoUrl: string | null;
  status: ProjectStatus;
  projectProgress: number; // 0-100, derivado
  amountInvested: number; // BRL, derivado
  category: Category | null;
  /** Em quantos rolês distintos o carro já apareceu. Só vem no detalhe —
   * na listagem seria uma consulta por card. */
  eventsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Modification {
  id: string;
  carId: string;
  name: string;
  category: ModificationCategory | null;
  cost: number | null;
  date: string | null;
  // Ícone é um conceito só do app (backend aceita qualquer string) — os 9
  // valores abaixo são os que o app sabe desenhar; qualquer outra string
  // (ex. registrada fora do app) cai no ícone genérico na exibição.
  icon: string;
  description?: string | null;
}

export interface ProjectStep {
  id: string;
  projectId: string;
  carId: string;
  name: string;
  status: "done" | "active" | "pending";
  estimatedCost: number | null;
  actualCost?: number | null;
  date?: string | null;
  description?: string | null;
  position: number;
}

export interface Project {
  id: string;
  carId: string;
  title: string;
  powerGoalFrom: number | null;
  powerGoalTo: number | null;
  budgetTotal: number | null;
  budgetSpent: number; // derivado
  modificationsTotal: number; // derivado
  modificationsDone: number; // derivado
  steps: ProjectStep[];
}

export type PostType = "normal" | "project_update" | "evolution" | "ad" | "house_ad";

// Espelha exatamente o que GET /advertisements/active devolve (title, caption,
// imageUrl, ctaLabel, ctaUrl) — o backend não expõe logo nem tag do
// anunciante (a tabela `advertisers` nunca é servida pela API), então esses
// campos não existem aqui. "Patrocinado" é um rótulo fixo no AdCard, não um
// dado do post.
export interface AdFields {
  ctaLabel?: string; // ex: "Saiba mais", "Anuncie aqui"
  ctaUrl?: string;
}

export interface PostMedia {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  position: number;
}

export interface Post extends AdFields {
  id: string;
  // Posts reais (normal/project_update/evolution) trazem author/car
  // embutidos via join do backend — nunca um id solto pra resolver depois.
  // Anúncios (ad/house_ad) não têm autor nem carro; ficam null.
  author: AuthorRef | null;
  car: {
    id: string;
    /** Dono do carro — quem pode responder a uma marcação pendente. */
    ownerId: string;
    version: string | null;
    photoUrl: string | null;
    vehicle: { name: string; year: number; model: string; brand: string } | null;
  } | null;
  type: PostType;
  // media[] é o dado real do backend pra posts normais; imageUrl/before/after
  // abaixo são preenchidos pelo apiService (achatando media[] por posição) e
  // são o único dado de imagem que existe pra ad/house_ad.
  media?: PostMedia[];
  imageUrl?: string;
  beforeImageUrl?: string; // for evolution posts
  afterImageUrl?: string;
  caption: string;
  title?: string; // for project update posts
  subtitle?: string;
  cost?: number;
  progressPercent?: number;
  likesCount: number;
  commentsCount: number;
  likedByMe?: boolean | null;
  // Salvar é privado: null pra quem não está logado, como likedByMe.
  savedByMe?: boolean | null;
  /**
   * Estado da marcação do carro. "pending" = marcaram um carro de outra
   * pessoa e o dono ainda não respondeu; nesse estado a foto não aparece
   * na página do carro.
   */
  carTagStatus?: "approved" | "pending" | null;
  /** Rolê marcado na publicação — embutido via join, sem requisição extra. */
  event?: { id: string; name: string; startsAt: string; city: string } | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: AuthorRef | null;
  text: string;
  createdAt: string;
}

// Quem curtiu um post. Vem "achatado" (não aninhado num author), e username/
// displayName/avatarUrl podem ser null se o perfil sumiu — por isso não
// reaproveita AuthorRef.
export interface PostLiker {
  userId: string;
  likedAt: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Item das listas de seguidores/seguindo. Mesmo caso do PostLiker: o
 * backend devolve tudo null quando o perfil não existe mais. */
export interface FollowProfile {
  id: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
}

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "project_update"
  | "event_attend"
  | "car_tag";

/**
 * Chamada AppNotification, e não Notification, porque esse nome já é um tipo
 * global do DOM — o conflito passaria despercebido até dar erro estranho.
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  postId: string | null;
  commentId: string | null;
  eventId: string | null;
  createdAt: string;
  readAt: string | null;
  actor: AuthorRef | null;
}

export type EventVisibility = "public" | "link";

export interface CarEvent {
  id: string;
  organizerId: string;
  name: string;
  description: string | null;
  /** ISO com hora — encontro tem horário, não só data. */
  startsAt: string;
  /** Como o pessoal chama o lugar — "Posto Graal", não um endereço. */
  location: string;
  city: string;
  /**
   * Rua e número, resolvidos a partir do pino no mapa. Complementar a
   * `location`, não substituto: o nome é o que as pessoas reconhecem, o
   * endereço é o que leva até lá. Null quando não há coordenada ou o ponto
   * caiu onde não havia o que nomear.
   */
  address: string | null;
  photoUrl: string | null;
  /** "public" entra no calendário; "link" só é alcançado por quem tem o id. */
  visibility: EventVisibility;
  /** Preenchidas pelo backend geocodificando o endereço; null quando não resolve. */
  latitude: number | null;
  longitude: number | null;
  /**
   * "pinned" = o organizador escolheu o ponto (pino, GPS ou sugestão) — é a
   * única confiável sem ressalva. "exact"/"city" vêm de palpite do servidor
   * sobre o texto do endereço.
   */
  coordsPrecision: "exact" | "city" | "pinned" | null;
  organizer: (AuthorRef & { isOrganizer: boolean }) | null;
  attendeesCount: number;
  /** Só vem quando a busca teve um centro (mapa ou filtro por raio). */
  distanceKm?: number;
  /** null pra quem não está logado, como likedByMe. */
  attendingByMe?: boolean | null;
  /** Quantos dos confirmados eu sigo — o sinal social que decide a ida. */
  friendsGoing?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Quem confirmou presença. Mesmo formato achatado do PostLiker. */
export interface EventAttendee {
  userId: string;
  confirmedAt: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /**
   * Carro que a pessoa vai levar. null é o caso comum — carona, a pé, ou
   * quem vai justamente pra fotografar o carro dos outros.
   */
  car: {
    id: string;
    version: string | null;
    photoUrl: string | null;
    vehicle: { name: string; year: number; model: string; brand: string } | null;
  } | null;
}

export type AddAction =
  | "carro"
  | "modificacao"
  | "post"
  | "atualizacao"
  | "evolucao"
  | "evento";
