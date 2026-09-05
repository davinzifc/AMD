# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev                  # Run Tauri dev server (Angular + Rust hot reload)
npm start                    # Angular-only dev server (no Tauri)

# Build
npm run build                # Angular build only (output: dist/browser/)
npm run build:desktop        # Full production Tauri build
npm run build:debug          # Tauri debug build
npm run build:mac            # Universal macOS build (Intel + ARM)
npm run build:mac-arm        # ARM-only macOS build

# Angular
npm test                     # Run Karma/Jasmine unit tests

# Rust (must run from src-tauri/ directory)
cd src-tauri && cargo check  # Compile-check Rust without building
cd src-tauri && cargo test   # Run Rust tests

# npm installs require --legacy-peer-deps
npm install --legacy-peer-deps
```

## Architecture

This is a Tauri v2 desktop app. Angular 20 handles the UI; Rust handles all business logic, data processing, and file I/O.

### Data Flow

```
Excel file → Rust (calamine) → RawTransaction[]
                             → group/validate/process (Rust)
                             → ProcessedGroup[]
                             → Handlebars templates → HTML
                             → Angular (jsPDF + html2canvas) → PDF bytes
                             → Rust write_pdf_file → disk
```

The Angular frontend communicates with Rust exclusively via `invoke()` (Tauri commands). Real-time progress during processing uses Tauri events (`listen('processing-progress')`).

### Frontend Structure (`src/app/`)

> See [`src/app/tools/CLAUDE.md`](src/app/tools/CLAUDE.md) for detailed per-tool documentation.

- **`layout/`** — Shell: sidebar nav + header + content area (CSS Grid, OnPush)
- **`shared/`** — Cross-cutting concerns:
  - `models/` — `Empresa`, `Firmante` interfaces
  - `services/` — `EmpresaService`, `FirmanteService`, `NotificationService` (all signal-based, `providedIn: 'root'`)
  - `components/file-upload/` — Reusable drag-and-drop file picker
  - `pipes/` — `ColombianCurrencyPipe` (1.234.567,89), `FormatNitPipe`
- **`tools/`** — Feature modules loaded lazily via `app.routes.ts`:
  - `certificados-crypto/` — Main tool: 5-step stepper workflow
  - `config-empresa/` — CRUD for companies (p-table + p-dialog pattern)
  - `config-firmante/` — CRUD for signers (same pattern + blur security on firma image)
  - `config-usuario/` — Simple user config stored in localStorage

### Certificados-Crypto Stepper (`tools/certificados-crypto/pages/main/steps/`)

5 steps, each a standalone component:
1. **step-upload** — File picker, calls `upload_excel`
2. **step-third-party** — Select which terceros (IDs from Excel) to include
3. **step-review** — DataTable preview of filtered transactions
4. **step-processing** — Triggers `process_selected_records`, shows real-time progress
5. **step-results** — ResultsTable with firmante selector; triggers `prepare_pdf_htmls` → frontend renders PDFs → `write_pdf_file`

State lives in `CryptoReportService` (signals). Call `reset()` to clear all state between iterations.

### Backend Structure (`src-tauri/src/`)

```
errors.rs                    # AppError enum (thiserror)
db/
  connection.rs              # DbPool(Mutex<Connection>), WAL mode, auto-migrations
  migrations/                # v001–v004 SQL files (applied once, tracked in _migrations table)
models/crypto/               # Serde structs: Empresa, Firmante, RawTransaction, ProcessedGroup, etc.
services/crypto/
  empresa_service.rs         # rusqlite CRUD for crypto_empresas
  firmante_service.rs        # rusqlite CRUD for crypto_firmantes (BLOB for firma image)
  excel_processor.rs         # calamine parsing: NIT from filename, header validation, row parsing
  data_processor.rs          # Group by ID, validate (ciudad consistency), format dates in Spanish
  pdf_generator.rs           # Handlebars → HTML; format_colombian(); write_pdf_file()
commands/crypto/             # Tauri #[tauri::command] wrappers — thin, delegate to services
lib.rs                       # Plugin registration + invoke_handler with all commands
```

### Database

SQLite at `app_data_dir/amd_tools.db`. Tables prefixed with `crypto_`. Schema managed by sequential migration files in `src-tauri/src/db/migrations/`. To add a migration: create `v00N_description.sql` and register it in `connection.rs`.

Access pattern: `State<'_, DbPool>` → `db.0.lock().unwrap()` → rusqlite directly. No ORM.

### PDF Generation

Rust generates HTML via Handlebars templates (`src-tauri/templates/crypto/`):
- `certificate.hbs` — Page 1: logo, title, summary table, firmante signature
- `details.hbs` / `details_section.hbs` — Page 2: transaction detail

Angular converts HTML to PDF using jsPDF + html2canvas, then calls `write_pdf_file` to save to disk. Output: `{NIT}_{ID}_AG{YEAR}.pdf`.

### Key Patterns

**Signal-based services**: All services use `signal()` for state, expose `.asReadonly()` computed signals, and return `Promise` from async methods.

**Tauri commands** always return `Result<T, String>` — `AppError` implements `From<AppError> for String`.

**Image storage**: Logo (empresa) and firma (firmante) stored as BLOB in SQLite. Retrieved as `Vec<u8>` in Rust, sent as `number[]` to Angular, then base64-encoded for display/embedding.

**Re-exports**: Shared models are defined in `shared/models/` and re-exported from services with `export type` (required for `isolatedModules`).

**Duplicate validation**: Pattern is `get_by_X()` in Rust service → Tauri command → Angular service method → onBlur validation in component.

**Dark mode**: CSS class `.dark-mode` on root element toggles PrimeNG Aura dark theme.
