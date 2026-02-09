# Release AMD Tools

## Versión actual: 0.1.0-beta.1

Primera versión beta (MVP). La app es funcional pero no se considera 1.0.

---

## Cómo hacer un release

### 1. Asegurar que la versión esté sincronizada

La versión debe coincidir en:

- `package.json` → `"version"`
- `src-tauri/Cargo.toml` → `[package] version`
- `src-tauri/tauri.conf.json` → `"version"`

### 2. Commit y tag

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: release 0.1.0-beta.1"
git tag -a v0.1.0-beta.1 -m "Release 0.1.0-beta.1 (MVP beta)"
git push origin main --tags
```

### 3. Build del instalador

```bash
npm run build:desktop
```

Los artefactos quedan en:

- **macOS**: `src-tauri/target/release/bundle/dmg/` y `.app`
- **Windows**: `src-tauri/target/release/bundle/msi/` y `nsis/`
- **Linux**: `src-tauri/target/release/bundle/deb/` y `appimage/`

### 4. Publicar (opcional)

- Subir los instaladores a GitHub Releases asociados al tag `v0.1.0-beta.1`.
- O adjuntar el `.dmg` / `.msi` / `.AppImage` donde vayas a distribuir.

---

## Convención de versiones

- **0.x.x-alpha.n**: desarrollo activo, inestable.
- **0.x.x-beta.n**: MVP usable, aún no 1.0.
- **1.0.0**: primera versión estable.

Para la siguiente beta: `0.1.0-beta.2`. Para la primera estable: `1.0.0`.
