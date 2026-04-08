(function () {
  "use strict";

  const DEFAULT_GESTURE_WINDOW_MS = 1000;
  const NOTIFICATION_DURATION_MS = 1500;

  let enabled = true;
  let gestureWindowMs = DEFAULT_GESTURE_WINDOW_MS;

  // --- Gesture state per video element ---
  const gestureState = new WeakMap();

  function getState(video) {
    if (!gestureState.has(video)) {
      gestureState.set(video, {
        firstChange: null,   // { direction: "up"|"down", time: number, origVolume: number }
        lastVolume: video.volume,
        suppressing: false,
      });
    }
    return gestureState.get(video);
  }

  // --- Volume change handler ---
  function onVolumeChange(event) {
    if (!enabled) return;
    const video = event.target;
    const state = getState(video);

    if (state.suppressing) return;

    const currentVolume = video.volume;
    const delta = currentVolume - state.lastVolume;
    if (Math.abs(delta) < 0.001) return;

    const direction = delta > 0 ? "up" : "down";
    const now = performance.now();

    if (!state.firstChange) {
      state.firstChange = {
        direction,
        time: now,
        origVolume: state.lastVolume,
      };
      state.lastVolume = currentVolume;
      return;
    }

    const elapsed = now - state.firstChange.time;

    if (elapsed <= gestureWindowMs && direction !== state.firstChange.direction) {
      const gesture =
        state.firstChange.direction === "up" ? "next" : "previous";

      restoreVolume(video, state.firstChange.origVolume, state);
      triggerNavigation(gesture);

      state.firstChange = null;
    } else {
      state.firstChange = {
        direction,
        time: now,
        origVolume: state.lastVolume,
      };
    }

    state.lastVolume = currentVolume;
  }

  function restoreVolume(video, volume, state) {
    state.suppressing = true;
    video.volume = volume;
    state.lastVolume = volume;
    requestAnimationFrame(() => {
      state.suppressing = false;
    });
  }

  // --- Navigation logic ---
  function triggerNavigation(gesture) {
    const host = window.location.hostname;

    if (host.includes("youtube.com")) {
      navigateYouTube(gesture);
    } else if (host.includes("facebook.com")) {
      navigateFacebook(gesture);
    } else {
      navigateGeneric(gesture);
    }

    showNotification(gesture);
  }

  function navigateYouTube(gesture) {
    if (gesture === "next") {
      const nextBtn = document.querySelector(".ytp-next-button");
      if (nextBtn) {
        nextBtn.click();
        return;
      }
      simulateKey("N", { shiftKey: true });
    } else {
      // YouTube has no dedicated "previous" button in all contexts;
      // Shift+P works in playlists. For single videos, go back in history.
      const played = simulateKey("P", { shiftKey: true });
      // Fallback: if watching a single (non-playlist) video, try browser back
      const params = new URLSearchParams(window.location.search);
      if (!params.has("list")) {
        setTimeout(() => history.back(), 200);
      }
    }
  }

  function navigateFacebook(gesture) {
    // Strategy 1: Try clicking navigation buttons by aria-label
    const nextLabels = ["Next", "Next video", "Next card", "Next reel"];
    const prevLabels = ["Previous", "Previous video", "Previous card", "Previous reel"];
    const labels = gesture === "next" ? nextLabels : prevLabels;

    for (const label of labels) {
      const btn = document.querySelector('[aria-label="' + label + '"]');
      if (btn) {
        btn.click();
        return;
      }
    }

    // Strategy 2: Find all videos, locate the currently visible one,
    // and scroll the next/previous video into view.
    const videos = Array.from(document.querySelectorAll("video"));
    if (videos.length === 0) return;

    const visibleIdx = findMostVisibleVideoIndex(videos);
    const targetIdx = gesture === "next" ? visibleIdx + 1 : visibleIdx - 1;

    if (targetIdx >= 0 && targetIdx < videos.length) {
      scrollVideoIntoView(videos[targetIdx]);
      return;
    }

    // Strategy 3: Scroll the nearest scrollable ancestor of the current video
    if (visibleIdx >= 0 && visibleIdx < videos.length) {
      const scrollContainer = findScrollContainer(videos[visibleIdx]);
      const scrollAmount = gesture === "next"
        ? scrollContainer.clientHeight * 0.85
        : -scrollContainer.clientHeight * 0.85;
      scrollContainer.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }
  }

  function findMostVisibleVideoIndex(videos) {
    let bestIdx = 0;
    let bestVisibility = -1;

    for (let i = 0; i < videos.length; i++) {
      const rect = videos[i].getBoundingClientRect();
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(window.innerHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibility = rect.height > 0 ? visibleHeight / rect.height : 0;

      if (visibility > bestVisibility) {
        bestVisibility = visibility;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function scrollVideoIntoView(video) {
    // Walk up to find the post/card container (a reasonably-sized ancestor)
    let container = video.parentElement;
    while (container && container !== document.body) {
      const rect = container.getBoundingClientRect();
      if (rect.height >= window.innerHeight * 0.4) break;
      container = container.parentElement;
    }
    (container || video).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function findScrollContainer(element) {
    let el = element.parentElement;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return document.documentElement;
  }

  function navigateGeneric(gesture) {
    // Try common button patterns first
    const labels = gesture === "next"
      ? ["next", "skip", "forward", "Next video"]
      : ["previous", "prev", "back", "Previous video"];

    for (const label of labels) {
      const btn =
        document.querySelector('[aria-label*="' + label + '" i]') ||
        document.querySelector('button[title*="' + label + '" i]');
      if (btn) {
        btn.click();
        return;
      }
    }

    // Fallback: scroll to next/previous video on the page
    const videos = Array.from(document.querySelectorAll("video"));
    if (videos.length > 1) {
      const visibleIdx = findMostVisibleVideoIndex(videos);
      const targetIdx = gesture === "next" ? visibleIdx + 1 : visibleIdx - 1;
      if (targetIdx >= 0 && targetIdx < videos.length) {
        scrollVideoIntoView(videos[targetIdx]);
        return;
      }
    }
  }

  function simulateKey(key, opts = {}) {
    const eventInit = {
      key,
      code: `Key${key.toUpperCase()}`,
      keyCode: key.toUpperCase().charCodeAt(0),
      which: key.toUpperCase().charCodeAt(0),
      bubbles: true,
      cancelable: true,
      ...opts,
    };
    document.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    document.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  }

  // --- On-screen notification ---
  function showNotification(gesture) {
    let overlay = document.getElementById("__vol_gesture_overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "__vol_gesture_overlay";
      Object.assign(overlay.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) scale(0.8)",
        background: "rgba(0, 0, 0, 0.78)",
        color: "#fff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontSize: "22px",
        fontWeight: "600",
        padding: "16px 32px",
        borderRadius: "12px",
        zIndex: "2147483647",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        textAlign: "center",
        backdropFilter: "blur(6px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      });
      document.body.appendChild(overlay);
    }

    overlay.textContent = gesture === "next" ? "⏭ Next Video" : "⏮ Previous Video";
    overlay.style.opacity = "1";
    overlay.style.transform = "translate(-50%, -50%) scale(1)";

    clearTimeout(overlay._hideTimer);
    overlay._hideTimer = setTimeout(() => {
      overlay.style.opacity = "0";
      overlay.style.transform = "translate(-50%, -50%) scale(0.8)";
    }, NOTIFICATION_DURATION_MS);
  }

  // --- Attach listeners to video elements ---
  function attachToVideo(video) {
    if (video.__volGestureAttached) return;
    video.__volGestureAttached = true;
    video.addEventListener("volumechange", onVolumeChange);
  }

  function scanForVideos() {
    document.querySelectorAll("video").forEach(attachToVideo);
  }

  // Watch for dynamically added video elements (YouTube, Facebook SPAs)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.tagName === "VIDEO") {
          attachToVideo(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll("video").forEach(attachToVideo);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scanForVideos();

  // --- Load settings from storage ---
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.sync.get(
      { enabled: true, gestureWindowMs: DEFAULT_GESTURE_WINDOW_MS },
      (items) => {
        enabled = items.enabled;
        gestureWindowMs = items.gestureWindowMs;
      }
    );

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) enabled = changes.enabled.newValue;
      if (changes.gestureWindowMs)
        gestureWindowMs = changes.gestureWindowMs.newValue;
    });
  }
})();
