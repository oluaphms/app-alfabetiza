// ============================================================
// sw.js — Service Worker da Ilha das Letrinhas e Numerinhos
//
// Estratégia para app SSR (TanStack Start + Vite):
//
//  INSTALL:  pré-cacheia apenas o manifest e ícones (URLs fixas conhecidas).
//            NÃO tenta cachear "/" porque é SSR e pode falhar sem rede.
//
//  ACTIVATE: remove caches de versões anteriores.
//
//  FETCH:    cache-first para assets com hash (JS, CSS, fontes, imagens)
//              → são imutáveis; uma vez no cache, nunca expiram
//            stale-while-revalidate para "/" e rotas de navegação
//              → serve o cache imediatamente, atualiza em background
//            passthrough para tudo mais (POST, APIs externas, etc.)
//
// Como o offline funciona na prática:
//  1ª visita (online):  browser baixa tudo → SW interceta e salva no cache
//  2ª visita (offline): SW serve JS/CSS do cache; "/" vem do cache também
//  Atualização de código: mude CACHE_VERSION → SW limpa o cache antigo
// ============================================================

const CACHE_VERSION = "v2";
const CACHE_STATIC  = `ilha-static-${CACHE_VERSION}`;   // assets com hash
const CACHE_PAGES   = `ilha-pages-${CACHE_VERSION}`;    // HTML das rotas

// URLs de instalação: apenas arquivos com caminhos fixos e previsíveis
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/res/mipmap-xxxhdpi/ic_launcher.png",
  "/play_store_512.png",
];

// ── Install ──────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) =>
        // ignoreVary + individual adds para não falhar se um asset não existir
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  const validCaches = new Set([CACHE_STATIC, CACHE_PAGES]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só intercepta GET do mesmo origin
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // ── Assets imutáveis com hash no nome → cache-first permanente ──────────
  // TanStack Start / Vite coloca assets em /_build/ ou /_assets/
  const isImmutableAsset =
    /^\/_build\//.test(url.pathname) ||
    /^\/_assets\//.test(url.pathname) ||
    /^\/assets\//.test(url.pathname) ||
    /\.(woff2?|ttf|otf)(\?|$)/.test(url.pathname);

  if (isImmutableAsset) {
    event.respondWith(cacheFirstImmutable(request));
    return;
  }

  // ── Imagens e arquivos estáticos com nome fixo → cache-first com revalidação ──
  const isStaticFile =
    /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?|$)/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/res/") ||
    /\.(js|css)(\?|$)/.test(url.pathname);

  if (isStaticFile) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // ── Rotas de navegação (HTML gerado pelo SSR) → stale-while-revalidate ──
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request, CACHE_PAGES));
    return;
  }

  // ── Tudo mais: passa direto para a rede ─────────────────────────────────
});

// ── Estratégias ───────────────────────────────────────────────

/**
 * Cache-first imutável: se está no cache, retorna sem nem verificar a rede.
 * Assets com hash nunca mudam — são seguros para cache permanente.
 */
async function cacheFirstImmutable(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Asset offline e não encontrado no cache.", {
      status: 504,
      statusText: "Gateway Timeout",
    });
  }
}

/**
 * Stale-while-revalidate: retorna o cache imediatamente (se existir)
 * e atualiza o cache em background com a resposta da rede.
 * Se offline e não há cache, retorna 503.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Atualiza em background, retorna o cache agora
    event.waitUntil(networkFetch);
    return cached;
  }

  // Sem cache: espera a rede
  const response = await networkFetch;
  if (response) return response;

  // Sem rede e sem cache: fallback para a página inicial cacheada
  const shell = await caches.match("/", { cacheName: CACHE_PAGES });
  if (shell) return shell;

  return new Response("Você está offline.", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
