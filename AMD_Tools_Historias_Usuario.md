# Historias de Usuario — AMD Tools

## HU-001: Configuración de Empresa

**Como** contador de la empresa  
**Quiero** configurar los datos de una empresa en el sistema  
**Para** que esta información se use como metadata en los reportes generados

### Criterios de Aceptación

- El sistema debe permitir crear una nueva empresa con los campos: Nombre, NIT (único), Imagen, Nombre del representante legal, e Identificación del representante legal
- El NIT debe ser único y actuar como identificador primario
- La imagen debe poder almacenarse localmente en el filesystem o en la base de datos
- El sistema debe permitir actualizar los datos de una empresa existente
- El sistema debe permitir obtener una empresa por NIT
- El sistema debe permitir obtener la metadata completa de una empresa para generación de reportes
- Todas las operaciones CRUD deben implementarse en Rust con servicios desacoplados en Angular

### Reglas de Negocio

- NIT es obligatorio y debe ser único en la base de datos
- El formato de imagen soportado debe validarse (PNG, JPG, JPEG)
- La actualización de empresa no debe permitir cambiar el NIT (es identificador inmutable)

---

## HU-002: Carga de Archivo Excel

**Como** usuario del sistema  
**Quiero** cargar un archivo Excel con datos de transacciones  
**Para** procesarlos y generar certificados tributarios

### Criterios de Aceptación

- El sistema debe utilizar el componente reutilizable de carga de archivos
- El archivo debe seguir el formato: `NIT-nombre.xlsx` (ejemplo: `901795718-reporte_2025.xlsx`)
- El sistema debe validar que el archivo contenga todos los encabezados obligatorios: ORDER_CODE, ID, THIRD_NAME, CITY, TOTAL_PRICE, TRM, AMOUNT, CRYPTO_COIN, DATE, NIT
- El NIT debe extraerse del nombre del archivo
- El sistema debe validar que el NIT extraído corresponda a una empresa registrada en la base de datos
- Si el NIT no existe o el formato del archivo es inválido, debe mostrarse un error claro al usuario
- El archivo debe cargarse completamente antes de iniciar el procesamiento

### Reglas de Negocio

- El formato del nombre del archivo es estricto: `NIT-nombre.xlsx`
- Todos los encabezados obligatorios deben estar presentes; caso contrario, se rechaza el archivo
- El NIT extraído del nombre del archivo debe coincidir con una empresa existente en base de datos

---

## HU-003: Visualización de Datos Cargados

**Como** usuario del sistema  
**Quiero** ver los datos del Excel cargado en una tabla paginada con búsqueda  
**Para** revisar y seleccionar qué registros procesar

### Criterios de Aceptación

- Al cargar el archivo, el sistema debe mostrar todos los registros en una tabla paginada
- La tabla debe incluir un buscador funcional
- El buscador debe permitir filtrar por ID y THIRD_NAME
- El usuario debe poder seleccionar uno o varios registros (checkboxes)
- El usuario debe poder seleccionar todos los registros de una página
- Debe existir un botón "Generar Reportes" que solo se habilite si hay al menos un registro seleccionado

### Reglas de Negocio

- La paginación debe manejar eficientemente grandes volúmenes de datos (más de 1000 registros)
- El filtro debe aplicarse en tiempo real mientras el usuario escribe
- Solo los registros seleccionados deben procesarse al generar reportes

---

## HU-004: Procesamiento de Datos en Tiempo Real

**Como** usuario del sistema  
**Quiero** que el procesamiento de datos se ejecute en el backend y ver su progreso en tiempo real  
**Para** tener visibilidad del estado sin bloquear la interfaz

### Criterios de Aceptación

- Todo el procesamiento debe ejecutarse en Rust (backend)
- Durante el procesamiento, debe mostrarse una barra de progreso o stepper (ej. PrimeNG)
- La barra debe indicar las etapas: "Agrupando los datos", "Ordenando por fecha", "Calculando totales", "Procesando cada ID individual"
- Durante el procesamiento de cada ID, debe mostrarse el ID actual y el ORDER_CODE asociado
- El sistema debe comunicar el progreso en tiempo real desde Rust hacia Angular
- El procesamiento no debe realizarse en frontend ni Node.js

### Reglas de Negocio

- El procesamiento pesado está prohibido en frontend
- La comunicación en tiempo real debe implementarse mediante eventos Tauri o WebSockets
- El usuario no debe poder iniciar otro procesamiento mientras uno esté en curso

---

## HU-005: Agrupación y Validación por ID

**Como** sistema  
**Quiero** agrupar los registros por ID y validar la consistencia de datos  
**Para** garantizar la integridad de los reportes generados

### Criterios de Aceptación

- El sistema debe agrupar todos los registros por ID
- Cada ID representa un receptor único
- Un mismo ID puede tener N transacciones en diferentes fechas
- Todos los registros de un mismo ID deben tener la misma ciudad (CITY)
- Si se detecta discrepancia en la ciudad para un mismo ID, el grupo debe marcarse como inválido
- El sistema debe notificar el error mostrando: ID, THIRD_NAME
- El sistema debe permitir localizar el error en el Excel original (número de fila)
- Los grupos inválidos no deben incluirse en la generación de reportes

### Reglas de Negocio (OBLIGATORIAS)

- La agrupación es por ID (identificador único del receptor)
- La validación de ciudad es crítica y no puede omitirse
- Un error de validación invalida todo el grupo (no se genera reporte parcial)
- El sistema debe proporcionar información suficiente para que el usuario corrija el Excel original

---

## HU-006: Cálculo de Resumen por Receptor

**Como** sistema  
**Quiero** calcular los totales y rangos de fecha por cada ID válido  
**Para** generar el resumen del certificado (Hoja 1)

### Criterios de Aceptación

- Para cada ID válido, el sistema debe calcular:
  - Ciudad del receptor (CITY)
  - Fecha del pago:
    - Si hay múltiples fechas: mostrar rango ordenado cronológicamente (formato: "Del 24 de noviembre hasta el 31 de octubre de 2024")
    - Si hay una sola fecha: mostrar fecha única (formato: "24 de noviembre de 2024")
  - Cantidad total adquirida: suma de la columna AMOUNT
  - Valor total en COP: suma de la columna TOTAL_PRICE
  - Retención aplicada: valor por defecto "NO"
- Los cálculos deben realizarse en Rust
- Los datos calculados deben almacenarse temporalmente para la generación del PDF

### Reglas de Negocio

- Las fechas deben ordenarse cronológicamente antes de determinar el rango
- Los formatos de fecha deben ser en español y legibles (día de mes de año)
- Todos los valores numéricos deben redondearse a 2 decimales

---

## HU-007: Generación de Detalle de Movimientos

**Como** sistema  
**Quiero** generar el detalle de transacciones individuales para cada ID  
**Para** incluirlo como Hoja 2 del certificado cuando corresponda

### Criterios de Aceptación

- Si un ID contiene más de un registro, el sistema debe generar una tabla detallada
- La tabla debe incluir: Fecha, ORDER_CODE, AMOUNT, TRM, TOTAL_PRICE
- Cada fila debe representar una transacción individual
- Las transacciones deben ordenarse cronológicamente por fecha
- Si un ID tiene un solo registro, la Hoja 2 debe omitirse o mostrar solo esa transacción

### Reglas de Negocio

- La Hoja 2 solo tiene sentido cuando hay múltiples transacciones
- El orden cronológico es obligatorio
- Todos los valores numéricos deben formatearse correctamente (separadores de miles, 2 decimales)

---

## HU-008: Visualización de Resultados Procesados

**Como** usuario del sistema  
**Quiero** ver un resumen de los datos procesados antes de exportar  
**Para** verificar que todo está correcto y seleccionar qué reportes generar

### Criterios de Aceptación

- Una vez finalizado el procesamiento, mostrar una tabla resumen con las columnas: ID, Ciudad, Total AMOUNT, Total TOTAL_PRICE
- Cada fila debe incluir una opción "Ver más" que muestre el detalle completo de transacciones (Hoja 2)
- El usuario debe poder seleccionar qué IDs desea exportar (checkboxes)
- Debe existir una opción "Exportar todos" que seleccione todos los IDs
- Debe existir un campo de entrada para solicitar el año del certificado (ej. "2024", "2025")
- El botón "Generar PDF" debe habilitarse solo si hay al menos un ID seleccionado y el año fue ingresado

### Reglas de Negocio

- El año del certificado es obligatorio para la generación del PDF
- El formato del año debe validarse (4 dígitos numéricos)
- Los reportes solo se generan para los IDs seleccionados

---

## HU-009: Generación de PDF con Plantilla HTML

**Como** sistema  
**Quiero** generar certificados tributarios en formato PDF usando plantillas HTML  
**Para** mantener un diseño controlado, profesional y fácil de mantener

### Criterios de Aceptación

- El sistema debe generar un PDF por cada ID seleccionado
- La generación debe delegarse a Rust usando un motor de plantillas (preferiblemente Handlebars)
- El diseño debe ser 100% controlado vía HTML/CSS
- Cada PDF debe tener el formato de nombre: `NIT_ID_fecha.pdf` (ej. `901795718_123456789_2024-11-24.pdf`)
- El sistema debe guardar los PDFs en una ubicación seleccionada por el usuario (diálogo de carpeta)
- Una vez generados, el sistema debe mostrar un mensaje de éxito indicando la cantidad de archivos generados

### Reglas de Negocio

- La generación de PDF debe ejecutarse en el backend (Rust)
- El motor de plantillas debe separar diseño de lógica
- Los PDFs deben ser completamente autocontenidos (incluir todas las fuentes e imágenes necesarias)

---

## HU-010: Diseño del PDF - Hoja 1 (Certificado)

**Como** sistema  
**Quiero** generar la primera hoja del PDF con el diseño del certificado tributario  
**Para** cumplir con los requisitos legales y de presentación

### Criterios de Aceptación

- **Encabezado:**
  - Logo de la empresa (obtenido desde base de datos)
  - Ubicación: parte superior del documento
  - Título centrado: "CERTIFICADO TRIBUTARIO AG {AÑO}" (ej. "CERTIFICADO TRIBUTARIO AG 2024")

- **Cuerpo del Certificado:**
  - Párrafo principal (texto justificado):
    > "La empresa {NOMBRE_EMPRESA}, identificada con NIT {NIT}, certifica que se realizó un pago a la señora {THIRD_NAME}, identificada con número de cédula {ID}, en el marco de una operación de adquisición de moneda digital (criptoactivo) a través de la plataforma Binance."
  - Texto introductorio a la tabla:
    > "A continuación, se detallan los aspectos técnicos de la transacción:"
  - Tabla de resumen con formato:

| CAMPO | DETALLE |
|-------|---------|
| Ciudad del receptor | {CITY} |
| Fecha del pago | {FECHA / RANGO_FECHAS} |
| Cantidad adquirida | {SUM_AMOUNT} |
| Valor total (COP) | {SUM_TOTAL_PRICE} |
| Retención aplicada | NO |

- **Cierre del Documento:**
  - Texto: "Atentamente,"
  - Espacio reservado para firma del usuario (mock)
  - Nombre del usuario

### Reglas de Negocio

- Todos los valores entre llaves deben reemplazarse dinámicamente
- El año del certificado debe ser el ingresado por el usuario
- Los valores numéricos deben formatearse con separadores de miles y 2 decimales
- El diseño debe ser profesional y legible

---

## HU-011: Diseño del PDF - Hoja 2 (Detalle)

**Como** sistema  
**Quiero** generar la segunda hoja del PDF con el detalle de movimientos  
**Para** proporcionar transparencia completa sobre las transacciones

### Criterios de Aceptación

- La Hoja 2 debe contener una tabla con las columnas: Fecha, ORDER_CODE, AMOUNT, TRM, TOTAL_PRICE
- Cada fila debe representar una transacción individual del ID
- Las transacciones deben estar ordenadas cronológicamente
- El formato de la tabla debe ser consistente con la Hoja 1
- Si el ID tiene una sola transacción, esta hoja puede omitirse o mostrar esa única transacción

### Reglas de Negocio

- La Hoja 2 es opcional si solo hay una transacción
- Todos los valores numéricos deben formatearse correctamente
- El diseño debe mantener coherencia visual con la Hoja 1

---

## HU-012: Navegación Principal de la Aplicación

**Como** usuario del sistema  
**Quiero** acceder a las diferentes herramientas desde un menú lateral  
**Para** navegar eficientemente entre funcionalidades

### Criterios de Aceptación

- La aplicación debe mostrar un título en la parte superior: "AMD Tools"
- Debe existir un menú lateral con la estructura:
  - Certificados
    - Crypto
- Al hacer clic en "Crypto", debe navegar al módulo de Certificados Crypto
- El menú debe ser responsive (adaptarse a pantallas grandes, medianas y pequeñas)
- El menú debe colapsar en pantallas pequeñas (hamburger menu)

### Reglas de Negocio

- La estructura del menú debe ser modular para facilitar agregar nuevas herramientas
- El ítem activo del menú debe resaltarse visualmente
- La navegación no debe recargar la aplicación (SPA behavior)

---

## HU-013: Configuración de Usuario (Mock)

**Como** usuario del sistema  
**Quiero** configurar mis datos personales en el sistema  
**Para** que aparezcan en los certificados generados

### Criterios de Aceptación

- El menú debe incluir una opción "Configuración de Usuario"
- El formulario debe incluir campos: Nombre, CC (Cédula), Firma (upload), Campos futuros (placeholder)
- Los datos deben almacenarse localmente (solo frontend mock por ahora)
- La firma debe permitir subir una imagen (PNG, JPG)
- Los datos deben persistir durante la sesión de la aplicación

### Reglas de Negocio

- Esta funcionalidad es mock (solo frontend, no backend)
- No se requiere validación estricta en esta fase
- Los datos del usuario se utilizarán en el cierre del certificado PDF

---

## HU-014: Arquitectura Modular por Herramienta

**Como** desarrollador del sistema  
**Quiero** que cada herramienta esté completamente encapsulada  
**Para** facilitar el mantenimiento y la escalabilidad

### Criterios de Aceptación

- Cada herramienta debe tener su propia estructura de carpetas en Angular
- Los servicios de Angular deben estar desacoplados por herramienta
- La lógica de backend en Rust debe organizarse en módulos independientes por herramienta
- La base de datos debe usar esquemas o prefijos de tabla por herramienta
- Agregar una nueva herramienta no debe requerir modificar código de herramientas existentes

### Reglas de Negocio

- La comunicación frontend ↔ backend debe estar claramente documentada por herramienta
- Cada módulo debe poder probarse de forma independiente
- Las dependencias compartidas deben estar en una capa común (core)

---

## HU-015: Base de Datos Local y Persistencia

**Como** sistema  
**Quiero** utilizar una base de datos local para almacenar configuraciones y datos  
**Para** que la aplicación funcione offline y sea rápida

### Criterios de Aceptación

- El sistema debe utilizar SQLite (u otra base de datos local equivalente)
- Debe existir una tabla `empresas` con los campos: id, nombre, nit (único), imagen_path, representante_nombre, representante_id
- Las migraciones de base de datos deben estar versionadas
- El sistema debe inicializar la base de datos automáticamente en el primer arranque
- Los datos deben persistir entre ejecuciones de la aplicación

### Reglas de Negocio

- El archivo de base de datos debe almacenarse en la carpeta de datos del usuario del sistema operativo
- Las migraciones deben ser reversibles
- La base de datos debe tener índices apropiados (ej. NIT único)

---

## HU-016: Compilación Multiplataforma

**Como** equipo de desarrollo  
**Quiero** que la aplicación se compile para Windows y macOS  
**Para** que los usuarios puedan usarla en diferentes sistemas operativos

### Criterios de Aceptación

- Debe existir un script de compilación para Windows
- Debe existir un script de compilación para macOS
- Los instaladores deben incluir todas las dependencias necesarias
- La aplicación debe mantener la misma funcionalidad en ambas plataformas
- El instalador debe crear un acceso directo/icono de aplicación

### Reglas de Negocio

- El proceso de compilación debe estar documentado
- Los instaladores deben firmarse digitalmente (futuro)
- La versión debe incrementarse automáticamente

---

## Estructura de Carpetas Sugerida

### Frontend (Angular)

```
src/
├── app/
│   ├── core/                    # Servicios compartidos, guards, interceptors
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── shared/                  # Componentes reutilizables, pipes, directives
│   │   ├── components/
│   │   │   └── file-upload/
│   │   ├── pipes/
│   │   └── directives/
│   ├── layout/                  # Layout principal, menú, header
│   │   ├── sidebar/
│   │   └── header/
│   └── tools/                   # Módulos de herramientas
│       └── certificados-crypto/
│           ├── certificados-crypto.module.ts
│           ├── certificados-crypto-routing.module.ts
│           ├── pages/
│           │   ├── main/
│           │   └── config-empresa/
│           ├── components/
│           └── services/
│               ├── empresa.service.ts
│               └── crypto-report.service.ts
```

### Backend (Rust + Tauri)

```
src-tauri/
├── src/
│   ├── main.rs
│   ├── commands/                # Comandos Tauri expuestos
│   │   ├── mod.rs
│   │   └── crypto/
│   │       ├── mod.rs
│   │       ├── empresa_commands.rs
│   │       └── report_commands.rs
│   ├── services/                # Lógica de negocio
│   │   └── crypto/
│   │       ├── mod.rs
│   │       ├── empresa_service.rs
│   │       ├── excel_processor.rs
│   │       └── pdf_generator.rs
│   ├── models/                  # Estructuras de datos
│   │   └── crypto/
│   │       ├── mod.rs
│   │       ├── empresa.rs
│   │       └── transaction.rs
│   ├── db/                      # Capa de base de datos
│   │   ├── mod.rs
│   │   ├── connection.rs
│   │   └── migrations/
│   └── templates/               # Plantillas HTML para PDF
│       └── crypto/
│           ├── certificate.hbs
│           └── details.hbs
```

---

## Consideraciones de Escalabilidad y Mantenibilidad

### Principios Arquitectónicos

1. **Separación de Responsabilidades:** Cada capa (presentación, lógica, datos) debe estar claramente delimitada
2. **Modularidad:** Nuevas herramientas deben agregarse sin modificar código existente
3. **Comunicación Frontend-Backend:** Usar comandos Tauri con tipos fuertemente tipados en ambos lados
4. **Testing:** Cada módulo debe tener pruebas unitarias independientes
5. **Documentación:** Cada servicio, comando y modelo debe estar documentado

### Patrones de Diseño Recomendados

- **Repository Pattern:** Para acceso a base de datos
- **Service Layer:** Para lógica de negocio compleja
- **Factory Pattern:** Para generación de PDFs con diferentes tipos de certificados
- **Observer Pattern:** Para comunicación en tiempo real durante procesamiento

### Estrategias de Mantenibilidad

- **Versionado de Base de Datos:** Usar migraciones con control de versión
- **Configuración Externalizada:** Parámetros configurables fuera del código (ej. formatos de fecha, validaciones)
- **Logging Estructurado:** Implementar logging en ambos frontend y backend para facilitar debugging
- **Error Handling Consistente:** Definir tipos de error claros y mensajes de usuario amigables

### Escalabilidad Futura

- **Nuevas Herramientas:** Agregar módulos siguiendo la misma estructura modular
- **Exportación a Múltiples Formatos:** Extender el generador de reportes para soportar Excel, Word, etc.
- **Autenticación:** Preparar capa de servicios para soportar autenticación en el futuro
- **Sincronización Cloud:** Diseñar la capa de datos para soportar sync opcional con backend cloud

---

## Flujo Técnico Frontend ↔ Backend

### Flujo: Crear Empresa

```
1. Usuario completa formulario en Angular
2. Angular llama a empresa.service.ts → createEmpresa(data)
3. Service invoca comando Tauri: invoke('create_empresa', { empresa: data })
4. Rust recibe comando en empresa_commands.rs → create_empresa()
5. Valida datos (NIT único, campos obligatorios)
6. Llama a empresa_service.rs → create()
7. Service interactúa con DB → INSERT empresa
8. Retorna empresa creada con ID generado
9. Rust serializa respuesta y la envía a Angular
10. Angular actualiza UI y muestra mensaje de éxito
```

### Flujo: Procesar Excel y Generar Reportes

```
1. Usuario carga archivo Excel en Angular
2. Angular llama a crypto-report.service.ts → processExcel(filePath, selectedIds, year)
3. Service invoca comando Tauri: invoke('process_crypto_excel', { path, ids, year })
4. Rust recibe comando en report_commands.rs → process_crypto_excel()
5. Extrae NIT del nombre del archivo
6. Valida NIT en DB → get_empresa_by_nit()
7. Excel Processor lee archivo y valida headers
8. Agrupa registros por ID
9. Para cada grupo:
   a. Valida consistencia de ciudad
   b. Calcula totales
   c. Ordena transacciones por fecha
   d. Emite evento de progreso → emit_progress(id, order_code)
10. Angular escucha evento y actualiza UI en tiempo real
11. Rust genera reportes procesados
12. Retorna resumen de datos procesados a Angular
13. Usuario revisa resultados y selecciona IDs para exportar
14. Angular invoca: invoke('generate_pdfs', { reports, year, outputPath })
15. Rust genera PDFs usando plantillas Handlebars
16. Guarda PDFs en carpeta seleccionada
17. Retorna lista de archivos generados
18. Angular muestra mensaje de éxito
```

### Comunicación en Tiempo Real

**Eventos Tauri para Progreso:**

```rust
// Rust emite evento
use tauri::Manager;
app_handle.emit_all("processing-progress", ProgressPayload {
    stage: "Procesando ID",
    id: current_id,
    order_code: current_order_code,
    percentage: 45
}).unwrap();
```

```typescript
// Angular escucha evento
import { listen } from '@tauri-apps/api/event';

listen('processing-progress', (event) => {
  this.updateProgressBar(event.payload);
});
```

---

## Reglas de Negocio Consolidadas

### Gestión de Empresas

- NIT es obligatorio, único e inmutable una vez creado
- Imagen puede almacenarse en filesystem o base de datos
- Formatos de imagen aceptados: PNG, JPG, JPEG

### Procesamiento de Excel

- Formato de nombre de archivo obligatorio: `NIT-nombre.xlsx`
- Headers obligatorios: ORDER_CODE, ID, THIRD_NAME, CITY, TOTAL_PRICE, TRM, AMOUNT, CRYPTO_COIN, DATE, NIT
- NIT extraído del archivo debe corresponder a empresa existente
- Agrupación por ID es obligatoria
- Validación de ciudad por ID es crítica y no omitible
- Grupos con discrepancias de ciudad se marcan como inválidos y no se procesan

### Generación de Reportes

- Un reporte por cada ID válido
- Formato de nombre de PDF: `NIT_ID_fecha.pdf`
- Año del certificado debe ser solicitado al usuario
- Plantillas HTML/CSS para diseño de PDF
- Hoja 1: Certificado tributario con resumen
- Hoja 2: Detalle de movimientos (opcional si solo hay una transacción)
- Todos los valores numéricos con 2 decimales y separadores de miles
- Fechas en formato español legible

### Procesamiento Backend

- Todo procesamiento pesado en Rust
- Prohibido procesamiento pesado en frontend o Node.js
- Comunicación en tiempo real mediante eventos Tauri
- Barra de progreso con etapas claras

---

## Documentación Funcional Completa

### Contexto del Proyecto

**AMD Tools** es una aplicación de escritorio para producción destinada a una empresa de contabilidad. La aplicación centraliza múltiples funcionalidades contables y operativas, manteniendo orden, escalabilidad y mantenibilidad a largo plazo.

### Stack Tecnológico

- **Frontend:** Angular (SPA)
- **Backend:** Rust + Tauri (aplicación de escritorio)
- **Base de datos:** SQLite (local)
- **Arquitectura:** Modular por herramienta

### Principios del Producto

1. El valor está en la especificación, no en el código
2. El código es consecuencia directa de una buena definición funcional y técnica
3. Un producto simple puede (y debe) verse moderno, profesional y confiable
4. Es una aplicación de uso interno en producción, debe verse y sentirse profesional

### Alcance Inicial

**Incluye:**
- Angular SPA
- Rust + Tauri
- Base de datos local
- Scripts de compilación para Windows y macOS
- Diseño responsive (pantallas grandes, medianas y pequeñas)

**No incluye:**
- Autenticación
- Estado persistente global

---

**Fin del Documento — Historias de Usuario AMD Tools**

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Autor:** Equipo AMD Tools
