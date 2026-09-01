/**
 * Gera a landing estática que vai pro GitHub Pages.
 *
 * POR QUE existe uma segunda cópia da landing:
 *
 * O Render grátis hiberna depois de ~15 min sem visita, e acordar leva
 * perto de um minuto. Como a landing e a API saem do MESMO serviço, um link
 * de divulgação cai nessa espera: a pessoa clica, vê a tela de "waking up"
 * da Render e fecha. O GitHub Pages é estático e não hiberna — abre na
 * hora, e ainda dispara um ping que acorda o backend enquanto a pessoa lê,
 * pra que o app já esteja de pé quando ela clicar em "abrir".
 *
 * O Render continua servindo tudo como antes. Isto é uma cópia, não uma
 * mudança de lugar: se o Pages sumir, nada quebra.
 *
 * O que muda em relação ao original:
 *  - landing.html vira index.html (é o que o Pages serve na raiz);
 *  - caminhos absolutos viram relativos, porque no Pages o site mora em
 *    /downpipe/ e não na raiz do domínio;
 *  - links do app apontam pro Render, que é onde o app roda de verdade;
 *  - og:image vira URL absoluta — scraper de rede social não resolve
 *    caminho relativo;
 *  - entra o ping que acorda o backend;
 *  - entra noindex: enquanto as duas cópias existirem, deixar as duas
 *    indexáveis criaria conteúdo duplicado. Quando você decidir qual
 *    endereço vai divulgar, isto sai daqui e vira o contrário lá.
 *
 * Ficam de fora manifest.json e sw.js: o PWA pertence à origem do Render,
 * e um service worker registrado nesta origem não serviria pra nada.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ORIGEM = 'public';
const DESTINO = 'landing-dist';
const APP = 'https://downpipe.onrender.com';

// Passada pelo workflow; no build local fica vazia e o og:image continua
// relativo — não vale a pena inventar um endereço aqui.
const BASE = (process.env.PAGES_URL ?? '').replace(/\/$/, '');

const NAO_COPIAR = new Set(['manifest.json', 'sw.js', 'sitemap.xml', 'robots.txt', 'landing.html']);

const AQUECIMENTO = `
<script>
  /* Acorda o backend enquanto a pessoa lê a página. O plano grátis da
     Render leva perto de um minuto pra subir; disparando aqui, esse tempo
     corre em paralelo com a leitura em vez de virar tela de espera depois
     do clique.

     no-cors porque a resposta não interessa — só o fato de a requisição
     chegar. E catch vazio porque falhar aqui não pode atrapalhar a página:
     no pior caso a pessoa espera o que esperaria de qualquer jeito. */
  fetch('${APP}/health', { mode: 'no-cors', cache: 'no-store' }).catch(function () {});
</script>
`;

function reescrever(html) {
  let saida = html
    .replace(/href="\/app\/"/g, `href="${APP}/app/"`)
    .replace(/href="\/privacidade"/g, 'href="privacidade.html"')
    .replace(/href="\/termos"/g, 'href="termos.html"')
    .replace(/href="\/"/g, 'href="index.html"')
    // Assets soltos: /logo-lp.png -> logo-lp.png
    .replace(/(href|src)="\/([\w.-]+\.(png|jpg|svg|ico|webp))"/g, '$1="$2"');

  if (BASE) {
    saida = saida.replace(
      /content="\/og-banner\.png"/g,
      `content="${BASE}/og-banner.png"`
    );
  }

  // O 404 já nasce noindex; repetir a meta não quebra nada, mas deixa o
  // HTML dizendo duas vezes a mesma coisa.
  if (!saida.includes('name="robots"')) {
    saida = saida.replace('<head>', '<head>\n<meta name="robots" content="noindex">');
  }

  return saida.replace('</body>', `${AQUECIMENTO}</body>`);
}

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

for (const nome of readdirSync(ORIGEM)) {
  if (NAO_COPIAR.has(nome)) continue;
  const origem = join(ORIGEM, nome);
  const destino = join(DESTINO, nome);
  if (nome.endsWith('.html')) {
    writeFileSync(destino, reescrever(readFileSync(origem, 'utf8')));
  } else {
    cpSync(origem, destino);
  }
}

// A landing é a raiz do site.
writeFileSync(join(DESTINO, 'index.html'), reescrever(readFileSync(join(ORIGEM, 'landing.html'), 'utf8')));

const gerados = readdirSync(DESTINO);
console.log(`landing-dist: ${gerados.length} arquivos`);
console.log(gerados.join(', '));

// Falha alto: publicar uma landing sem a logo ou sem a página de
// privacidade é pior do que não publicar.
for (const obrigatorio of ['index.html', 'privacidade.html', 'termos.html', 'logo-lp.png', 'og-banner.png']) {
  if (!gerados.includes(obrigatorio)) {
    console.error(`FALTOU: ${obrigatorio}`);
    process.exit(1);
  }
}
