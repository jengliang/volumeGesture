document.addEventListener("DOMContentLoaded", () => {
  const enabledEl = document.getElementById("enabled");
  const windowEl = document.getElementById("window");
  const windowValueEl = document.getElementById("windowValue");
  const statusEl = document.getElementById("status");

  chrome.storage.sync.get(
    { enabled: true, gestureWindowMs: 1000 },
    (items) => {
      enabledEl.checked = items.enabled;
      windowEl.value = items.gestureWindowMs;
      windowValueEl.textContent = items.gestureWindowMs;
    }
  );

  function save() {
    const settings = {
      enabled: enabledEl.checked,
      gestureWindowMs: parseInt(windowEl.value, 10),
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
});
