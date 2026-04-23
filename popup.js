document.addEventListener("DOMContentLoaded", () => {
  const verEl = document.getElementById("version");
  if (verEl) {
    const v = chrome.runtime.getManifest().version;
    verEl.textContent = `v${v}`;
  }

  const enabledEl = document.getElementById("enabled");
  const windowEl = document.getElementById("window");
  const windowValueEl = document.getElementById("windowValue");
  const scrollPctEl = document.getElementById("scrollPct");
  const scrollPctValueEl = document.getElementById("scrollPctValue");
  const statusEl = document.getElementById("status");

  chrome.storage.sync.get(
    { enabled: true, gestureWindowMs: 1000, feedScrollPercent: 80 },
    (items) => {
      enabledEl.checked = items.enabled;
      let gwm = items.gestureWindowMs;
      if (gwm < 1000) gwm = 1000;
      if (gwm > 4000) gwm = 4000;
      windowEl.value = gwm;
      windowValueEl.textContent = gwm;
      let pct = items.feedScrollPercent;
      if (pct < 70) pct = 70;
      if (pct > 100) pct = 100;
      scrollPctEl.value = pct;
      scrollPctValueEl.textContent = pct;
    }
  );

  function save() {
    const settings = {
      enabled: enabledEl.checked,
      gestureWindowMs: parseInt(windowEl.value, 10),
      feedScrollPercent: parseInt(scrollPctEl.value, 10),
    };
    chrome.storage.sync.set(settings, () => {
      statusEl.textContent = "Settings saved";
      statusEl.style.opacity = "1";
      setTimeout(() => {
        statusEl.style.opacity = "0";
      }, 1500);
    });
  }

  enabledEl.addEventListener("change", save);

  windowEl.addEventListener("input", () => {
    windowValueEl.textContent = windowEl.value;
  });
  windowEl.addEventListener("change", save);

  scrollPctEl.addEventListener("input", () => {
    scrollPctValueEl.textContent = scrollPctEl.value;
  });
  scrollPctEl.addEventListener("change", save);
});
