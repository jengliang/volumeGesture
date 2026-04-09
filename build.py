#!/usr/bin/env python3
"""
Package the Volume Gesture extension into a ZIP for Edge Add-ons Store submission.

Usage:
    python build.py                  # creates volumnGesture-<version>.zip
    python build.py --native-host    # also creates volumnGesture-native-host-<version>.zip
"""

import argparse
import json
import os
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

EXTENSION_FILES = [
    "manifest.json",
    "background.js",
    "popup.html",
    "popup.js",
    "styles.css",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

NATIVE_HOST_FILES = [
    "native_host/volume_monitor.py",
    "native_host/requirements.txt",
    "native_host/install.bat",
    "native_host/uninstall.bat",
    "native_host/com.volgesture.volumemonitor.json",
    "native_host/volume_monitor_wrapper.bat",
]


def get_version():
    with open(os.path.join(SCRIPT_DIR, "manifest.json")) as f:
        return json.load(f)["version"]


def build_zip(name, files):
    out_path = os.path.join(SCRIPT_DIR, name)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in files:
            full = os.path.join(SCRIPT_DIR, rel)
            if not os.path.exists(full):
                print(f"  WARNING: missing {rel}, skipping")
                continue
            zf.write(full, rel)
            print(f"  + {rel}")
    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nCreated {name} ({size_kb:.1f} KB)")
    return out_path


def main():
    parser = argparse.ArgumentParser(description="Package Volume Gesture extension")
    parser.add_argument("--native-host", action="store_true",
                        help="Also package the native host as a separate ZIP")
    args = parser.parse_args()

    version = get_version()
    print(f"Volume Gesture v{version}\n")

    print("=== Extension ZIP (for store submission) ===")
    build_zip(f"volumnGesture-{version}.zip", EXTENSION_FILES)

    if args.native_host:
        print(f"\n=== Native Host ZIP ===")
        build_zip(f"volumnGesture-native-host-{version}.zip", NATIVE_HOST_FILES)


if __name__ == "__main__":
    main()
