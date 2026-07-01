// ============================================================
// sw.js — Service Worker da Ilha das Letrinhas e Numerinhos
//
// Estratégia:
//  - INSTALL:  pré-cacheia a shell mínima (/, CSS, JS principal)
//  - ACTIVATE: remove caches de versões antigas
//  - FETCH:    cache-first para assets estáticos com hash no nome;
//              network-first com fallback para o restante (rotas SSR)
//
// O CACHE_VERSION deve ser atualizado a cada deploy para invalidar
// o cache antigo e forçar o SW a baixar os novos assets.
// ============================================================

const CACHE_VERSION = "v1";
const CACHE_NAME = `ilha-letrinhas-${CACHE_VERSION}`;

// Assets mínimos para a shell funcionar offline
// O Vite injeta hashes nos nomes — o SW captura tudo via fetch handler
const PRECACHE_URLS = ["/"];

// ── Install ──────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // ativa imediatamente sem esperar tab fechar
  );
});

// ── Activate ─────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // controla todas as abas imediatamente
  );
});

// ── Fetch ─────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e de outros origens (ex: fontes externas)
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Assets com hash no nome (JS, CSS, imagens do Vite) → cache-first
  // Padrão: /_assets/... ou /assets/... com extensão estática
  const isHashedAsset =
    /\/_assets\//.test(url.pathname) ||
    /\/assets\//.test(url.pathname) ||
    /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp)(\?|$)/.test(
      url.pathname
    );

  if (isHashedAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navegação e rotas SSR → network-first com fallback para cache
  event.respondWith(networkFirst(request));
});

// ── Estratégias de cache ──────────────────────────────────────

/**
 * Cache-first: retorna do cache se disponível; caso contrário busca na rede
 * e armazena a resposta para próximas requisições.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sem rede e sem cache: retorna 504
    return new Response("Offline — asset não encontrado no cache.", {
      status: 504,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Network-first: tenta a rede; em caso de falha retorna o cache.
 * Se nem cache existir, retorna a shell "/" como fallback.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback final: retorna a shell do app (SPA offline)
    const shell = await caches.match("/");
    if (shell) return shell;

    return new Response("Você está offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
