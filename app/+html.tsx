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
  @supports (padding: env(safe-area-inset-top)) {
    body { padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom); }
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
