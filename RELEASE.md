# AMD Tools — Documentación de release

## Información del release

| Campo             | Valor         |
| ----------------- | ------------- |
| **Producto**      | AMD Tools     |
| **Versión**       | 0.1.0-beta.1  |
| **Estado**        | Beta (MVP)    |
| **Identificador** | com.amd.tools |

---

## Descripción del producto

**AMD Tools** es una aplicación de escritorio para profesionales contables que permite generar **certificados tributarios** a partir de datos de transacciones con criptoactivos. La aplicación procesa archivos Excel con el formato requerido, valida y agrupa la información, y genera documentos PDF listos para uso formal.

Esta versión se centra en el módulo **Certificados Crypto**: carga de datos desde Excel, configuración de empresa y firmante, procesamiento en tiempo real y generación de certificados en PDF con diseño controlado por plantillas.

---

## Contenido de este release

- **Aplicación de escritorio** (Tauri 2 + Angular): instalador nativo para macOS (Intel y Apple Silicon), Windows y Linux.
- **Módulo Certificados Crypto**: flujo completo desde la carga del Excel hasta la generación de los PDF.
- **Base de datos local** (SQLite): configuración de empresas y firmantes almacenada en el equipo del usuario.
- **Generación de PDF**: certificados con Hoja 1 (resumen) y Hoja 2 (detalle de movimientos), usando plantillas HTML en el backend y jsPDF/html2canvas en el frontend.

---

## Características principales

### Configuración

- **Empresa:** registro de nombre, NIT (único), logo, representante legal e identificación.
- **Firmante:** nombre, cédula e imagen de firma (opcional) para los certificados generados.

### Certificados Crypto

- **Carga de Excel:** archivos con formato `NIT-nombre.xlsx` y columnas: ORDER_CODE, ID, THIRD_NAME, CITY, TOTAL_PRICE, TRM, AMOUNT, CRYPTO_COIN, DATE, NIT.
- **Validación:** comprobación de encabezados, NIT contra empresas registradas y consistencia de ciudad por ID.
- **Visualización:** tabla paginada con búsqueda por ID y THIRD_NAME; selección de registros a procesar.
- **Procesamiento en tiempo real:** ejecutado en Rust con indicador de progreso por etapas (agrupación, ordenamiento, totales, procesamiento por ID).
- **Resultados:** resumen por ID (ciudad, totales), detalle de transacciones y selección de receptores para generar PDF.
- **Generación de PDF:** un PDF por ID seleccionado, con año de certificado configurable; Hoja 1 (certificado tributario) y Hoja 2 (detalle de movimientos); guardado en carpeta elegida por el usuario.

### Interfaz

- Navegación lateral por módulos (Certificados → Crypto, Configuración de Usuario).
- Diseño responsive; sidebar colapsable en pantallas pequeñas.
- Notificaciones y mensajes de error claros en el flujo.

---

## Requisitos del sistema

- **Sistema operativo:** macOS 10.15+, Windows 10/11 (64-bit), o Linux (glibc 2.31+).
- **Arquitectura:** x86_64 o ARM64 (Apple Silicon) según el instalador descargado.
- **Espacio en disco:** ~150 MB para la aplicación y datos locales.
- **Memoria:** 4 GB RAM recomendado.

---

## Instalación

### macOS

1. Descargar el archivo `.dmg` correspondiente a tu Mac:
   - **Apple Silicon (M1/M2/M3):** `AMD Tools_0.1.0-beta.1_aarch64.dmg`
   - **Intel:** `AMD Tools_0.1.0-beta.1_x64.dmg`
2. Abrir el `.dmg` y arrastrar **AMD Tools** a la carpeta Aplicaciones.
3. La primera vez, si macOS muestra una advertencia de seguridad: _Ajustes → Privacidad y seguridad → abrir de todos modos_ (o clic derecho sobre la app → Abrir).

### Windows

1. Descargar el instalador `.msi` desde los assets del release.
2. Ejecutar el instalador y seguir las instrucciones.
3. La aplicación quedará disponible en el menú Inicio y en el escritorio (si se eligió el acceso directo).

### Linux

1. Descargar el paquete `.deb` o el `.AppImage` según tu distribución.
2. **.deb:** instalar con `sudo dpkg -i nombre-del-paquete.deb` (y resolver dependencias si se indican).
3. **.AppImage:** dar permisos de ejecución (`chmod +x archivo.AppImage`) y ejecutar.

---

## Primeros pasos

1. **Configurar empresa:** en el menú, ir a _Certificados → Crypto_ y acceder a _Configuración de Empresa_. Crear una empresa con nombre, NIT y representante legal.
2. **Configurar firmante:** en _Configuración de Firmante_, registrar nombre, cédula y, opcionalmente, imagen de firma.
3. **Preparar el Excel:** el archivo debe llamarse `NIT-nombre.xlsx` (ej. `901795718-reporte_2025.xlsx`) y contener las columnas requeridas.
4. **Generar certificados:** en el flujo principal, cargar el Excel → elegir tercero → revisar datos → procesar → seleccionar firmante y año del certificado → generar PDF. Los archivos se guardan en la carpeta que indiques.

---

## Limitaciones conocidas (beta)

- Esta versión es un **producto mínimo viable (MVP)**; no se considera estable 1.0.
- Pueden existir ajustes en el formato del Excel o en las reglas de validación en versiones futuras.
- La generación de PDF se realiza en el frontend (jsPDF + html2canvas); no se requieren binarios externos.
- El módulo _Configuración de Usuario_ puede tener comportamiento limitado o mock en esta beta.

---

## Soporte y referencias

- **Repositorio:** [GitHub del proyecto]
- **Reporte de incidencias:** usar la pestaña _Issues_ del repositorio.
- **Versiones:** las publicaciones se etiquetan con versiones semánticas (ej. `v0.1.0-beta.1`). Versiones _alpha_ son inestables; _beta_ son MVP utilizables; _1.0.0_ será la primera estable.

---

## Notas de la versión 0.1.0-beta.1

- Primera versión beta pública.
- Módulo Certificados Crypto completo: configuración de empresa y firmante, carga y validación de Excel, procesamiento en tiempo real y generación de PDF con dos hojas.
- Base de datos SQLite local para empresas y firmantes.
- Interfaz con PrimeNG (tema Aura), navegación lateral y flujo guiado por pasos.
- Builds disponibles para macOS (Intel y Apple Silicon), Windows y Linux.

---

## Proceso de release (mantenedores)

Resumen para generar y publicar un nuevo release:

1. **Versión:** actualizar en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`.
2. **Commit y tag:**  
   `git add ... && git commit -m "chore: release X.Y.Z" && git tag -a vX.Y.Z -m "Release X.Y.Z"`
3. **Build:** `npm run build:desktop` (artefactos en `src-tauri/target/release/bundle/`).
4. **GitHub:** push del tag (`git push origin main --tags`), luego en _Releases_ crear release desde el tag y adjuntar los `.dmg` / `.msi` / `.AppImage` en Assets.

Convención: `0.x.x-alpha.n` (inestable), `0.x.x-beta.n` (MVP), `1.0.0` (estable).
