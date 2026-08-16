// HANWHA EAGLES NOW - Service Worker
// 전략: network-first (온라인이면 항상 최신 데이터, 오프라인이면 캐시로 폴백)
// 확률/순위는 매일 갱신되는 데이터라 cache-first를 쓰면 옛날 숫자가 보일 수 있어서
// network-first로 구성했습니다.

const CACHE_NAME = "heagles-shell-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/players.html",
  "/games.html",
  "/fan-quiz.html",
  "/cheer.html",
  "/history.html",
  "/methodology.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // GET 요청만, 그리고 같은 origin(hanwhaeagles.kr)만 처리합니다. Google Fonts,
  // gtag.js, Supabase 댓글 API 같은 크로스오리진 요청은 그대로 네트워크로 흘려보내고
  // 캐시에 넣지 않습니다 — 이 서비스워커의 역할은 우리 페이지 자체의 오프라인 폴백이지,
  // 서드파티 응답을 대신 관리하는 게 아니기 때문입니다.
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공적으로 받아온 응답은 캐시에도 저장해둠 (다음 오프라인 대비)
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시(오프라인) 캐시에서 꺼내오기
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/index.html");
        });
      })
  );
});
