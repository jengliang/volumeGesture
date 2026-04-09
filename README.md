# Volume Gesture — Video Navigator

Navigate between videos using your hardware volume buttons — Bluetooth headset or any headset with volume control. Works even when the browser is minimized.

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
4. Note the **Extension ID** shown under the extension name

### Step 2: Install the Native Host

The native host monitors your system volume and detects gestures from hardware buttons. This is required for the extension to work.

1. Download **native-host-v4.0.0.zip** from the [Releases page](https://github.com/jengliang/volumnGesture/releases)
2. Extract the ZIP to a permanent location (e.g. `C:\VolumeGesture\`)
3. Run `install.bat`
4. When prompted for the extension ID, either:
   - Press **Enter** to accept the default (if installed from the store)
   - Paste your extension ID (if sideloading)
5. Restart Edge

### Verify

Open Edge DevTools (F12) on any page. In the **Console** tab, look for:
```
[VolumeGesture] Native host status: connected
```

## Settings

Click the Volume Gesture icon in the toolbar to:

- **Enable/disable** gesture detection
- **Adjust gesture window** — the maximum time between volume changes (default: 1000 ms)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Console shows "Native host disconnected" | Check `debug.log` in the native host folder for errors |
| Overlay shows but video doesn't change | Site navigation selectors may have changed. [File an issue.](https://github.com/jengliang/volumnGesture/issues) |
| False triggers from repeated presses | Increase the gesture window in settings, or update to the latest version |
| Gestures stop after switching audio device | The native host re-acquires the device every 5 seconds. Wait a moment and retry. |

## Limitations

- Some headsets have device-level volume controls that do not affect the OS volume. Since Volume Gesture monitors the system volume, these headsets will not trigger gestures. Look for headsets whose volume buttons adjust the Windows system volume.
- When the browser is minimized, Facebook does not process JavaScript events. Video navigation actions will queue up and execute all at once when the browser is restored. To use volume gestures with Facebook, keep the browser window on the desktop — you can switch focus to other apps, just don't minimize it. YouTube does not have this limitation.

## Uninstall

1. Remove the extension from `edge://extensions/`
2. Run `uninstall.bat` in the native host folder to remove the registry entry

## Building from Source

### Package the Extension (for store submission)

```
python build.py
```

### Build Standalone Native Host

On a Windows machine with Python 3.8+:

```
cd native_host
build_exe.bat
```

Creates `volume_monitor.exe` via PyInstaller.

## Privacy

Volume Gesture collects no user data. See [PRIVACY.md](PRIVACY.md) for details.

## License

MIT
