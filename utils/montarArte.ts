/**
 * O que entra na arte 9:16 de um carro e de uma publicação.
 *
 * Fica separado do desenho (arteDeStory.web.ts) porque isto aqui é decisão
 * de conteúdo — o que vale a pena aparecer no Stories — e não pixel. A tela
 * do editor usa as listas daqui pra oferecer as opções; as funções
 * `arteDo*` são o ponto de partida, com os três números mais fortes já
 * escolhidos.
 */
import { carTitle } from "@/utils/car";
import { basePublica } from "@/utils/linkPublico";
import { postThumbnail } from "@/utils/post";
import type { ArteDeStory, DestaqueDaArte } from "@/utils/arteDeStory";
import type { Car, Post } from "@/types";

/** Um número que a pessoa pode ligar ou desligar na arte. */
export interface OpcaoDeDestaque extends DestaqueDaArte {
  chave: string;
}

/** Quantos números cabem lado a lado sem apertar. */
export const MAXIMO_DE_DESTAQUES = 3;

/**
 * O endereço impresso na arte: só o site.
 *
 * O link cheio de cada carro/post termina num uuid — ninguém digita isso
 * olhando um story, e ele não fica clicável ali. O que leva a pessoa até lá
 * é o @ logo acima; o site diz de onde veio.
 */
function siteCurto(): string {
  return `${basePublica()}/app`.replace(/^https?:[/][/]/, "");
}

const reais = (valor: number) => `R$ ${valor.toLocaleString("pt-BR")}`;

/** O carro do post vem enxuto (sem os campos que carTitle usa). */
function carDoPost(post: Post): string | null {
  const car = post.car;
  if (!car) return null;
  return car.version?.trim() || (car.vehicle ? `${car.vehicle.brand} ${car.vehicle.model}` : null);
}

const diasDeProjeto = (desde: string) =>
  Math.max(1, Math.floor((Date.now() - new Date(desde).getTime()) / 86_400_000));

/** Tudo que dá pra mostrar de um carro. Só entra o que a pessoa preencheu. */
export function destaquesDoCarro(car: Car, modsCount: number): OpcaoDeDestaque[] {
  const opcoes: OpcaoDeDestaque[] = [];
  if (car.power != null) opcoes.push({ chave: "potencia", rotulo: "Potência", valor: `${car.power} cv` });
  if (car.amountInvested > 0)
    opcoes.push({ chave: "investido", rotulo: "Investido", valor: reais(car.amountInvested) });
  if (modsCount > 0) opcoes.push({ chave: "mods", rotulo: "Mods", valor: String(modsCount) });
  if (car.eventsCount) opcoes.push({ chave: "roles", rotulo: "Rolês", valor: String(car.eventsCount) });
  opcoes.push({ chave: "tempo", rotulo: "No projeto", valor: `${diasDeProjeto(car.createdAt)} dias` });
  if (car.torque != null) opcoes.push({ chave: "torque", rotulo: "Torque", valor: `${car.torque} kgfm` });
  if (car.mileage != null)
    opcoes.push({ chave: "km", rotulo: "Km", valor: car.mileage.toLocaleString("pt-BR") });
  if (car.projectProgress > 0)
    opcoes.push({ chave: "evolucao", rotulo: "Evolução", valor: `${car.projectProgress}%` });
  return opcoes;
}

export function destaquesDoPost(post: Post): OpcaoDeDestaque[] {
  const opcoes: OpcaoDeDestaque[] = [];
  if (post.cost) opcoes.push({ chave: "investido", rotulo: "Investido", valor: reais(post.cost) });
  if (post.progressPercent)
    opcoes.push({ chave: "evolucao", rotulo: "Evolução", valor: `${post.progressPercent}%` });
  if (post.likesCount > 0)
    opcoes.push({ chave: "curtidas", rotulo: "Curtidas", valor: String(post.likesCount) });
  if (post.commentsCount > 0)
    opcoes.push({ chave: "comentarios", rotulo: "Comentários", valor: String(post.commentsCount) });
  return opcoes;
}

/** As fotos que a pessoa pode escolher, sem repetir. */
export function fotosDoCarro(car: Car, posts: Post[]): string[] {
  const fotos = [car.photoUrl, ...posts.map(postThumbnail)].filter(
    (url): url is string => !!url
  );
  return [...new Set(fotos)];
}

export function fotosDoPost(post: Post): string[] {
  const fotos = [post.imageUrl, post.afterImageUrl, post.beforeImageUrl].filter(
    (url): url is string => !!url
  );
  return [...new Set(fotos)];
}

export function arteDoCarro(car: Car, modsCount: number): ArteDeStory {
  return {
    foto: car.photoUrl,
    titulo: carTitle(car),
    subtitulo: car.engine,
    // O status do projeto já é a etiqueta que o app usa nos cards da garagem.
    selo: car.status === "complete" ? "Projeto pronto" : car.status === "building" ? "Projeto em build" : null,
    destaques: destaquesDoCarro(car, modsCount).slice(0, MAXIMO_DE_DESTAQUES),
    // O @ do carro na frente do pessoal: nesses perfis é ele que a pessoa
    // divulga, e é pra ele que o story manda o pessoal.
    arroba: car.instagram ?? car.owner?.username ?? null,
    link: siteCurto(),
    nome: `downpipe-${carTitle(car).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  };
}

export function arteDoPost(post: Post, instagramDoAutor?: string | null): ArteDeStory {
  const evolucao = post.type === "evolution";

  return {
    // Em antes/depois vai o depois, que é o que a pessoa quer mostrar.
    foto: (evolucao ? post.afterImageUrl ?? postThumbnail(post) : postThumbnail(post)) ?? null,
    titulo: post.caption || post.title || "Downpipe",
    subtitulo: carDoPost(post),
    selo: evolucao ? "Antes e depois" : post.type === "project_update" ? "Atualização do projeto" : null,
    destaques: destaquesDoPost(post).slice(0, MAXIMO_DE_DESTAQUES),
    arroba: instagramDoAutor ?? post.author?.username ?? null,
    link: siteCurto(),
    nome: `downpipe-${post.id.slice(0, 8)}`,
  };
}

/** Os selos oferecidos no editor, sempre com o do próprio conteúdo na frente. */
export function selosSugeridos(atual: string | null): string[] {
  const padrao = ["Projeto em build", "Projeto pronto", "Antes e depois", "Novidade na garagem"];
  return atual ? [atual, ...padrao.filter((s) => s !== atual)] : padrao;
}
