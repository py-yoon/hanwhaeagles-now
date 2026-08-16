// HANWHA EAGLES NOW - PWA 설치 유도 스크립트
// 각 HTML 페이지의 </body> 직전에 아래처럼 로드하세요:
//   <script src="/pwa-install.js" defer></script>

// 1) 서비스워커 등록
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW 등록 실패:", err);
    });
  });
}

// 2) Android / Chrome 계열: "홈 화면에 추가" 버튼
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.style.display = "inline-flex";
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("pwa-install-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.style.display = "none";
    });
  }
});

window.addEventListener("appinstalled", () => {
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.style.display = "none";
  deferredPrompt = null;
});

// 3) iOS Safari: beforeinstallprompt 미지원이라 수동 안내 배너 필요
(function iosInstallBanner() {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isStandalone = window.navigator.standalone === true;
  const dismissed = localStorage.getItem("heagles-ios-banner-dismissed");

  if (isIos && !isStandalone && !dismissed) {
    document.addEventListener("DOMContentLoaded", () => {
      const banner = document.getElementById("ios-install-banner");
      if (banner) banner.style.display = "flex";
    });
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const dismissBtn = document.getElementById("ios-banner-dismiss");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      const banner = document.getElementById("ios-install-banner");
      if (banner) banner.style.display = "none";
      localStorage.setItem("heagles-ios-banner-dismissed", "1");
    });
  }
});
