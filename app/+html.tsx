/**
 * Casca HTML de todas as páginas web (convenção do expo-router).
 *
 * É aqui que o app vira PWA: manifest, cor de tema e o registro do service
 * worker. No celular este arquivo nem é lido — não existe HTML lá.
 */
import React from "react";
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover + o safe-area do CSS abaixo: sem isso o app
            instalado passa por baixo do notch e da barra de gestos. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        <title>Downpipe</title>
        <meta
          name="description"
          content="Rede social automotiva: sua garagem, os rolês e quem vai estar lá."
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#131313" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* iOS ignora o manifest: é por estas duas que o atalho na tela
            inicial abre sem a barra do Safari. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Downpipe" />

        {/* Desliga o scroll do body: quem rola é o ScrollView de dentro. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: estilos }} />

        <script dangerouslySetInnerHTML={{ __html: diagnostico }} />
        <script dangerouslySetInnerHTML={{ __html: capturarInstalacao }} />
        <script dangerouslySetInnerHTML={{ __html: registrarServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// O fundo tem de ser pintado antes do JS avaliar: são 4 MB de bundle, e sem
// isto a primeira coisa que a pessoa vê é uma tela branca piscando.
const estilos = `
  html, body, #root { background-color: #131313; }
  body { overscroll-behavior-y: none; }

  /* Altura pela área realmente visível, não pelo viewport de layout.
     O Expo deixa html/body/#root em height:100%, que resolve contra um
     viewport mais alto que a tela. O dvh acompanha a área visível. */
  @supports (height: 100dvh) {
    html, body, #root { height: 100dvh; }
  }

  /* Instalado na tela inicial não existe barra de navegador para recolher,
     então a área visível É a tela inteira: dvh e lvh deveriam dar o mesmo
     número. No iPhone 13 não dão. O iOS devolve dvh = tela menos a
     safe-area do topo (797 de 844) mesmo posicionando a página no y=0 —
     ela começa embaixo do relógio e termina 47px antes do fim da tela.
     Essa é a faixa preta embaixo da barra de abas.

     Em standalone o lvh é a medida certa por definição, já que não existe
     interface do navegador para retrair. Onde o iOS acerta, os dois valores
     são iguais e esta regra não muda nada. */
  @media (display-mode: standalone) {
    @supports (height: 100lvh) {
      html, body, #root { height: 100lvh; }
    }
  }

  /* Nada de padding de safe-area aqui.
     O app já reserva o espaço do notch e da barra de gestos por conta
     própria (useSafeAreaInsets no cabeçalho e na barra de abas), e o
     react-native-safe-area-context lê os mesmos env() no navegador. Somar
     de novo no body aplicava tudo duas vezes: sobrava um vão no topo e uma
     faixa preta embaixo da barra de navegação. */

  /* No computador o app não estica.
     Sem isto o layout de celular ocupa 1900px de largura e a linha de texto
     fica impossível de ler. Limitar a um formato de telefone é o que os
     apps que rodam nos dois lugares fazem — e mantém o mesmo layout que foi
     desenhado, em vez de inventar um segundo. */
  @media (min-width: 860px) {
    html, body { background-color: #0A0A0A; }
    #root {
      max-width: 460px;
      margin: 0 auto;
      min-height: 100vh;
      background-color: #131313;
      border-left: 1px solid #242424;
      border-right: 1px solid #242424;
      /* O conteúdo interno é posicionado em relação a este bloco, então a
         barra de abas acompanha a largura em vez de grudar na janela. */
      position: relative;
      overflow: hidden;
    }
  }
`;

/**
 * O beforeinstallprompt dispara antes de o React montar — se ninguém estiver
 * escutando neste instante, o evento se perde e o botão "Instalar" nunca
 * aparece. Por isso a captura mora aqui, no HTML, e o componente lê depois.
 */
const capturarInstalacao = `
  window.__promptInstalar = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__promptInstalar = e;
    window.dispatchEvent(new Event('downpipe:instalavel'));
  });
  window.addEventListener('appinstalled', function () {
    window.__promptInstalar = null;
    window.dispatchEvent(new Event('downpipe:instalado'));
  });
`;

/**
 * Painel de medidas, ligado só com ?diag=1 no endereço.
 *
 * Existe porque a faixa embaixo da barra de navegação só aparece em um
 * aparelho, e depois de dois consertos errados a única saída honesta é ler
 * os números de dentro dele em vez de continuar supondo.
 *
 * Some sozinho pra quem não pedir. Remover quando a causa estiver achada.
 */
const diagnostico = `
(function () {
  function medir() {
    function inset(lado) {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;' + lado + ':0;height:env(safe-area-inset-' + lado + ');width:1px;';
      document.body.appendChild(d);
      var v = d.getBoundingClientRect().height;
      d.remove();
      return v;
    }
    function unidade(u) {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;height:100' + u + ';width:1px;visibility:hidden;';
      document.body.appendChild(d);
      var v = Math.round(d.getBoundingClientRect().height);
      d.remove();
      return v;
    }

    var raiz = document.getElementById('root');
    var vv = window.visualViewport;

    // A barra de abas, achada pelo que ela tem de único: fundo #0a0a0a,
    // largura cheia e exatamente cinco ícones. As duas tentativas anteriores
    // — "o bloco mais baixo" — pegavam o rodapé de um post do feed rolado.
    var barra = null;
    var todos = document.querySelectorAll('div');
    for (var i = 0; i < todos.length; i++) {
      var e = todos[i];
      if (e.querySelectorAll('svg').length !== 5) continue;
      var r = e.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.9) continue;
      if (r.height < 20 || r.height > 200) continue;
      barra = e;
    }
    var rb = barra ? barra.getBoundingClientRect() : null;

    // O que existe embaixo da barra, se existir alguma coisa.
    var abaixo = 'n/d';
    if (rb) {
      var alvo = document.elementFromPoint(window.innerWidth / 2, Math.min(rb.bottom + 12, window.innerHeight - 1));
      abaixo = alvo ? (alvo.tagName.toLowerCase() + ' ' + getComputedStyle(alvo).backgroundColor) : 'nada';
    }

    return [
      ['standalone', (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? 'SIM' : 'nao'],
      ['innerHeight', window.innerHeight],
      ['visualViewport', vv ? Math.round(vv.height) : 'n/d'],
      ['screen.height', window.screen.height],
      ['100svh', unidade('svh')],
      ['100dvh', unidade('dvh')],
      ['100lvh', unidade('lvh')],
      ['#root altura', raiz ? Math.round(raiz.getBoundingClientRect().height) : 'n/d'],
      ['#root css', raiz ? getComputedStyle(raiz).height : 'n/d'],
      ['inset topo', inset('top')],
      ['inset baixo', inset('bottom')],
      ['barra topo', rb ? Math.round(rb.top) : 'n/d'],
      ['barra padBot', barra ? getComputedStyle(barra).paddingBottom : 'n/d'],
      ['barra fim', rb ? Math.round(rb.bottom) : 'n/d'],
      ['sobra abaixo', rb ? Math.round(window.innerHeight - rb.bottom) : 'n/d'],
      ['embaixo da barra', abaixo],
      ['body altura', Math.round(document.body.getBoundingClientRect().height)]
    ];
  }

  function mostrar() {
    if (document.getElementById('painelDiag')) return;
    var linhas = medir();
    var p = document.createElement('div');
    p.id = 'painelDiag';
    p.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#000;color:#0f0;' +
      'font:11px ui-monospace,Menlo,monospace;padding:10px 12px;line-height:1.5;border-bottom:2px solid #0f0;';
    var html = '<b style="color:#fff">MEDIDAS — mande print</b><br>';
    for (var j = 0; j < linhas.length; j++) html += linhas[j][0] + ': ' + linhas[j][1] + '<br>';
    html += '<span style="color:#888">toque aqui para fechar</span>';
    p.innerHTML = html;
    p.onclick = function () { p.remove(); };
    document.body.appendChild(p);
  }

  // Botão visível, e não gesto.
  //
  // Dentro do PWA instalado não dá pra digitar endereço (o ?diag=1 não
  // sobrevive ao atalho) e o toque no topo da tela não chega até a página.
  // Um botão resolve os dois. É temporário e sai junto com este bloco.
  function botao() {
    if (document.getElementById('botaoDiag')) return;
    var b = document.createElement('button');
    b.id = 'botaoDiag';
    b.textContent = 'medir';
    b.style.cssText =
      'position:fixed;left:10px;bottom:96px;z-index:99998;' +
      'background:#0f0;color:#000;border:none;border-radius:14px;' +
      'font:700 11px ui-monospace,Menlo,monospace;padding:7px 12px;' +
      'opacity:.85;box-shadow:0 2px 10px rgba(0,0,0,.6);cursor:pointer;';
    b.onclick = function (e) { e.stopPropagation(); mostrar(); };
    document.body.appendChild(b);
  }

  if (document.readyState === 'complete') botao();
  else window.addEventListener('load', botao);

  // Continua valendo no navegador, pra dar pra comparar com o standalone.
  if (location.search.indexOf('diag=1') !== -1) {
    window.addEventListener('load', function () { setTimeout(mostrar, 1200); });
  }
})();
`;

const registrarServiceWorker = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {
        // Sem service worker o app funciona igual, só não instala nem
        // reabre rápido. Não é motivo pra travar nada.
      });
    });
  }
`;
