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

        <script dangerouslySetInnerHTML={{ __html: larguraDoRole }} />
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

  /* A exceção: a tela que pede largura (ver hooks/useLarguraAmpla) sai da
     moldura. Hoje é só a página do rolê, que é onde chega quem vem do Google
     pelo computador. 1024 é o mesmo corte do hook — abaixo disso ela
     continua de uma coluna, e abrir a moldura só esticaria o celular. */
  @media (min-width: 1024px) {
    html[data-largura="ampla"] #root {
      max-width: 1180px;
      border-left-color: transparent;
      border-right-color: transparent;
      background-color: #0A0A0A;
    }
  }

  /* Logado no computador: o app ocupa a janela inteira, com o menu lateral
     à esquerda e o conteúdo numa coluna central (components/desktop). Quem
     limita a largura passa a ser a coluna, não a moldura. Vem por último pra
     vencer a regra de cima, que tem a mesma especificidade. */
  @media (min-width: 1024px) {
    html[data-app="desktop"] #root {
      max-width: none;
      border-left: 0;
      border-right: 0;
      /* A mesma cor das telas (colors.surface). Com o preto mais fundo da
         moldura, a coluna central virava uma caixa desenhada no meio do
         monitor; o Instagram web é de uma cor só. Quem se destaca é o menu
         lateral, um tom abaixo e com a linha na borda. */
      background-color: #121212;
    }
  }
`;

/**
 * Abre a moldura antes de o React montar, na página do rolê.
 *
 * Sem isto quem chega pelo Google via a página nascer com 460 px e pular
 * pra largura cheia um instante depois, quando a tela monta e pede a
 * largura. O hook confirma e mantém depois; aqui é só a primeira pintura.
 */
const larguraDoRole = `
  if (window.innerWidth >= 1024 && /^\\/app\\/event\\//.test(window.location.pathname)) {
    document.documentElement.dataset.largura = 'ampla';
  }
  // Quem tem sessão guardada vai cair no modo desktop assim que o app
  // montar; abrir a moldura já aqui evita a página nascer com 460 px e
  // pular. Se a sessão estiver vencida, o app desfaz ao descobrir.
  try {
    if (window.innerWidth >= 1024 && window.localStorage.getItem('gearhead_session')) {
      document.documentElement.dataset.app = 'desktop';
    }
  } catch (e) {}
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
