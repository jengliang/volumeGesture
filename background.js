const NATIVE_HOST = "com.volgesture.volumemonitor";
const RECONNECT_DELAY_MS = 3000;
const KEEPALIVE_ALARM = "volgesture_keepalive";

let port = null;

// --- Native host connection ---
function connectNativeHost() {
  if (port) return;
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST);
  } catch (e) {
    console.error("[VolumeGesture] Failed to connect native host:", e);
    scheduleReconnect();
    return;
  }

  port.onMessage.addListener((msg) => {
    if (msg.type === "gesture") {
      console.log("[VolumeGesture] Gesture detected:", msg.gesture);
      handleGesture(msg.gesture);
    } else if (msg.type === "status") {
      const hostVer = msg.version ? ` (native host ${msg.version})` : "";
      console.log("[VolumeGesture] Native host status:", msg.status + hostVer);
    } else if (msg.type === "error") {
      console.error("[VolumeGesture] Native host error:", msg.error);
    }
  });

  port.onDisconnect.addListener(() => {
    const err = chrome.runtime.lastError;
    console.warn("[VolumeGesture] Native host disconnected:",
      err ? err.message : "unknown reason");
    port = null;
    scheduleReconnect();
  });

  // Send current settings + whether to fire OS media keys (off on YouTube Shorts)
  chrome.storage.sync.get(
    { gestureWindowMs: 1000, feedScrollPercent: 80 },
    (items) => {
      if (!port) return;
      shouldSimulateMediaKeysForGestureContext().then((simulateMediaKeys) => {
        if (port) {
          port.postMessage({
            type: "config",
            gestureWindowMs: items.gestureWindowMs,
            simulateMediaKeys,
          });
        }
      });
    }
  );
}

function scheduleReconnect() {
  setTimeout(connectNativeHost, RECONNECT_DELAY_MS);
}

/** Same tab priority as handleGesture: audible tab, else active in last-focused window. */
async function shouldSimulateMediaKeysForGestureContext() {
  let tabs = await chrome.tabs.query({ audible: true });
  if (!tabs || tabs.length === 0) {
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  if (!tabs || tabs.length === 0) return true;
  const url = tabs[0].url || "";
  const isShorts =
    url.indexOf("youtube.com") !== -1 && url.indexOf("/shorts") !== -1;
  // Shorts: extension navigates in-page; skip OS media keys to avoid double advance.
  return !isShorts;
}

async function updateNativeSimulateMediaKeys() {
  if (!port) return;
  try {
    const simulateMediaKeys = await shouldSimulateMediaKeysForGestureContext();
    port.postMessage({ type: "config", simulateMediaKeys });
  } catch (e) {
    console.warn("[VolumeGesture] updateNativeSimulateMediaKeys:", e);
  }
}

async function handleGesture(gesture) {
  try {
    const items = await chrome.storage.sync.get({
      feedScrollPercent: 80,
    });
    const scrollPct = Math.min(100, Math.max(70, items.feedScrollPercent || 80));

    let tabs = await chrome.tabs.query({ audible: true });
    if (!tabs || tabs.length === 0) {
      tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    }
    if (!tabs || tabs.length === 0) return;

    for (const tab of tabs) {
      if (!tab.url) continue;
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) continue;

      const isShorts =
        tab.url.indexOf("youtube.com") !== -1 &&
        tab.url.indexOf("/shorts") !== -1;

      // YouTube Shorts is a vertical reel: OS media keys often don't map to next/prev
      // the way they do on watch pages. Run in MAIN world so key events reach YouTube.
      if (isShorts) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: navigateYouTubeShorts,
          args: [gesture],
        });
        continue;
      }

      var isYouTube = tab.url.indexOf("youtube.com") !== -1;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: navigateVideo,
        args: [gesture, isYouTube, scrollPct],
      });
    }
  } catch (e) {
    console.error("[VolumeGesture] executeScript failed:", e);
  }
}

// Injected into the page MAIN world — YouTube Shorts only
function navigateYouTubeShorts(gesture) {
  function showOverlay(g) {
    var overlay = document.getElementById("__vol_gesture_overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "__vol_gesture_overlay";
      overlay.style.cssText =
        "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);" +
        "background:rgba(0,0,0,0.78);color:#fff;font-family:'Segoe UI',system-ui,sans-serif;" +
        "font-size:22px;font-weight:600;padding:16px 32px;border-radius:12px;" +
        "z-index:2147483647;pointer-events:none;opacity:0;" +
        "transition:opacity 0.2s ease,transform 0.2s ease;text-align:center;" +
        "backdrop-filter:blur(6px);box-shadow:0 4px 24px rgba(0,0,0,0.3);";
      document.body.appendChild(overlay);
    }
    overlay.textContent = g === "next" ? "\u23ED Next Video" : "\u23EE Previous Video";
    overlay.style.opacity = "1";
    overlay.style.transform = "translate(-50%,-50%) scale(1)";
    clearTimeout(overlay._ht);
    overlay._ht = setTimeout(function () {
      overlay.style.opacity = "0";
      overlay.style.transform = "translate(-50%,-50%) scale(0.8)";
    }, 1500);
  }

  showOverlay(gesture);

  function clickNavButton(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return false;
    var btn = el.querySelector("button");
    if (btn) {
      btn.click();
      return true;
    }
    if (typeof el.click === "function") {
      el.click();
      return true;
    }
    return false;
  }

  if (gesture === "next") {
    if (clickNavButton("navigation-button-down")) return;
  } else {
    if (clickNavButton("navigation-button-up")) return;
  }

  var key = gesture === "next" ? "ArrowDown" : "ArrowUp";
  var keyCode = gesture === "next" ? 40 : 38;
  var init = {
    key: key,
    code: key,
    keyCode: keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  // Shorts listens for ArrowUp/ArrowDown (see in-page MediaSession hacks); avoid also
  // scrolling the viewport or we may advance twice.
  var sp = document.getElementById("shorts-player");
  if (sp) {
    sp.dispatchEvent(new KeyboardEvent("keydown", init));
    sp.dispatchEvent(new KeyboardEvent("keyup", init));
  }
  document.dispatchEvent(new KeyboardEvent("keydown", init));
  document.dispatchEvent(new KeyboardEvent("keyup", init));
}

// This function is injected into the tab
function navigateVideo(gesture, isYouTube, feedScrollPercent) {
  var scrollFrac = (typeof feedScrollPercent === "number" ? feedScrollPercent : 100) / 100;
  if (scrollFrac < 0.8) scrollFrac = 0.8;
  if (scrollFrac > 1) scrollFrac = 1;
  function showOverlay(g) {
    var overlay = document.getElementById("__vol_gesture_overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "__vol_gesture_overlay";
      overlay.style.cssText =
        "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);" +
        "background:rgba(0,0,0,0.78);color:#fff;font-family:'Segoe UI',system-ui,sans-serif;" +
        "font-size:22px;font-weight:600;padding:16px 32px;border-radius:12px;" +
        "z-index:2147483647;pointer-events:none;opacity:0;" +
        "transition:opacity 0.2s ease,transform 0.2s ease;text-align:center;" +
        "backdrop-filter:blur(6px);box-shadow:0 4px 24px rgba(0,0,0,0.3);";
      document.body.appendChild(overlay);
    }
    overlay.textContent = g === "next" ? "\u23ED Next Video" : "\u23EE Previous Video";
    overlay.style.opacity = "1";
    overlay.style.transform = "translate(-50%,-50%) scale(1)";
    clearTimeout(overlay._ht);
    overlay._ht = setTimeout(function () {
      overlay.style.opacity = "0";
      overlay.style.transform = "translate(-50%,-50%) scale(0.8)";
    }, 1500);
  }

  if (isYouTube) {
    showOverlay(gesture);
    return;
  }

  var host = window.location.hostname;

  if (host.indexOf("facebook.com") !== -1) {
    var nextLabels = ["Next", "Next video", "Next card", "Next reel"];
    var prevLabels = ["Previous", "Previous video", "Previous card", "Previous reel"];
    var labels = gesture === "next" ? nextLabels : prevLabels;

    for (var i = 0; i < labels.length; i++) {
      var btn = document.querySelector('[aria-label="' + labels[i] + '"]');
      if (btn) { btn.click(); showOverlay(gesture); return; }
    }

    var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
    if (videos.length > 0) {
      var bestIdx = 0, bestVis = -1;
      for (var v = 0; v < videos.length; v++) {
        var rect = videos[v].getBoundingClientRect();
        var visTop = Math.max(0, rect.top);
        var visBot = Math.min(window.innerHeight, rect.bottom);
        var vis = rect.height > 0 ? Math.max(0, visBot - visTop) / rect.height : 0;
        if (vis > bestVis) { bestVis = vis; bestIdx = v; }
      }
      var targetIdx = gesture === "next" ? bestIdx + 1 : bestIdx - 1;
      if (targetIdx >= 0 && targetIdx < videos.length) {
        var container = videos[targetIdx].parentElement;
        while (container && container !== document.body) {
          if (container.getBoundingClientRect().height >= window.innerHeight * 0.4) break;
          container = container.parentElement;
        }
        (container || videos[targetIdx]).scrollIntoView({ behavior: "smooth", block: "center" });
        showOverlay(gesture);
        return;
      }
    }
    showOverlay(gesture);
    return;
  }

  // MSN.com: scroll-to-play feed — scroll by one viewport to bring next/prev video into focus
  if (host.indexOf("msn.com") !== -1) {
    var scrollAmount = gesture === "next"
      ? window.innerHeight * scrollFrac
      : -window.innerHeight * scrollFrac;
    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
    showOverlay(gesture);
    return;
  }

  var genericLabels = gesture === "next"
    ? ["next", "skip", "forward", "Next video"]
    : ["previous", "prev", "back", "Previous video"];
  for (var g = 0; g < genericLabels.length; g++) {
    var gBtn =
      document.querySelector('[aria-label*="' + genericLabels[g] + '" i]') ||
      document.querySelector('button[title*="' + genericLabels[g] + '" i]');
    if (gBtn) { gBtn.click(); showOverlay(gesture); return; }
  }

  var allVids = Array.prototype.slice.call(document.querySelectorAll("video"));
  if (allVids.length > 1) {
    var bIdx = 0, bVis = -1;
    for (var j = 0; j < allVids.length; j++) {
      var r = allVids[j].getBoundingClientRect();
      var vt = Math.max(0, r.top), vb = Math.min(window.innerHeight, r.bottom);
      var vv = r.height > 0 ? Math.max(0, vb - vt) / r.height : 0;
      if (vv > bVis) { bVis = vv; bIdx = j; }
    }
    var tIdx = gesture === "next" ? bIdx + 1 : bIdx - 1;
    if (tIdx >= 0 && tIdx < allVids.length) {
      allVids[tIdx].scrollIntoView({ behavior: "smooth", block: "center" });
      showOverlay(gesture);
      return;
    }
  }

  // Fallback for any feed-style site: scroll by configured fraction of viewport
  var fallbackScroll = gesture === "next"
    ? window.innerHeight * scrollFrac
    : -window.innerHeight * scrollFrac;
  window.scrollBy({ top: fallbackScroll, behavior: "smooth" });
  showOverlay(gesture);
}

// Forward settings changes to native host
chrome.storage.onChanged.addListener((changes) => {
  if (changes.gestureWindowMs && port) {
    port.postMessage({
      type: "config",
      gestureWindowMs: changes.gestureWindowMs.newValue,
    });
  }
});

chrome.tabs.onActivated.addListener(() => {
  void updateNativeSimulateMediaKeys();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url) void updateNativeSimulateMediaKeys();
});
chrome.windows.onFocusChanged.addListener((winId) => {
  if (winId !== chrome.windows.WINDOW_ID_NONE) void updateNativeSimulateMediaKeys();
});

// Keep-alive: reconnect native host if needed
chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) {
    if (!port) {
      connectNativeHost();
    }
  }
});

// Start connection on extension load
connectNativeHost();
