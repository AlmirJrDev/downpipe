/**
 * O que entra na arte 9:16 de um carro e de uma publicação.
 *
 * Fica separado do desenho (arteDeStory.web.ts) porque isto aqui é decisão
 * de conteúdo — o que vale a pena aparecer no Stories — e não pixel.
 */
import { carTitle } from "@/utils/car";
import { linkPublico } from "@/utils/linkPublico";
import { postThumbnail } from "@/utils/post";
import type { ArteDeStory, DestaqueDaArte } from "@/utils/arteDeStory";
import type { Car, Post } from "@/types";

/** Só o domínio + caminho: "https://" ocupando espaço na arte não ajuda. */
function linkCurto(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const reais = (valor: number) => `R$ ${valor.toLocaleString("pt-BR")}`;

/** O carro do post vem enxuto (sem os campos que carTitle usa). */
function carDoPost(post: Post): string | null {
  const car = post.car;
  if (!car) return null;
  return car.version?.trim() || (car.vehicle ? `${car.vehicle.brand} ${car.vehicle.model}` : null);
}

export function arteDoCarro(car: Car, modsCount: number): ArteDeStory {
  const destaques: DestaqueDaArte[] = [];
  if (car.power != null) destaques.push({ rotulo: "Potência", valor: `${car.power} cv` });
  if (car.amountInvested > 0) destaques.push({ rotulo: "Investido", valor: reais(car.amountInvested) });
  if (modsCount > 0) destaques.push({ rotulo: "Mods", valor: String(modsCount) });

  return {
    foto: car.photoUrl,
    titulo: carTitle(car),
    subtitulo: car.engine,
    // O status do projeto já é a etiqueta que o app usa nos cards da garagem.
    selo: car.status === "complete" ? "Projeto pronto" : car.status === "building" ? "Projeto em build" : null,
    destaques,
    // O @ do carro na frente do pessoal: nesses perfis é ele que a pessoa
    // divulga, e é pra ele que o story manda o pessoal.
    arroba: car.instagram ?? car.owner?.username ?? null,
    link: linkCurto(linkPublico.carro(car.id)),
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
    destaques:
      post.type === "project_update" && post.cost
        ? [{ rotulo: "Investido", valor: reais(post.cost) }]
        : [],
    arroba: instagramDoAutor ?? post.author?.username ?? null,
    link: linkCurto(linkPublico.post(post.id)),
    nome: `downpipe-${post.id.slice(0, 8)}`,
  };
}
