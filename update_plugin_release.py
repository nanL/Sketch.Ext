#!/usr/bin/env python3

# Release gate: delete a plugin's zip file manually when you want this
# script to bump that plugin's version and rebuild its zip package.

import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent

def bump_patch_version(version):
    major, minor, patch = map(int, version.split("."))
    return f"{major}.{minor}.{patch + 1}"


def should_include_in_zip(path):
    ignored_names = {".DS_Store", "Thumbs.db"}

    if "__MACOSX" in path.parts:
        return False

    if path.name in ignored_names:
        return False

    if path.name.startswith("._"):
        return False

    return True


def update_plugin(plugin_dir):
    zip_path = root / f"{plugin_dir.name}.zip"

    if zip_path.exists():
        print(f"Skipped {plugin_dir.name}: {zip_path.name} already exists")
        return

    manifest_path = plugin_dir / "Contents" / "Sketch" / "manifest.json"
    appcast_path = plugin_dir / "appcast.xml"

    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing manifest: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    current_version = manifest["version"]
    new_version = bump_patch_version(current_version)
    manifest["version"] = new_version

    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if appcast_path.exists():
        appcast = appcast_path.read_text(encoding="utf-8")
        appcast = re.sub(
            r'sparkle:version="[^"]+"',
            f'sparkle:version="{new_version}"',
            appcast,
            count=1,
        )
        appcast_path.write_text(appcast, encoding="utf-8")

    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as archive:
        for path in sorted(plugin_dir.rglob("*")):
            if path.is_file() and should_include_in_zip(path):
                archive.write(path, path.relative_to(root))

    print(f"Updated {plugin_dir.name}: {current_version} -> {new_version}")


plugins = sorted(path for path in root.glob("*.sketchplugin") if path.is_dir())
if not plugins:
    raise FileNotFoundError(f"No .sketchplugin directories found in {root}")

for plugin_dir in plugins:
    update_plugin(plugin_dir)
