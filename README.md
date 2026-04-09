# Volume Gesture — Video Navigator

Navigate between videos using quick volume button sequences. Works with Bluetooth headsets, keyboard volume keys, and in-player volume sliders — even when the browser is minimized.

## Gestures

| Action | Gesture |
|--------|---------|
| **Next video** | Volume Up then Down (within 1 second) |
| **Previous video** | Volume Down then Up (within 1 second) |

A translucent overlay briefly confirms each detected gesture.

## Supported Sites

- **YouTube** — built-in next/previous navigation
- **Facebook** — scrolls between videos in feed, Watch, and Reels
- **Other sites** — finds next/previous buttons or scrolls between video elements

## Install

### Step 1: Install the Extension

Install from the [Microsoft Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/) (search "Volume Gesture").

Or sideload for development:
1. Go to `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

### Step 2: Install the Native Host (for Bluetooth / system volume)

The browser extension handles in-player volume slider gestures out of the box. To use **hardware volume buttons** (Bluetooth headset, keyboard media keys, system tray slider), install the companion native host.

#### Option A: Standalone Installer (no Python needed)

1. Download the latest `native-host` release from the [Releases page](https://github.com/jengliang/volumnGesture/releases)
2. Extract the ZIP
3. Run `install.bat`
4. When prompted, press Enter to accept the default extension ID (or paste your own if sideloading)
5. Restart Edge

#### Option B: From Source (requires Python 3.8+)

1. Open a terminal in the `native_host/` folder
2. Run:
   ```
   install.bat
   ```
   This will:
   - Verify Python is installed
   - Install dependencies (`pycaw`, `comtypes`)
   - Write the native messaging manifest
   - Register with Edge

### Verify

1. Open Edge DevTools (F12) on any page
2. In the **Console** tab, look for:
   ```
   [VolumeGesture] Native host status: connected
   ```

## Settings

Click the Volume Gesture icon in the toolbar to:

- **Enable/disable** gesture detection
- **Adjust gesture window** — the maximum time between volume changes (default: 1000 ms)

## How It Works

```
┌──────────────┐     ┌────────────────┐     ┌─────────────┐
│  Bluetooth /  │     │  Native Host   │     │   Browser    │
│  Volume Keys  │────▶│  (Python/exe)  │────▶│  Extension   │
│               │     │  Polls volume  │     │  background  │
└──────────────┘     │  Detects       │     │  .js         │
                     │  gestures      │     └──────┬──────┘
                     │  Simulates     │            │
                     │  media keys    │     executeScript
                     └────────────────┘            │
                                              ┌────▼──────┐
┌──────────────┐     ┌────────────────┐      │  Content   │
│  In-player   │     │  content.js    │      │  Page      │
│  Volume      │────▶│  volumechange  │      │  Navigate  │
│  Slider      │     │  event         │──────▶  + Overlay  │
└──────────────┘     └────────────────┘      └───────────┘
```

- **Hardware volume** (Bluetooth, keyboard): The native host polls the Windows audio API at ~30 ms intervals, detects up-down or down-up patterns, and simulates OS media keys. YouTube responds to media keys natively (even when minimized). For other sites, the extension injects navigation logic via `executeScript`.
- **In-player slider**: The content script listens for `volumechange` events on `<video>` elements and applies the same gesture detection.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Gestures work with slider but not headset | Native host not installed — see Step 2 above |
| Console shows "Native host disconnected" | Check `native_host/debug.log` for errors. Ensure Python is in PATH. |
| Overlay shows but video doesn't change | Site navigation selectors may have changed. [File an issue.](https://github.com/jengliang/volumnGesture/issues) |
| False triggers from repeated presses | Increase the gesture window in settings, or update to the latest version |
| Gestures stop after switching audio device | The native host re-acquires the device every 5 seconds. Wait a moment and retry. |

## Uninstall

1. Remove the extension from `edge://extensions/`
2. Run `native_host/uninstall.bat` to remove the registry entry

## Building from Source

### Package the Extension (for store submission)

```
python build.py
```

Creates `volumnGesture-<version>.zip` containing only the extension files.

### Build Standalone Native Host (no Python dependency)

On a Windows machine with Python:

```
cd native_host
build_exe.bat
```

Creates `volume_monitor.exe` via PyInstaller. Distribute this along with `install.bat` and `uninstall.bat`.

## Privacy

Volume Gesture collects no user data. See [PRIVACY.md](PRIVACY.md) for details.

## License

MIT
