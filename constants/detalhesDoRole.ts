/**
 * O que um rolê oferece, o que ele proíbe e que tipo de encontro é.
 *
 * As chaves são as mesmas que o backend valida (events.schema.ts) — mudar
 * aqui sem mudar lá faz o servidor recusar. Os rótulos são o que aparece na
 * tela, em português de quem vai ao encontro, não de quem programa.
 *
 * A lista de proibições é a que mais evita treta: a maioria dos encontros
 * acontece em posto ou estacionamento emprestado, e é borrachão e acelerada
 * que fazem o dono do lugar cancelar o próximo.
 */

export interface OpcaoDoRole {
  chave: string;
  rotulo: string;
}

export const ATRACOES: OpcaoDoRole[] = [
  { chave: "food_truck", rotulo: "Food truck" },
  { chave: "bar", rotulo: "Bebidas" },
  { chave: "espaco_kids", rotulo: "Espaço kids" },
  { chave: "som", rotulo: "Som / DJ" },
  { chave: "lojas", rotulo: "Lojas expondo" },
  { chave: "premiacao", rotulo: "Premiação" },
  { chave: "sorteio", rotulo: "Sorteio" },
  { chave: "estacionamento", rotulo: "Estacionamento" },
  { chave: "banheiro", rotulo: "Banheiro" },
  { chave: "area_coberta", rotulo: "Área coberta" },
  { chave: "pet_friendly", rotulo: "Pode levar pet" },
  { chave: "beneficente", rotulo: "Beneficente" },
];

export const PROIBICOES: OpcaoDoRole[] = [
  { chave: "sem_som_alto", rotulo: "Sem som alto" },
  { chave: "sem_acelerar", rotulo: "Sem acelerar" },
  { chave: "sem_arrancada", rotulo: "Sem arrancada" },
  { chave: "sem_borrachao", rotulo: "Sem borrachão" },
  { chave: "sem_bebida", rotulo: "Sem bebida" },
  { chave: "sem_drift", rotulo: "Sem drift" },
  { chave: "sem_menores", rotulo: "Proibido menores" },
  { chave: "sem_animais", rotulo: "Sem animais" },
];

export const TIPOS_DE_ROLE: OpcaoDoRole[] = [
  { chave: "encontro", rotulo: "Encontro" },
  { chave: "exposicao", rotulo: "Exposição" },
  { chave: "passeio", rotulo: "Passeio" },
  { chave: "drift", rotulo: "Drift" },
  { chave: "arrancada", rotulo: "Arrancada" },
  { chave: "track_day", rotulo: "Track day" },
  { chave: "off_road", rotulo: "Off-road" },
  { chave: "beneficente", rotulo: "Beneficente" },
];

const rotuloDe = (lista: OpcaoDoRole[], chave: string) =>
  lista.find((o) => o.chave === chave)?.rotulo ?? chave;

export const rotuloDaAtracao = (chave: string) => rotuloDe(ATRACOES, chave);
export const rotuloDaProibicao = (chave: string) => rotuloDe(PROIBICOES, chave);
export const rotuloDoTipo = (chave: string) => rotuloDe(TIPOS_DE_ROLE, chave);
