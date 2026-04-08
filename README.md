# Volume Gesture - Video Navigator

A Microsoft Edge (Chromium) browser extension that lets you navigate between videos using rapid volume adjustments — including from a **Bluetooth headset**.

## How It Works

| Gesture | Action |
|---------|--------|
| **Volume Up → Down** (within 1 second) | Play **next** video |
| **Volume Down → Up** (within 1 second) | Play **previous** video |

Works with:
- **In-player volume slider** (drag up→down or down→up quickly)
- **Bluetooth headset volume buttons** (requires native host — see setup below)
- **Keyboard/system volume keys** (requires native host)

## Supported Sites

- **YouTube** — uses built-in next/previous navigation
- **Facebook** — scrolls between videos in feed / Watch / Reels
- **Other sites** — finds next/previous buttons or scrolls between video elements

## Installation

### Step 1: Load the Extension

1. Open **Microsoft Edge**
2. Go to `edge://extensions/`
3. Enable **Developer mode** (toggle in the bottom-left)
4. Click **Load unpacked**
5. Select the `volumnGesture` folder
6. Note the **Extension ID** shown under the extension name (you'll need it in Step 2)

### Step 2: Install Native Volume Monitor (for Bluetooth/system volume)

This step is only needed if you want to use Bluetooth headset buttons or system volume keys. Skip this if you only use the in-player volume slider.

**Prerequisites:** Python 3.6+ installed and in your PATH.

1. Open a **Command Prompt** (or PowerShell)
2. Install Python dependencies:
   ```
   cd volumnGesture\native_host
   pip install -r requirements.txt
   ```
3. Run the installer (registers the native messaging host with Edge):
   ```
   install.bat
   ```
4. When prompted, paste the **Extension ID** from Step 1
5. Go back to `edge://extensions/` and click the **reload** button on the extension

### Verify Native Host

1. Open Edge DevTools (F12) on any page
2. Go to the **Console** tab
3. You should see: `[VolumeGesture] Native host status: connected`
4. If you see disconnect errors, check:
   - Python is in PATH
   - `pycaw` is installed (`pip install pycaw`)
   - The Extension ID in the manifest matches

## Settings

Click the extension icon in the toolbar to:

- **Enable/disable** gesture detection
- **Adjust gesture window** — max time between the two volume changes (default: 1000ms)

## Files

```
volumnGesture/
├── manifest.json                    # Extension manifest (Manifest V3)
├── background.js                    # Service worker — connects to native host
├── content.js                       # Gesture detection + video navigation
├── popup.html / popup.js / styles.css  # Settings popup
├── icons/                           # Extension icons
└── native_host/
    ├── volume_monitor.py            # Python native host — monitors system volume
    ├── volume_monitor_wrapper.bat   # Launcher for the Python script
    ├── com.volgesture.volumemonitor.json  # Native messaging host manifest
    ├── requirements.txt             # Python dependencies (pycaw, comtypes)
    ├── install.bat                  # Registers native host with Edge
    └── uninstall.bat                # Removes registration
```

## Uninstall

1. Remove the extension from `edge://extensions/`
2. Run `native_host\uninstall.bat` to remove the registry entry

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Gesture detected (overlay shows) but video doesn't change | Site navigation selectors may have changed. File an issue. |
| No overlay appears with in-player slider | Refresh the page after reloading the extension |
| No overlay with Bluetooth/system volume | Check native host is connected (see Verify section above) |
| `pycaw` import error | Run `pip install pycaw comtypes` |
| Native host disconnects immediately | Ensure Python 3.6+ is in PATH. Try running `python native_host\volume_monitor.py` manually to see errors. |

## Notes

- The native host polls Windows audio at 50ms intervals (~20 checks/second), giving sub-100ms latency for gesture detection.
- The in-player volume detection and native/system volume detection both feed into the same gesture recognizer — you can use either.
- A translucent overlay briefly shows the detected action on screen.
