# CLAUDE.md — `src/app/tools/`

This file provides guidance to Claude Code (claude.ai/code) for the `tools/` layer.
Parent reference: [`/CLAUDE.md`](/CLAUDE.md)

Each directory here is an independent, lazily-loaded Angular feature. All tools share services and models from `src/app/shared/`.

---

## Tools Overview

| Directory | Route | Purpose |
|---|---|---|
| `certificados-crypto/` | `tools/certificados-crypto` | Main workflow: Excel → process → PDF certificates |
| `config-empresa/` | `tools/config-empresa` | CRUD for registered companies |
| `config-firmante/` | `tools/config-firmante` | CRUD for PDF signers |
| `config-usuario/` | `config/usuario` | Local user profile (localStorage only) |

---

## `certificados-crypto/`

The core tool. Entry point is `CryptoMainPage` which orchestrates a 5-step PrimeNG `Stepper`.

### Step Components (`pages/main/steps/`)

Each step is a standalone component that receives data via `input()` signals and communicates upward via `output()` events. `CryptoMainPage` owns all state transitions.

| Step | Component | Tauri invocations |
|---|---|---|
| 1 — Cargar Excel | `StepUploadComponent` | `upload_excel` |
| 2 — Seleccionar Tercero | `StepThirdPartyComponent` | none (filters in memory) |
| 3 — Revisar Datos | `StepReviewComponent` | none (displays `filteredTransactions`) |
| 4 — Procesar | `StepProcessingComponent` | `process_selected_records` (+ listens `processing-progress` event) |
| 5 — Resultados | `StepResultsComponent` → `ResultsTableComponent` | `prepare_pdf_htmls`, `write_pdf_file`, `get_temp_dir` |

**State management**: All transient data lives in `CryptoReportService` (signals). `CryptoMainPage` holds step-local signals: `activeStep`, `selectedThirdParties`, `selectedTransactions`, `isGeneratingPdf`, `pdfSuccess`, `pdfPreviewUrl`. Call `resetAll()` to wipe everything and return to step 1.

**Stepper navigation**: `activeStep` is `signal<number>` (1-indexed). Going backwards past step 4 calls `reportService.resetProcessing()`. Going back to step 2 clears `selectedThirdParties`; step 3 clears `selectedTransactions`.

### PDF Generation Flow (`main.page.ts` → `PdfGeneratorService`)

```
onGeneratePdfs() / onPreviewPdf()
  → dialog: open folder (Tauri plugin-dialog)
  → invoke('prepare_pdf_htmls', { groups, empresaNit, year, outputDir, includeDetails, firmanteId })
      returns { output_dir, items: [{ pdf_file_name, html }] }
  → PdfGeneratorService.htmlToPdfBlob(html, pageSize, margins)
      splits on PAGE_BREAK_MARKER → renders each fragment via html2canvas → jsPDF
  → PdfGeneratorService.blobToBase64(blob)
  → invoke('write_pdf_file', { outputDir, fileName, contentsBase64 })
```

Preview uses `get_temp_dir` instead of a user-chosen folder, then `URL.createObjectURL()`.

### Shared Services Used

- `CryptoReportService` — signals for `transactions`, `empresa`, `progress`, `processingResult`, `isProcessing`
- `PdfGeneratorService` — `htmlToPdfBlob()`, `blobToBase64()`, page size constants
- `FirmanteService` (from `shared/`) — firmante list for the dropdown in `ResultsTableComponent`
- `NotificationService` (from `shared/`) — toast messages

### Internal Components (`components/`)

| Component | Role |
|---|---|
| `data-table/` | PrimeNG p-table for raw transaction preview (step 3) |
| `excel-upload-zone/` | Drag-and-drop file drop target (step 1) |
| `processing-progress/` | Progress bar + stage label during step 4 |
| `results-table/` | Checkboxes, year input, firmante selector, generate/preview buttons (step 5) |
| `third-party-selector/` | Multi-select table of unique IDs found in Excel (step 2) |
| `transaction-detail/` | Row-expansion sub-table inside results-table |
| `validation-errors/` | List of processing errors with affected Excel row numbers |

### Models (`models/`)

- `RawTransaction` — one row from Excel as parsed by Rust
- `ExcelUploadResult` — `{ empresa, transactions[], total_rows }`
- `ProcessedGroup`, `TransactionDetail`, `ValidationError`, `ProgressPayload`, `ProcessingResult` — mirror the Rust structs in `src-tauri/src/models/crypto/processing.rs`

---

## `config-empresa/` and `config-firmante/`

Both follow the identical **p-table + p-dialog** pattern:

```
Page component
  ├── p-table (sortable, filterable via p-iconfield/p-inputicon, paginated)
  │     └── action buttons per row: view / edit / delete
  ├── p-dialog (form modal — shared for create & edit, title changes)
  ├── p-dialog (detail modal — read-only)
  └── p-confirmDialog (ConfirmationService, per-component provider)
```

**Key signals in each page**:
- `formModalVisible`, `isEditing`, `saving` — modal state
- `originalNit` / `originalCcId` — tracks the ID being edited to skip self-validation in duplicate checks
- `formDirty` — gates the "unsaved changes?" confirmation on modal close

**Logo cache** (`config-empresa` only): `signal<Map<string, string>>` keyed by NIT. Logos are loaded async from `get_empresa_imagen` and cached to avoid re-fetching on re-renders.

**Blur security** (`config-firmante` detail modal): firma image is blurred with `filter: blur(12px)` + an overlay. Click removes blur; closing the modal resets it.

**Duplicate validation** (both pages): `onBlur` on the key field calls the backend (`get_empresa_by_nit` / `get_firmante_by_cc_id`) and sets an error signal. Save button is disabled while the error signal is truthy.

**Image constraints**: PNG or JPG only, max 2 MB. Firma image is horizontal format (300×150). Logo is square thumbnail (40×40 in table, 80×80 in detail, 150×150 in form preview).

---

## `config-usuario/`

Simple form backed entirely by `localStorage` (key: `amd_user_config`). No Tauri calls.

- `UserConfigService` — `signal<UserConfig>`, auto-loads from localStorage on construction, `updateConfig()` writes back
- `UserConfig` — `{ nombre, cedula, firma_path }` (firma_path currently unused in the UI)
- No confirmation dialogs or toast — uses an inline `saved` signal to show a transient success state

---

## Adding a New Tool

1. Create `src/app/tools/<tool-name>/` with `<tool-name>.routes.ts` exporting a `Routes` constant
2. Register in `src/app/app.routes.ts` as a lazy-loaded child of `LayoutComponent`
3. Add a nav item in `src/app/layout/sidebar/sidebar.component.html`
4. If the tool needs DB access: add Rust models/service/commands under `src-tauri/src/{models,services,commands}/` and register commands in `src-tauri/src/lib.rs`
5. Add a new SQL migration file (`v00N_description.sql`) and register it in `src-tauri/src/db/connection.rs`
