/**
 * Mapa base da CARTO, usado pelos três mapas do app (EventMap, EventsMap e
 * LocationPicker), que antes repetiam a URL cada um por conta própria.
 *
 * A CARTO passou a exigir chave de acesso. A gratuita cobre até 5 milhões
 * de requisições por mês e sai em um minuto, sem criar conta, em
 * carto.com/basemaps. Hoje o mapa ainda carrega sem ela, mas nada garante
 * que continue.
 *
 * A chave entra no build por EXPO_PUBLIC_CARTO_KEY, no .env deste projeto.
 * Não é segredo: é chave de navegador, vai visível pra qualquer um que
 * abrir o app, como toda chave de mapa. Sem ela definida, o mapa segue
 * funcionando como sempre funcionou.
 */
export const CARTO_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_KEY ?? "";

/**
 * O trecho `style` das opções de `new maplibregl.Map({...})`, pronto pra
 * entrar no HTML do mapa.
 *
 * A chave vai em toda requisição à CARTO, e não só na do estilo. A
 * documentação da CARTO mostra a chave na URL de cada tile raster, mas não
 * diz como fica no mapa vetorial. O estilo aponta pra tiles, fontes e
 * ícones no mesmo domínio; anexar em todos cobre as duas possibilidades, e
 * um parâmetro sobrando numa URL que não precisava dele não quebra nada.
 */
export function estiloDoMapa(): string {
  if (!CARTO_KEY) return `style: '${CARTO_STYLE}',`;

  const chave = encodeURIComponent(CARTO_KEY);
  return `style: '${CARTO_STYLE}',
    transformRequest: function (url) {
      if (url.indexOf('basemaps.cartocdn.com') === -1) return { url: url };
      return { url: url + (url.indexOf('?') === -1 ? '?' : '&') + 'key=${chave}' };
    },`;
}
