/**
 * O elenco do modo demonstração. Tudo aqui é inventado: pessoas, @, carros,
 * encontros e lugares. Nada vem do banco — é isso que deixa usar as telas
 * em post, vídeo e apresentação sem expor quem usa o app de verdade.
 *
 * As datas são relativas a hoje, pra agenda nunca envelhecer: "daqui a 3
 * dias" continua sendo daqui a 3 dias em qualquer dia que alguém abrir.
 *
 * As imagens moram em public/demo (servidas em /demo/...).
 */
import type {
  AppNotification,
  AuthorRef,
  Car,
  CarEvent,
  Comment,
  EventAttendee,
  Modification,
  Post,
  Project,
  User,
} from "@/types";

// ------------------------------------------------------------------ tempo

function emDias(dias: number, hora = 20, minuto = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

function haHoras(horas: number): string {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

// ----------------------------------------------------------------- pessoas

export interface Pessoa extends AuthorRef {
  id: string;
  bio: string;
  instagram: string | null;
  gearheadSince: number;
  isOrganizer?: boolean;
  followers: number;
  following: number;
}

/**
 * Endereço completo, e não /demo/...: o mapa desenha os pinos numa página
 * própria, onde um caminho relativo não acha a imagem.
 */
const ORIGEM = typeof window !== "undefined" && window.location ? window.location.origin : "";

const avatar = (nome: string) => `${ORIGEM}/demo/avatares/${nome}.png`;

export const PESSOAS = {
  rafa: { id: "u-rafa", username: "rafa.turbo", displayName: "Rafa Moreira", avatarUrl: avatar("rafa"), bio: "Golf GTI rumo aos 350 cv. Campinas.", instagram: "rafa.turbo", gearheadSince: 2014, followers: 1284, following: 312 },
  lu: { id: "u-lu", username: "lu.stance", displayName: "Luana Prado", avatarUrl: avatar("lu"), bio: "Civic Si preto, sempre no chão.", instagram: "lu.stance", gearheadSince: 2017, followers: 3420, following: 498 },
  beto: { id: "u-beto", username: "garagem.do.beto", displayName: "Beto Ramos", avatarUrl: avatar("beto"), bio: "Antigos são pra rodar. Impala 63.", instagram: null, gearheadSince: 1998, followers: 890, following: 120 },
  kenji: { id: "u-kenji", username: "kenji.jdm", displayName: "Kenji Sato", avatarUrl: avatar("kenji"), bio: "350Z, track day e madrugada.", instagram: "kenji.jdm", gearheadSince: 2012, followers: 2105, following: 260 },
  marina: { id: "u-marina", username: "clique.automotivo", displayName: "Marina Costa", avatarUrl: avatar("marina"), bio: "Fotógrafa de encontros. Te marco no carro.", instagram: "clique.automotivo", gearheadSince: 2019, followers: 5630, following: 701 },
  vortex: { id: "u-vortex", username: "equipe.vortex", displayName: "Equipe Vortex", avatarUrl: avatar("vortex"), bio: "Organizamos encontros em Campinas e região.", instagram: "equipe.vortex", gearheadSince: 2016, isOrganizer: true, followers: 8120, following: 64 },
  duda: { id: "u-duda", username: "duda.baixo", displayName: "Duda Lima", avatarUrl: avatar("duda"), bio: "Golf quadrado é estilo de vida.", instagram: null, gearheadSince: 2020, followers: 640, following: 380 },
} satisfies Record<string, Pessoa>;

type ChaveDePessoa = keyof typeof PESSOAS;

/** Quem está "logado" na demonstração. */
export const EU = PESSOAS.rafa;

export function autor(p: Pessoa): AuthorRef {
  return { username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl };
}

// ------------------------------------------------------------------ carros

const foto = (nome: string) => `${ORIGEM}/demo/carros/${nome}.jpg`;

function carro(
  id: string,
  dono: Pessoa,
  marca: string,
  modelo: string,
  ano: number,
  extra: Partial<Car>
): Car {
  return {
    id,
    ownerId: dono.id,
    owner: { id: dono.id, username: dono.username, displayName: dono.displayName, avatarUrl: dono.avatarUrl },
    vehicleVersionId: `v-${id}`,
    vehicle: {
      id: `v-${id}`,
      name: String(ano),
      year: ano,
      model: { id: `m-${id}`, name: modelo },
      brand: { id: `b-${id}`, name: marca },
    },
    version: null,
    engine: null,
    power: null,
    torque: null,
    transmission: null,
    drivetrain: null,
    mileage: null,
    description: null,
    photoUrl: null,
    status: "building",
    projectProgress: 0,
    amountInvested: 0,
    category: null,
    photosLikes: 0,
    instagram: null,
    eventsCount: 0,
    createdAt: emDias(-420, 10),
    updatedAt: emDias(-2, 10),
    ...extra,
  };
}

export const CARROS: Car[] = [
  carro("c-golf", PESSOAS.rafa, "Volkswagen", "Golf GTI", 2015, {
    version: "Golf GTI", engine: "2.0 TSI", power: 262, mileage: 68000, photoUrl: foto("golf"),
    description: "Stage 2, downpipe 3\" e coilover. Próximo passo: turbo híbrido.",
    status: "building", projectProgress: 60, amountInvested: 18400, category: "Euro",
    photosLikes: 1240, instagram: "golf.gti.rafa", eventsCount: 23,
  }),
  carro("c-civic", PESSOAS.lu, "Honda", "Civic Si", 2018, {
    version: "Civic Si", engine: "1.5 Turbo", power: 208, mileage: 41000, photoUrl: foto("civic"),
    description: "Preto no preto, rebaixado e com muita paciência com lombada.",
    status: "building", projectProgress: 80, amountInvested: 22900, category: "Stance",
    photosLikes: 3310, eventsCount: 41,
  }),
  carro("c-opala", PESSOAS.beto, "Chevrolet", "Impala", 1963, {
    version: "Impala", engine: "5.4 V8", power: 250, mileage: 54000, photoUrl: foto("impala"),
    description: "Restaurado peça por peça em seis anos. Cromado original.",
    status: "complete", projectProgress: 100, amountInvested: 41000, category: "Clássicos",
    photosLikes: 2280, eventsCount: 37,
  }),
  carro("c-350z", PESSOAS.kenji, "Nissan", "350Z", 2007, {
    version: "350Z", engine: "3.5 V6 VQ35", power: 300, mileage: 89000, photoUrl: foto("350z"),
    description: "Feito pra pista. Rua só pra chegar no autódromo.",
    status: "building", projectProgress: 55, amountInvested: 35700, category: "JDM",
    photosLikes: 1890, eventsCount: 19,
  }),
  carro("c-gol", PESSOAS.duda, "Volkswagen", "Golf GTI", 1990, {
    version: "Golf GTI MK2", engine: "1.8 16V", power: 139, mileage: 198000, photoUrl: foto("mk2-depois"),
    description: "Era vermelho e original. Virou branco, baixo e de roda BBS.",
    status: "complete", projectProgress: 100, amountInvested: 15300, category: "Euro",
    photosLikes: 970, eventsCount: 12,
  }),
];

export const carroPorId = (id: string) => CARROS.find((c) => c.id === id) ?? null;

/** O carro como ele aparece dentro de um post ou de uma confirmação. */
export function carroResumido(c: Car) {
  return {
    id: c.id,
    ownerId: c.ownerId,
    version: c.version,
    photoUrl: c.photoUrl,
    vehicle: c.vehicle
      ? { name: c.vehicle.name, year: c.vehicle.year, model: c.vehicle.model.name, brand: c.vehicle.brand.name }
      : null,
  };
}

// ----------------------------------------------------------- modificações

export const MODS: Modification[] = [
  { id: "m1", carId: "c-golf", name: "Remap stage 2", category: "Performance", cost: 2800, date: emDias(-300, 12), icon: "ecu", description: "Mapa feito no dinamômetro, 262 cv na roda." },
  { id: "m2", carId: "c-golf", name: "Downpipe 3\" inox", category: "Escape", cost: 3400, date: emDias(-240, 12), icon: "engine", description: "Sem catalisador de fábrica, ronco mais encorpado." },
  { id: "m3", carId: "c-golf", name: "Coilover rosca", category: "Suspensão", cost: 6200, date: emDias(-120, 12), icon: "suspension", description: "Regulagem de altura e carga." },
  { id: "m4", carId: "c-golf", name: "Rodas aro 19", category: "Rodas", cost: 6000, date: emDias(-40, 12), icon: "wheel", description: "Pneu 235/35 R19." },
  { id: "m5", carId: "c-350z", name: "Turbo kit", category: "Motor", cost: 9800, date: emDias(-60, 12), icon: "engine" },
  { id: "m6", carId: "c-civic", name: "Suspensão a ar", category: "Suspensão", cost: 11500, date: emDias(-90, 12), icon: "suspension" },
];

export const PROJETO_DO_GOLF: Project = {
  id: "p-golf",
  carId: "c-golf",
  title: "Golf GTI rumo aos 350 cv",
  powerGoalFrom: 220,
  powerGoalTo: 350,
  budgetTotal: 30000,
  budgetSpent: 18400,
  modificationsTotal: 6,
  modificationsDone: 4,
  steps: [
    { id: "s1", projectId: "p-golf", carId: "c-golf", name: "Stage 1", status: "done", estimatedCost: 2500, actualCost: 2800, position: 0 },
    { id: "s2", projectId: "p-golf", carId: "c-golf", name: "Stage 2 + downpipe", status: "done", estimatedCost: 3500, actualCost: 3400, position: 1 },
    { id: "s3", projectId: "p-golf", carId: "c-golf", name: "Suspensão e rodas", status: "active", estimatedCost: 12000, actualCost: 12200, position: 2 },
    { id: "s4", projectId: "p-golf", carId: "c-golf", name: "Turbo híbrido", status: "pending", estimatedCost: 9500, position: 3 },
  ],
};

// --------------------------------------------------------------- encontros

const flyer = (nome: string) => `${ORIGEM}/demo/flyers/${nome}.jpg`;

function encontro(id: string, organizador: Pessoa, extra: Partial<CarEvent> & Pick<CarEvent, "name" | "startsAt" | "location" | "city" | "latitude" | "longitude">): CarEvent {
  return {
    id,
    organizerId: organizador.id,
    description: null,
    address: null,
    photoUrl: null,
    photoThumbUrl: null,
    visibility: "public",
    coordsPrecision: "pinned",
    endsAt: null,
    endsAtEstimated: false,
    entryNote: null,
    attractions: [],
    rules: [],
    kind: "encontro",
    carCategories: [],
    sourceUrl: null,
    sourceNote: null,
    organizerInstagram: null,
    tippedBy: null,
    organizer: { ...autor(organizador), isOrganizer: true },
    attendeesCount: 0,
    attendingByMe: false,
    friendsGoing: 0,
    createdAt: emDias(-20, 10),
    updatedAt: emDias(-2, 10),
    ...extra,
  };
}

export const ENCONTROS: CarEvent[] = [
  encontro("e-noite-turbo", PESSOAS.vortex, {
    name: "Noite Turbo Campinas", startsAt: emDias(3, 20), endsAt: emDias(3, 23, 30), endsAtEstimated: true,
    location: "Lagoa Norte — estacionamento do Portão 3", city: "Campinas", address: "Av. das Palmeiras, 1200, Campinas - SP",
    latitude: -22.874, longitude: -47.048, photoUrl: flyer("noite-turbo"), photoThumbUrl: flyer("noite-turbo"),
    description: "O encontro noturno da Vortex: turbo, rebaixado e quem gosta de ver de perto.",
    entryNote: "1 kg de alimento não perecível", attractions: ["food_truck", "som", "sorteio"], rules: ["sem_som_alto", "sem_borrachao", "sem_arrancada"],
    attendeesCount: 87, attendingByMe: true, friendsGoing: 6,
  }),
  encontro("e-euro-meet", PESSOAS.vortex, {
    name: "Euro Meet Paulista", startsAt: emDias(6, 9), endsAt: emDias(6, 15), kind: "exposicao",
    location: "Pátio Central Expo", city: "São Paulo", address: "Rua das Indústrias, 450, São Paulo - SP",
    latitude: -23.528, longitude: -46.678, photoUrl: flyer("euro-meet"), photoThumbUrl: flyer("euro-meet"),
    entryNote: "Visitante grátis · expositor R$ 20", attractions: ["lojas", "premiacao", "food_truck", "banheiro"], rules: ["sem_som_alto", "sem_bebida"],
    carCategories: ["Euro"], attendeesCount: 142, friendsGoing: 9,
  }),
  encontro("e-jdm-night", PESSOAS.rafa, {
    name: "JDM Night Valinhos", startsAt: emDias(10, 19), location: "Kartódromo Vale Verde", city: "Valinhos",
    address: "Estrada do Kartódromo, 80, Valinhos - SP", latitude: -22.97, longitude: -46.996,
    photoUrl: flyer("jdm-night"), photoThumbUrl: flyer("jdm-night"),
    entryNote: "Entrada gratuita", attractions: ["som", "estacionamento"], rules: ["sem_borrachao", "sem_drift"],
    attendeesCount: 64, attendingByMe: true, friendsGoing: 4,
  }),
  encontro("e-antigos", PESSOAS.beto, {
    name: "Encontro de Antigos da Matriz", startsAt: emDias(13, 8), endsAt: emDias(13, 13), kind: "exposicao",
    location: "Praça da Matriz", city: "Jundiaí", latitude: -23.186, longitude: -46.897,
    photoUrl: flyer("antigos"), photoThumbUrl: flyer("antigos"),
    entryNote: "Entrada gratuita", attractions: ["premiacao", "pet_friendly"], rules: ["sem_acelerar"],
    carCategories: ["Clássicos"], attendeesCount: 51, friendsGoing: 2,
  }),
  encontro("e-track-day", PESSOAS.kenji, {
    name: "Track Day Vale Verde", startsAt: emDias(17, 8), endsAt: emDias(17, 17), kind: "track_day",
    location: "Autódromo Vale Verde", city: "Itu", latitude: -23.264, longitude: -47.299,
    photoUrl: flyer("track-day"), photoThumbUrl: flyer("track-day"),
    entryNote: "Inscrição R$ 350 por carro", attractions: ["banheiro", "food_truck"], rules: ["sem_menores"],
    attendeesCount: 28, friendsGoing: 3,
  }),
  encontro("e-stance", PESSOAS.lu, {
    name: "Stance Sunday", startsAt: emDias(20, 10), location: "Parque das Águas", city: "Sorocaba",
    latitude: -23.5, longitude: -47.452, photoUrl: flyer("stance-sunday"), photoThumbUrl: flyer("stance-sunday"),
    entryNote: "Entrada gratuita", attractions: ["som", "lojas"], rules: ["sem_som_alto"],
    carCategories: ["Stance"], attendeesCount: 73, friendsGoing: 5,
  }),
  encontro("e-solidario", PESSOAS.vortex, {
    name: "Encontro Solidário de Natal", startsAt: emDias(24, 18), location: "Arena Central", city: "Americana",
    latitude: -22.739, longitude: -47.331, kind: "beneficente", photoUrl: flyer("solidario"), photoThumbUrl: flyer("solidario"),
    entryNote: "1 brinquedo novo", attractions: ["beneficente", "espaco_kids", "food_truck"], rules: ["sem_som_alto", "sem_bebida"],
    attendeesCount: 96, friendsGoing: 7,
  }),
  // Já aconteceram
  encontro("e-cafe-classicos", PESSOAS.beto, {
    name: "Café com Clássicos", startsAt: emDias(-9, 8), location: "Padaria Estação", city: "Campinas",
    latitude: -22.9, longitude: -47.06, photoUrl: flyer("cafe-classicos"), photoThumbUrl: flyer("cafe-classicos"),
    attendeesCount: 120, attendingByMe: true,
  }),
  encontro("e-noite-turbo-3", PESSOAS.vortex, {
    name: "Noite Turbo Campinas — 3ª edição", startsAt: emDias(-23, 20), location: "Lagoa Norte — estacionamento do Portão 3", city: "Campinas",
    latitude: -22.874, longitude: -47.048, photoUrl: flyer("noite-turbo"), photoThumbUrl: flyer("noite-turbo"),
    attendeesCount: 210, attendingByMe: true,
  }),
];

export const encontroPorId = (id: string) => ENCONTROS.find((e) => e.id === id) ?? null;

/** Quem confirmou, com o carro que leva — os mesmos em todo encontro. */
export function confirmados(e: CarEvent): EventAttendee[] {
  const lista: [Pessoa, Car | null][] = [
    [PESSOAS.lu, carroPorId("c-civic")],
    [PESSOAS.kenji, carroPorId("c-350z")],
    [PESSOAS.beto, carroPorId("c-opala")],
    [PESSOAS.duda, carroPorId("c-gol")],
    [PESSOAS.marina, null],
  ];
  if (e.attendingByMe) lista.unshift([EU, carroPorId("c-golf")]);
  return lista.map(([p, c], i) => ({
    userId: p.id,
    confirmedAt: haHoras(5 + i * 7),
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    car: c ? { id: c.id, version: c.version, photoUrl: c.photoUrl, vehicle: carroResumido(c).vehicle } : null,
  }));
}

// ------------------------------------------------------------------- posts

function post(id: string, quem: Pessoa, extra: Partial<Post>): Post {
  return {
    id,
    author: autor(quem),
    car: null,
    type: "normal",
    caption: "",
    likesCount: 0,
    commentsCount: 0,
    commentsPreview: [],
    likedByMe: false,
    savedByMe: false,
    carTagStatus: null,
    event: null,
    createdAt: haHoras(2),
    ...extra,
  };
}

const comCarro = (id: string) => carroResumido(carroPorId(id)!);
const eventoDoPost = (id: string) => {
  const e = encontroPorId(id)!;
  return { id: e.id, name: e.name, startsAt: e.startsAt, city: e.city };
};
const midia = (urls: string[]) => urls.map((u, i) => ({ id: `md-${u}-${i}`, mediaUrl: u, mediaType: "image" as const, position: i }));

export const POSTS: Post[] = [
  post("p-lu-civic", PESSOAS.lu, {
    car: comCarro("c-civic"), imageUrl: foto("civic"), media: midia([foto("civic")]),
    caption: "Altura nova, mesma paixão. Suspensão a ar regulada pro Stance Sunday 🔧",
    likesCount: 214, commentsCount: 18, createdAt: haHoras(1),
    commentsPreview: [{ id: "cp1", text: "Ficou no ponto!", author: { username: "duda.baixo" } }],
  }),
  post("p-marina-opala", PESSOAS.marina, {
    car: comCarro("c-opala"), carTagStatus: "approved", imageUrl: foto("impala"), media: midia([foto("impala")]),
    caption: "Esse Impala parou o Café com Clássicos de domingo. Que conservação, @garagem.do.beto!",
    event: eventoDoPost("e-cafe-classicos"), likesCount: 389, commentsCount: 27, createdAt: haHoras(4),
    commentsPreview: [{ id: "cp2", text: "Obrigado pelo clique, Marina!", author: { username: "garagem.do.beto" } }],
  }),
  post("p-kenji-update", PESSOAS.kenji, {
    type: "project_update", car: comCarro("c-350z"), imageUrl: foto("350z-2"),
    title: "FASE 2 — TURBO", subtitle: "Nissan 350Z 2007", caption: "Turbo kit instalado, agora é acertar o mapa.",
    cost: 9800, progressPercent: 55, likesCount: 176, commentsCount: 12, createdAt: haHoras(7),
  }),
  post("p-duda-evolucao", PESSOAS.duda, {
    type: "evolution", car: comCarro("c-gol"), beforeImageUrl: foto("mk2-antes"), afterImageUrl: foto("mk2-depois"),
    caption: "Dois anos de projeto resumidos numa foto. Arrasta pro lado 👉", likesCount: 512, commentsCount: 44, createdAt: haHoras(11),
  }),
  post("p-rafa-golf", PESSOAS.rafa, {
    car: comCarro("c-golf"), imageUrl: foto("golf"), media: midia([foto("golf"), foto("golf-2"), foto("golf-3")]),
    caption: "Rodas novas chegaram. Aro 19, e o Golf finalmente ficou com a cara que eu queria.",
    event: eventoDoPost("e-noite-turbo-3"), likesCount: 301, commentsCount: 22, likedByMe: false, createdAt: haHoras(20),
    commentsPreview: [{ id: "cp3", text: "Que roda é essa? Muito top", author: { username: "kenji.jdm" } }],
  }),
  post("p-beto-opala", PESSOAS.beto, {
    car: comCarro("c-opala"), imageUrl: foto("impala"), media: midia([foto("impala")]),
    caption: "Domingo é dia de tirar o Impala da garagem.", likesCount: 198, commentsCount: 9, createdAt: haHoras(30),
  }),
  post("p-kenji-350z", PESSOAS.kenji, {
    car: comCarro("c-350z"), imageUrl: foto("350z"), media: midia([foto("350z")]),
    caption: "Preparado pro Track Day. Quem vai?", event: null, likesCount: 263, commentsCount: 31, createdAt: haHoras(48),
  }),
];

export const postPorId = (id: string) => POSTS.find((p) => p.id === id) ?? null;

export const COMENTARIOS: Comment[] = [
  { id: "cm1", postId: "", author: autor(PESSOAS.kenji), text: "Que roda é essa? Muito top", createdAt: haHoras(18) },
  { id: "cm2", postId: "", author: autor(PESSOAS.lu), text: "Ficou absurdo! Vai levar no Noite Turbo?", createdAt: haHoras(15) },
  { id: "cm3", postId: "", author: autor(PESSOAS.duda), text: "Esse ronco ao vivo deve ser outra coisa", createdAt: haHoras(9) },
  { id: "cm4", postId: "", author: autor(PESSOAS.marina), text: "Bora fazer umas fotos dele no próximo encontro?", createdAt: haHoras(3) },
];

// ------------------------------------------------------------ notificações

const notificacao = (id: string, tipo: AppNotification["type"], quem: Pessoa, horas: number, extra: Partial<AppNotification> = {}): AppNotification => ({
  id, type: tipo, postId: null, commentId: null, eventId: null, createdAt: haHoras(horas), readAt: horas > 24 ? haHoras(horas - 1) : null, actor: autor(quem), ...extra,
});

export const NOTIFICACOES: AppNotification[] = [
  notificacao("n1", "like", PESSOAS.lu, 0.5, { postId: "p-rafa-golf" }),
  notificacao("n2", "comment", PESSOAS.kenji, 2, { postId: "p-rafa-golf" }),
  notificacao("n3", "car_tag", PESSOAS.marina, 3, { postId: "p-marina-opala" }),
  notificacao("n4", "follow", PESSOAS.marina, 6),
  notificacao("n5", "event_attend", PESSOAS.duda, 8, { eventId: "e-jdm-night" }),
  notificacao("n6", "project_update", PESSOAS.kenji, 7, { postId: "p-kenji-update" }),
  notificacao("n7", "like", PESSOAS.beto, 30, { postId: "p-rafa-golf" }),
  notificacao("n8", "follow", PESSOAS.vortex, 52),
];

// --------------------------------------------------------------- perfis

export function perfil(chave: ChaveDePessoa | Pessoa): User {
  const p = typeof chave === "string" ? PESSOAS[chave] : chave;
  const carros = CARROS.filter((c) => c.ownerId === p.id);
  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    gearheadSince: p.gearheadSince,
    instagram: p.instagram,
    carsCount: carros.length,
    projectsCount: carros.filter((c) => c.status === "building").length,
    followersCount: p.followers,
    followingCount: p.following,
    isFollowing: p.id === EU.id ? null : p.id !== PESSOAS.duda.id,
    isOrganizer: !!(p as Pessoa).isOrganizer,
    isAdmin: false,
    eventsAttendedCount: Math.round(p.followers / 60) + 8,
  };
}

export function pessoaPorUsername(username: string): Pessoa | null {
  return Object.values(PESSOAS).find((p) => p.username === username) ?? null;
}

export const TODAS_AS_PESSOAS: Pessoa[] = Object.values(PESSOAS);
