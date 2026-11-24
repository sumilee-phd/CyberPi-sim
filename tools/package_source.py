"""Package the editable model and offline page; exclude caches and installed packages."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
archive = root / "CyberPi_3D_Source_v1.zip"
if archive.exists():
    raise SystemExit("Archive already exists; preserve it and choose a new output version.")
files = []
for folder in ("dist", "models", "source", "tools", "qa"):
    files.extend(p for p in (root / folder).rglob("*") if p.is_file()
                 and not p.name.endswith((".blend1", ".pyc", ".log"))
                 and "__pycache__" not in p.parts and p.name != "MANIFEST.json")
files.extend(root / name for name in ("README.md", "SOURCES.md", "실행.bat", "package.json", "package-lock.json"))
files = sorted(set(files), key=lambda p: p.relative_to(root).as_posix())
manifest = {"files": [{"path": p.relative_to(root).as_posix(), "bytes": p.stat().st_size,
                       "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
manifest_path = root / "qa" / "MANIFEST.json"
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as package:
    for file in files + [manifest_path]:
        package.write(file, arcname="CyberPi_3D_Source_v1/" + file.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None, "ZIP integrity failure"
    entries = set(package.namelist())
    for name in ("models/CyberPi_educational.blend", "dist/assets/cyberpi-educational.glb", "dist/app.js", "dist/index.html", "tools/build_model.py", "실행.bat"):
        assert "CyberPi_3D_Source_v1/" + name in entries, name
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(".zip.sha256").write_text(digest + "  " + archive.name + "\n", encoding="ascii")
print(json.dumps({"archive": str(archive), "bytes": archive.stat().st_size, "files": len(files) + 1,
                  "sha256": digest, "crc": "passed"}, ensure_ascii=False))
