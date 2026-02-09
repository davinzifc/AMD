# AMD Tools - Seguimiento de Progreso

## Estado Actual (2026-02-09)

**TODAS LAS 6 FASES + REQUERIMIENTOS 08-02-2026 + 09-02-2026 + 09-02-2026-2 COMPLETADOS**
**Compilacion**: Angular OK, Rust OK (0 warnings)

### Para probar el flujo completo:
1. **Desarrollo**: `brew install wkhtmltopdf` (solo necesario para desarrollo local)
2. Ejecutar: `npm run dev` (o `cargo tauri dev` desde src-tauri/)
3. Crear empresa en Config. Empresa (nombre, NIT, representante)
4. Crear firmante en Config. Firmante (nombre, CC, imagen de firma opcional)
5. Preparar Excel formato `NIT-nombre.xlsx` con 10 headers
6. Cargar Excel → Seleccionar Tercero → Revisar datos → Procesar → Seleccionar Firmante → Generar PDFs
7. Usar boton "Cargar Nuevo Excel" para iterar sin recargar la app

### Para build de produccion:
1. Descargar wkhtmltopdf binario para la plataforma target
2. Colocarlo en `src-tauri/binaries/wkhtmltopdf-{TARGET_TRIPLE}`
3. `npm run build:desktop` — Tauri empaqueta el binario dentro del instalador

### Pendiente para perfeccionar:
1. **Iteraciones Fase 4**: Probar procesamiento con datos reales y refinar reglas/formato
2. **Iconos personalizados**: Reemplazar iconos default de Tauri
3. **Prueba E2E completa**: Validar todo el flujo con un Excel real
4. **wkhtmltopdf**: Instalar para probar generacion real de PDFs

---

## Stack Tecnologico
- **Frontend**: Angular 20.1.5 + PrimeNG 21 (tema Aura)
- **Backend**: Rust 1.89 + Tauri v2.10
- **Base de datos**: SQLite via rusqlite (bundled)
- **PDF**: wkhtmltopdf + Handlebars templates
- **Arquitectura**: Modular por herramienta

---

## Fase 0: Scaffolding del Proyecto - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA

### Plan:
1. Instalar Tauri CLI v2
2. Crear proyecto Angular 20 con SCSS y routing
3. Inicializar Tauri v2 dentro del proyecto
4. Instalar dependencias npm (primeng, @primeng/themes, @angular/cdk, @angular/animations, primeicons, @tauri-apps/api, plugins dialog/fs/shell)
5. Instalar dependencias Rust (tauri plugins, rusqlite bundled, calamine, handlebars, chrono, thiserror, serde)
6. Configurar tauri.conf.json (ventana 1280x800, titulo "AMD Tools")
7. Configurar PrimeNG con tema Aura en app.config.ts
8. Crear .gitignore global
9. Verificar que Angular y Rust compilen

### Resultado:
- Angular compila a `dist/browser`
- Rust compila (cargo check OK)
- Tauri CLI v2.10.0 instalado
- Todos los plugins registrados en lib.rs
- Permisos configurados en capabilities/default.json

### Estructura creada:
```
AMD/
├── .gitignore
├── angular.json
├── package.json
├── tsconfig.json
├── src/                    # Angular frontend
│   ├── app/
│   │   ├── app.ts
│   │   ├── app.config.ts   # PrimeNG Aura theme
│   │   └── app.routes.ts
│   ├── styles.scss
│   └── index.html
├── src-tauri/              # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/
│       ├── main.rs
│       └── lib.rs
└── PROGRESS.md
```

---

## Fase 1: Layout, Navegacion y Arquitectura Modular - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA
**HUs cubiertas**: HU-012, HU-014

### Plan:
1. Crear componente SidebarComponent con navegacion personalizada (sidebar oscura tipo panel financiero)
2. Crear componente HeaderComponent con boton toggle para mobile
3. Crear componente LayoutComponent con CSS Grid (sidebar fija + main content)
4. Configurar rutas con lazy loading por herramienta
5. Crear rutas internas de certificados-crypto (main + config-empresa)
6. Crear paginas stub para cada ruta
7. Crear componente stub ConfigUsuarioComponent
8. Implementar responsive (sidebar colapsable en mobile con overlay)

### Resultado:
- Layout funcional con sidebar oscura profesional
- Navegacion SPA con RouterLink/RouterLinkActive
- Lazy loading: certificados-crypto y config-usuario se cargan por separado
- Responsive: sidebar se oculta en < 768px con boton hamburger
- Todos los componentes con ChangeDetectionStrategy.OnPush

### Diseno:
- **Estrategia de profundidad**: Borders-only (sin shadows, profesional contable)
- **Sidebar**: Fondo #0f172a (slate-900), items con border-left azul en activo
- **Acento**: #3b82f6 (azul institucional)
- **Tipografia**: System fonts, condensada, 13px para nav items
- **Espaciado**: Base 8px

### Archivos creados:
```
src/app/
├── layout/
│   ├── layout.component.ts
│   ├── sidebar/sidebar.component.ts
│   └── header/header.component.ts
├── app.routes.ts (lazy loading)
└── tools/
    ├── certificados-crypto/
    │   ├── certificados-crypto.routes.ts
    │   └── pages/
    │       ├── main/main.page.ts
    │       └── config-empresa/config-empresa.page.ts
    └── config-usuario/
        └── config-usuario.component.ts
```

---

## Fase 2: Base de Datos, Migraciones y CRUD Empresa - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA
**HUs cubiertas**: HU-001, HU-015

### Plan detallado:

#### Backend (Rust):
1. `src-tauri/src/errors.rs` — AppError enum con thiserror (Database, NotFound, Validation, DuplicateNit, Excel, Pdf, Io)
2. `src-tauri/src/db/connection.rs` — SQLite init en app_data_dir, migraciones, DbPool(Mutex<Connection>)
3. `src-tauri/src/db/migrations/v001_create_empresas.sql` — Tabla crypto_empresas con NIT UNIQUE
4. `src-tauri/src/models/crypto/empresa.rs` — Structs Empresa, CreateEmpresaDto, UpdateEmpresaDto
5. `src-tauri/src/services/crypto/empresa_service.rs` — CRUD completo con rusqlite directo
6. `src-tauri/src/commands/crypto/empresa_commands.rs` — 4 Tauri commands registrados
7. Archivos mod.rs para todos los directorios

#### Frontend (Angular):
8. `src/app/tools/certificados-crypto/services/empresa.service.ts` — Signal-based service
9. `src/app/shared/components/file-upload/file-upload.component.ts` — Drag-and-drop con validacion
10. `src/app/tools/certificados-crypto/pages/config-empresa/config-empresa.page.ts` — Formulario completo

### Resultado:
- CRUD empresa funcional (crear, listar, editar por NIT)
- SQLite con WAL mode y migraciones automaticas
- Formulario PrimeNG con FloatLabel inputs
- File upload reutilizable con drag-and-drop

---

## Fase 3: Carga de Excel y Visualizacion de Datos - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA
**HUs cubiertas**: HU-002, HU-003

### Plan detallado:

#### Backend (Rust):
1. `src-tauri/src/models/crypto/transaction.rs` — RawTransaction struct con row_number + REQUIRED_HEADERS const
2. `src-tauri/src/services/crypto/excel_processor.rs` — Parseo calamine: extract_nit_from_filename, validate_headers, parse_rows, parse_excel
3. `src-tauri/src/commands/crypto/report_commands.rs` — Command upload_excel (parsea + valida NIT en DB)

#### Frontend (Angular):
4. `src/app/tools/certificados-crypto/models/raw-transaction.model.ts` — Interfaz RawTransaction
5. `src/app/tools/certificados-crypto/models/excel-upload-result.model.ts` — Interfaz ExcelUploadResult
6. `src/app/tools/certificados-crypto/services/crypto-report.service.ts` — Signal-based service con uploadExcel
7. `src/app/tools/certificados-crypto/components/data-table/data-table.component.ts` — PrimeNG p-table con paginacion, filtro, multi-seleccion
8. `src/app/tools/certificados-crypto/pages/main/main.page.ts` — Stepper de 4 pasos con dialog file open

### Resultado:
- Excel upload end-to-end (dialog → Rust parsing → Angular table)
- PrimeNG p-table con paginacion (50 filas), filtro global, checkboxes
- Stepper funcional con navegacion lineal
- Validacion de formato NIT-nombre.xlsx y 10 headers obligatorios

---

## Fase 4: Procesamiento de Datos con Progreso Real-Time - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA (v1 — iteraciones de refinamiento pendientes)
**HUs cubiertas**: HU-004, HU-005, HU-006, HU-007

### Plan detallado:

#### Backend (Rust):
1. `src-tauri/src/models/crypto/processing.rs` — ProcessedGroup, TransactionDetail, ValidationError, ProgressPayload, ProcessingResult
2. `src-tauri/src/services/crypto/data_processor.rs` — Pipeline completo:
   - filter_selected, group_by_id, validate_groups (ciudad consistente)
   - process_single_group (ordena por fecha, suma totales, date_range en espanol)
   - build_date_range, format_date_spanish_full, parse_date (6 formatos + Excel serial)
   - emit_progress via Tauri events ("processing-progress")
3. Command `process_selected_records` en report_commands.rs

#### Frontend (Angular):
4. `crypto-report.service.ts` extendido — signals para progress, processingResult, isProcessing + listen Tauri events
5. `processing-progress.component.ts` — PrimeNG p-progressBar con etapa, ID, ORDER_CODE, porcentaje
6. `validation-errors.component.ts` — Lista de errores con filas afectadas del Excel
7. `main.page.ts` Step 3 integrado — boton Procesar, progreso real-time, resultados con stats, errores

### Resultado:
- Pipeline de procesamiento 100% en Rust con 4 etapas y progreso en tiempo real
- Agrupacion por ID, validacion de ciudad consistente
- Fechas en espanol ("Del X de mes hasta el Y de mes de anno")
- Valores redondeados a 2 decimales
- Errores de validacion claros con numero de fila Excel
- Frontend muestra stats (validos/invalidos/procesados) y errores detallados

### Reglas implementadas:
- Procesamiento 100% en Rust (NO frontend/Node)
- Validacion de ciudad obligatoria — grupo con ciudades distintas = invalido
- Grupo invalido = NO genera reporte (sin parciales)
- Valores numericos redondeados a 2 decimales
- Fechas en formato espanol legible

---

## Fase 5: Vista de Resultados y Generacion de PDF - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA
**HUs cubiertas**: HU-008, HU-009, HU-010, HU-011, HU-013

### Plan detallado:

#### Backend (Rust):
1. `src-tauri/templates/crypto/certificate.hbs` — Plantilla Hoja 1: logo, titulo "CERTIFICADO TRIBUTARIO AG {AÑO}", parrafo certificatorio, tabla resumen, firma representante legal
2. `src-tauri/templates/crypto/details.hbs` — Plantilla Hoja 2: tabla detalle movimientos con totales
3. `src-tauri/src/services/crypto/pdf_generator.rs` — Pipeline completo:
   - `format_colombian()` — formato numerico con puntos/comas (1.234.567,89)
   - `build_template_data()` — construye JSON para Handlebars
   - `find_wkhtmltopdf()` — busca binario en PATH y ubicaciones comunes
   - `html_to_pdf()` — ejecuta wkhtmltopdf como subprocess
   - `generate_pdfs()` — orquestador con progreso via eventos "pdf-progress"
4. Command `generate_pdfs` en report_commands.rs — recibe groups, empresa_nit, year, output_dir, include_details

#### Frontend (Angular):
5. `src/app/tools/certificados-crypto/components/results-table/results-table.component.ts` — PrimeNG p-table con checkboxes, row expansion, input anno, boton "Generar PDFs"
6. `src/app/tools/certificados-crypto/components/transaction-detail/transaction-detail.component.ts` — Sub-tabla detalle para row expansion
7. `src/app/tools/config-usuario/user-config.service.ts` — Signal-based, persiste en localStorage
8. `src/app/tools/config-usuario/config-usuario.component.ts` — Formulario con nombre y cedula
9. `main.page.ts` Step 4 integrado — results table + dialog carpeta + invoke generate_pdfs + mensaje exito

### Resultado:
- Templates Handlebars profesionales para Hoja 1 (certificado) y Hoja 2 (detalle)
- PDF generator con formato colombiano (puntos miles, coma decimales)
- wkhtmltopdf como subprocess (busca automaticamente en PATH)
- Eventos "pdf-progress" para feedback de generacion
- Results table con row expansion para ver transacciones individuales
- Checkbox para incluir/excluir hoja de detalle
- Config usuario funcional con localStorage
- Flujo: seleccionar IDs + anno → dialog carpeta → generar PDFs → mensaje exito

### wkhtmltopdf (sidecar empaquetado):
- Configurado como **sidecar de Tauri** en `bundle.externalBin` — se empaqueta dentro del instalador
- El usuario final NO necesita instalar nada — el binario va incluido en la app
- Resolucion: primero busca sidecar (produccion), luego PATH (desarrollo)
- Para **desarrollo**: `brew install wkhtmltopdf` en macOS
- Para **produccion**: colocar binario en `src-tauri/binaries/wkhtmltopdf-{TARGET_TRIPLE}`
  - macOS ARM: `wkhtmltopdf-aarch64-apple-darwin`
  - macOS Intel: `wkhtmltopdf-x86_64-apple-darwin`
  - Windows: `wkhtmltopdf-x86_64-pc-windows-msvc.exe`
- Templates HTML/CSS con Handlebars para control total de estilos
- Archivos generados: `NIT_ID_AG{YEAR}.pdf` y opcionalmente `NIT_ID_AG{YEAR}_detalle.pdf`

---

## Fase 6: Pulido y Produccion - COMPLETADA

**Fecha**: 2026-02-07
**Estado**: COMPLETADA
**HUs cubiertas**: HU-016

### Implementado:

1. **Notificaciones toast** — PrimeNG `p-toast` global en app.ts, `NotificationService` con metodos success/error/info/warn, integrado en config-empresa y generacion de PDFs
2. **Responsive** — Content padding reducido en mobile, tablas con overflow-x scroll, sidebar colapsable ya existia desde Fase 1, formulario empresa con grid 1-col en <640px
3. **Pipe formato colombiano** — `ColombianCurrencyPipe` creado (puntos miles, coma decimales), aplicado en data-table reemplazando DecimalPipe
4. **Build scripts** — `npm run build:desktop` (tauri build), `npm run build:debug` (tauri build --debug)
5. **Permisos Tauri** — capabilities/default.json actualizado con permisos especificos: core:event, dialog:allow-open, dialog:allow-save, fs:allow-read/write/exists/mkdir
6. **Logging** — tauri-plugin-log ya configurado desde Fase 0 (solo en debug mode)

### Pendientes menores (no bloquean):
- Iconos de aplicacion personalizados (actualmente usa los defaults de Tauri)
- wkhtmltopdf aun no instalado para probar PDFs
- Prueba E2E con datos reales

---

## Requerimientos 08-02-2026 - COMPLETADOS

**Fecha**: 2026-02-08
**Estado**: COMPLETADOS (4 fases)

### Enhancement 1: CRUD de Firmantes con Imagen de Firma
- Nueva tabla `crypto_firmantes` con BLOB para imagen de firma (migración v002)
- Modelo Rust `Firmante` con `firma_imagen: Option<Vec<u8>>` + `firma_mime: Option<String>`
- Servicio completo: create, get_by_id, update, delete, list (sin BLOB), get_firma_imagen
- 6 comandos Tauri registrados en invoke_handler
- Frontend: `FirmanteService` (signal-based), `ConfigFirmantePage` con formulario y file upload
- Lista de firmantes con indicador de firma (icono), confirmación para eliminar
- Sidebar: nuevo nav-item "Config. Firmante" con icono `pi pi-pen-to-square`

### Enhancement 2: Selección de Firmante en PDF
- Dropdown de firmante en `ResultsTableComponent` toolbar (PrimeNG Select)
- `firmanteId` requerido para generar PDFs (validación en botón)
- Backend: `generate_pdfs` recibe `firmante_id: Option<i64>`
- `build_template_data()` usa firmante como signer (fallback a empresa representante)
- Imagen de firma convertida a base64 data URI en template
- Template actualizado: `<img>` de firma antes de la línea de firma
- Crate `base64` agregada a Cargo.toml

### US 1: Stepper de 5 Pasos
- Paso 1: Cargar Excel (sin cambios)
- Paso 2: **Seleccionar Tercero** (NUEVO) — tabla con checkboxes, búsqueda, contador
- Paso 3: Revisar Datos — filtrado por terceros seleccionados
- Paso 4: Procesamiento (sin cambios en lógica)
- Paso 5: Resultados — con selector de firmante
- Nuevo componente `ThirdPartySelectorComponent` con tabla multi-select

### Bug 1: Limpiar Estado entre Iteraciones
- `CryptoReportService.reset()` ahora limpia `_isProcessing` y `_loading`
- Botón "Cargar Nuevo Excel" en esquina superior derecha del stepper (visible en steps 2-5)
- `resetAll()` limpia: service, third parties, selected transactions, pdfSuccess, vuelve a step 1

### Bug 2: Fix Exportación PDF
- `html_to_pdf()` mejorada: verifica que PDF existe y tiene tamaño > 0 después de wkhtmltopdf
- Logging mejorado con rutas completas de archivos
- Eliminado flag `--quiet` para capturar errores de wkhtmltopdf
- Exit code incluido en mensajes de error

### Archivos creados:
- `src-tauri/src/db/migrations/v002_create_firmantes.sql`
- `src-tauri/src/models/crypto/firmante.rs`
- `src-tauri/src/services/crypto/firmante_service.rs`
- `src-tauri/src/commands/crypto/firmante_commands.rs`
- `src/app/tools/certificados-crypto/models/firmante.model.ts`
- `src/app/tools/certificados-crypto/services/firmante.service.ts`
- `src/app/tools/certificados-crypto/pages/config-firmante/config-firmante.page.ts`
- `src/app/tools/certificados-crypto/components/third-party-selector/third-party-selector.component.ts`

### Archivos modificados:
- `src-tauri/Cargo.toml` (+base64)
- `src-tauri/src/db/connection.rs` (+v002 migration)
- `src-tauri/src/models/crypto/mod.rs` (+firmante module)
- `src-tauri/src/services/crypto/mod.rs` (+firmante_service)
- `src-tauri/src/commands/crypto/mod.rs` (+firmante_commands)
- `src-tauri/src/lib.rs` (+6 firmante commands)
- `src-tauri/src/commands/crypto/report_commands.rs` (+firmante_id param)
- `src-tauri/src/services/crypto/pdf_generator.rs` (+firmante, +base64, +verification)
- `src-tauri/templates/crypto/certificate.hbs` (+firma image, +conditional styles)
- `src/app/tools/certificados-crypto/certificados-crypto.routes.ts` (+config-firmante route)
- `src/app/layout/sidebar/sidebar.component.ts` (+Config. Firmante nav item)
- `src/app/tools/certificados-crypto/pages/main/main.page.ts` (5-step stepper, resetAll)
- `src/app/tools/certificados-crypto/components/results-table/results-table.component.ts` (+firmante dropdown)
- `src/app/tools/certificados-crypto/services/crypto-report.service.ts` (reset fix)

---

## Requerimientos 09-02-2026 - COMPLETADOS

**Fecha**: 2026-02-09
**Estado**: COMPLETADOS
**HUs cubiertas**: US-001 a US-010 (Rediseno Configuracion de Empresas)
**Plan**: `/requirements/plan-09-02-2026.md`
**Requerimiento**: `/requirements/09-02-2026.md`

### Resumen del Cambio
Reescritura completa de la pagina de Configuracion de Empresas. De formulario inline + lista de cards a interfaz profesional con tabla PrimeNG + modals.

### US-001 + US-006: Tabla de Empresas
- Reemplazo de lista de cards por PrimeNG `p-table`
- Columnas: Logo (40x40 thumbnail), Nombre (sortable), NIT (sortable, formateado), Acciones
- Busqueda global (nombre + NIT) con `p-iconfield`
- Paginacion configurable (10, 25, 50 registros)
- Sort por nombre por defecto
- Empty state con boton "Agregar primera empresa"
- Cache async de logos por NIT

### US-002 + US-004 + US-008: Modal Crear/Editar
- Modal unico `p-dialog` reutilizado para crear y editar
- Titulo dinamico: "Crear Nueva Empresa" / "Editar Empresa"
- Campos: Nombre*, NIT*, Representante legal*, Identificacion*, Logo (opcional)
- Preview de logo 150x150px con boton X para remover
- En edicion: carga automatica del logo existente desde cache
- Validacion: boton deshabilitado si campos obligatorios vacios o NIT duplicado
- Confirmacion al cerrar si hay cambios sin guardar

### US-003: Validacion NIT en Tiempo Real
- Validacion onBlur del campo NIT via `getEmpresaByNit`
- Muestra nombre de empresa existente: "El NIT XXX ya esta registrado para la empresa 'NOMBRE'"
- Input con borde rojo y mensaje de error
- En edicion: ignora el NIT actual de la empresa siendo editada
- Boton Guardar deshabilitado mientras hay error de NIT

### US-007: Modal Ver Detalle
- Segundo `p-dialog` read-only (440px)
- Diseno business card: logo centrado (80x80), nombre, NIT formateado
- Secciones con iconos: Representante legal, Identificacion
- Solo boton "Cerrar"

### US-009: Confirmacion de Actualizacion
- ConfirmationService antes de cada update
- Mensaje: "¿Estas seguro de que deseas actualizar los datos de la empresa 'NOMBRE'?"
- Botones: "Si, actualizar" + "Cancelar"
- Cierra modal de edicion tras confirmar exitosamente

### US-010: Mensajes de Feedback
- Toast via NotificationService para todas las acciones:
  - Crear: "Empresa creada exitosamente"
  - Actualizar: "Empresa actualizada correctamente"
  - Eliminar: "Empresa eliminada correctamente"
  - NIT duplicado: "El NIT ingresado ya existe en el sistema"
  - Error imagen: "Solo se permiten archivos PNG o JPG" / "El tamano maximo permitido es 2MB"
  - Campos obligatorios: warn con mensaje descriptivo

### US-005: Modal Reutilizable
- Se usa PrimeNG `p-dialog` directamente (ya cumple todos los criterios del US)
- No se creo wrapper custom (seria sobre-ingenieria innecesaria)

### Archivos modificados:
- `src/app/tools/certificados-crypto/pages/config-empresa/config-empresa.page.ts` (reescritura completa)

### Cambios en Rust: NINGUNO
- El backend ya tenia todo lo necesario para soportar el rediseno

---

## Requerimientos 09-02-2026-2 - COMPLETADOS

**Fecha**: 2026-02-09
**Estado**: COMPLETADOS
**HUs cubiertas**: US-011 a US-020 (Rediseno Configuracion de Firmantes)
**Plan**: `/requirements/09-02-2026-2-plan.md`
**Requerimiento**: `/requirements/09-02-2026-2.md`

### Resumen del Cambio
Reescritura completa de la pagina de Configuracion de Firmantes. De formulario inline + lista simple a interfaz profesional con tabla PrimeNG + modals + blur de seguridad en firma.

### US-011 + US-015: Tabla de Firmantes
- Reemplazo de lista de items por PrimeNG `p-table`
- Columnas: Nombre Completo (sortable), Cedula/ID (sortable), Acciones
- SIN columna de imagen de firma (requisito explicito)
- Busqueda global (nombre + cedula) con `p-iconfield`
- Paginacion configurable (10, 25, 50 registros)
- Sort por nombre por defecto
- Empty state con boton "Agregar primer firmante"
- Tooltips en botones de accion

### US-012 + US-014 + US-017: Modal Crear/Editar
- Modal unico `p-dialog` reutilizado para crear y editar
- Titulo dinamico: "Crear Nuevo Firmante" / "Editar Firmante"
- Campos: Nombre completo*, Cedula/ID*, Imagen de firma (obligatoria para crear)
- Preview de firma 300x150px con boton X para remover
- En edicion: carga automatica de firma existente SIN blur
- Validacion: boton deshabilitado si campos vacios o cedula duplicada
- Confirmacion al cerrar si hay cambios sin guardar

### US-013: Validacion Cedula Duplicada en Tiempo Real
- Nueva funcion Rust `get_by_cc_id()` en firmante_service
- Nuevo comando Tauri `get_firmante_by_cc_id`
- Validacion onBlur del campo cedula
- Muestra nombre del firmante existente: "La cedula XXX ya esta registrada para el firmante 'NOMBRE'"
- Input con borde rojo y mensaje de error
- En edicion: ignora la cedula actual del firmante

### US-016: Modal Ver Detalle con Blur de Seguridad
- `p-dialog` read-only (600px)
- Imagen de firma con efecto blur CSS (`filter: blur(12px)`) por defecto
- Overlay superpuesto: icono pi-eye + "Click para visualizar la firma"
- Click sobre imagen remueve blur con transicion suave (0.4s ease-in-out)
- Blur se restablece al cerrar y reabrir el modal
- Sin imagen: placeholder con icono pi-image + "Sin imagen de firma" (sin blur)
- Info rows con iconos: Nombre completo, Cedula/Identificacion
- Solo boton "Cerrar"

### US-018: Confirmacion de Actualizacion
- ConfirmationService antes de cada update
- Mensaje: "¿Estas seguro de que deseas actualizar los datos del firmante 'NOMBRE'?"
- Botones: "Si, actualizar" + "Cancelar"

### US-019: Mensajes de Feedback
- Toast via NotificationService para todas las acciones
- Crear/Actualizar/Eliminar: success
- Cedula duplicada/formato imagen/tamano: error
- Campos obligatorios: warn

### US-020: Eliminacion de Firmante
- Boton pi-trash en tabla con tooltip
- ConfirmationService con mensaje y boton danger
- Toast success tras eliminacion

### Archivos modificados:
- `src-tauri/src/services/crypto/firmante_service.rs` (+get_by_cc_id)
- `src-tauri/src/commands/crypto/firmante_commands.rs` (+get_firmante_by_cc_id)
- `src-tauri/src/lib.rs` (+1 comando registrado)
- `src/app/tools/certificados-crypto/services/firmante.service.ts` (+getFirmanteByCcId)
- `src/app/tools/certificados-crypto/pages/config-firmante/config-firmante.page.ts` (reescritura completa)

---

## Decisiones Arquitectonicas

| Decision | Eleccion | Razon |
|----------|----------|-------|
| DB access | rusqlite directo | Toda la logica en Rust, no JS API |
| PDF engine | wkhtmltopdf subprocess | Fidelidad CSS completa, sin limitaciones de bindings |
| State management | Angular Signals | Simple, performante, sin overhead de NgRx |
| Module loading | Lazy loading | Escalable, cada herramienta independiente |
| Component strategy | Standalone + OnPush | Default Angular 20+, mejor performance |
| Depth strategy | Borders-only | Profesional, limpio, contable |
| Tabla prefix | crypto_ | Modularidad BD por herramienta |
| NIT | Inmutable post-creacion | Integridad referencial |
| Procesamiento | 100% Rust | Requisito de negocio, performance |
| Progreso real-time | Tauri events (emit/listen) | Push pattern nativo de Tauri v2 |
