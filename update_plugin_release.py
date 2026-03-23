#!/usr/bin/env python3

import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


root = Path(__file__).resolve().parent
plugin_dir = root / "Golden-Ratio-Helper.sketchplugin"
manifest_path = plugin_dir / "Contents" / "Sketch" / "manifest.json"
appcast_path = plugin_dir / "appcast.xml"
zip_path = root / "Golden-Ratio-Helper.sketchplugin.zip"

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

major, minor, patch = map(int, manifest["version"].split("."))
print(f"Current version is {major}.{minor}.{patch}")
new_version = f"{major}.{minor}.{patch + 1}"
manifest["version"] = new_version

manifest_path.write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

appcast = appcast_path.read_text(encoding="utf-8")
appcast = re.sub(r'sparkle:version="[^"]+"', f'sparkle:version="{new_version}"', appcast, count=1)
appcast_path.write_text(appcast, encoding="utf-8")

zip_path.unlink(missing_ok=True)
with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as archive:
    for path in sorted(plugin_dir.rglob("*")):
        archive.write(path, path.relative_to(root))

print(f"Updated version to {new_version}")
