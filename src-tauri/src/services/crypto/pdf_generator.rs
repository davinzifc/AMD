//! Generación de PDFs para certificados crypto.
//!
//! Flujo con plantillas:
//! 1. **Plantilla**: Handlebars (`.hbs`) en `templates/crypto/` (certificate.hbs, details.hbs).
//! 2. **Rellenar**: `build_template_data()` inyecta datos (empresa, tercero, transacciones, año, firmante).
//! 3. **HTML**: `hbs.render("certificate", &data)` produce HTML final.
//! 4. **Exportar PDF**:
//!    - **Backend (wkhtmltopdf)**: `generate_pdfs()` escribe HTML a disco y llama a wkhtmltopdf (requiere binario instalado).
//!    - **Frontend (html2pdf.js)**: `prepare_pdf_htmls()` devuelve el HTML; Angular convierte a PDF con html2pdf.js y guarda con `write_pdf_file`.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use handlebars::Handlebars;
use serde_json::json;
use tauri::{AppHandle, Emitter};

use base64::{engine::general_purpose::STANDARD, Engine};

use crate::errors::AppError;
use crate::models::crypto::firmante::Firmante;
use crate::models::crypto::{Empresa, ProcessedGroup, ProgressPayload};

/// Formats a number with Colombian locale: dots for thousands, comma for decimals
fn format_colombian(value: f64) -> String {
    let rounded = (value * 100.0).round() / 100.0;
    let is_negative = rounded < 0.0;
    let abs_val = rounded.abs();
    let integer_part = abs_val.trunc() as u64;
    let decimal_part = ((abs_val - abs_val.trunc()) * 100.0).round() as u64;

    let int_str = integer_part.to_string();
    let mut formatted = String::new();
    for (i, c) in int_str.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            formatted.push('.');
        }
        formatted.push(c);
    }
    let formatted: String = formatted.chars().rev().collect();
    let result = format!("{},{:02}", formatted, decimal_part);
    if is_negative {
        format!("-{}", result)
    } else {
        result
    }
}

/// Finds wkhtmltopdf binary.
/// 1. Sidecar: next to the app executable (bundled by Tauri)
/// 2. macOS: binario real dentro del .app (Homebrew cask instala un wrapper en PATH que abre la GUI)
/// 3. Rutas comunes del sistema
/// 4. PATH (which/where)
fn find_wkhtmltopdf() -> Result<PathBuf, AppError> {
    // 1. Check sidecar location (next to the executable)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let sidecar_name = if cfg!(target_os = "windows") {
                "wkhtmltopdf.exe"
            } else {
                "wkhtmltopdf"
            };
            let sidecar_path = exe_dir.join(sidecar_name);
            if sidecar_path.exists() {
                return Ok(sidecar_path);
            }
        }
    }

    // 2. macOS: el binario CLI real está dentro del .app; el de /opt/homebrew/bin puede ser un wrapper que abre la GUI
    #[cfg(target_os = "macos")]
    {
        let app_binary = Path::new("/Applications/wkhtmltopdf.app/Contents/MacOS/wkhtmltopdf");
        if app_binary.exists() {
            return Ok(app_binary.to_path_buf());
        }
    }

    // 3. Check common system locations
    let candidates = [
        "/usr/local/bin/wkhtmltopdf",
        "/usr/bin/wkhtmltopdf",
        "/opt/homebrew/bin/wkhtmltopdf",
    ];
    for path in &candidates {
        if Path::new(path).exists() {
            return Ok(PathBuf::from(path));
        }
    }

    // 4. Try PATH via `which` (macOS/Linux) or `where` (Windows)
    let which_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };
    if let Ok(output) = Command::new(which_cmd).arg("wkhtmltopdf").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() && Path::new(&path).exists() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(AppError::Pdf(
        "wkhtmltopdf no encontrado. Para desarrollo, instale con: brew install wkhtmltopdf. \
         Para produccion, se empaqueta automaticamente con la app."
            .to_string(),
    ))
}

/// Converts HTML to PDF using wkhtmltopdf.
/// Genera primero en un archivo temporal (el subproceso puede escribir en /tmp)
/// y luego copia al destino final (el proceso principal tiene permiso si el usuario eligió la carpeta).
fn html_to_pdf(wkhtmltopdf: &Path, html_path: &Path, pdf_path: &Path) -> Result<(), AppError> {
    let html_abs = html_path
        .canonicalize()
        .map_err(|e| AppError::Pdf(format!("Ruta HTML no accesible {}: {}", html_path.display(), e)))?;
    let pdf_abs = if pdf_path.is_absolute() {
        let parent = pdf_path
            .parent()
            .ok_or_else(|| AppError::Pdf("Ruta PDF sin directorio".to_string()))?;
        let parent_abs = parent
            .canonicalize()
            .map_err(|e| AppError::Pdf(format!("Directorio de salida no accesible {}: {}", parent.display(), e)))?;
        parent_abs.join(
            pdf_path
                .file_name()
                .ok_or_else(|| AppError::Pdf("Ruta PDF sin nombre de archivo".to_string()))?,
        )
    } else {
        let cwd = std::env::current_dir().map_err(|e| AppError::Pdf(format!("No se pudo obtener directorio actual: {}", e)))?;
        cwd.join(pdf_path)
    };

    // Generar en /tmp con nombre fijo (evita problemas de ruta/caracteres en el subproceso)
    let temp_dir = std::env::temp_dir();
    let temp_pdf_name = "amd_wkhtmltopdf_out.pdf";
    let temp_pdf = temp_dir.join(temp_pdf_name);

    log::info!(
        "Generando PDF: {} -> temp -> {}",
        html_abs.display(),
        pdf_abs.display()
    );

    let mut cmd = Command::new(wkhtmltopdf);
    cmd.current_dir(&temp_dir)
        .arg("--page-size")
        .arg("Letter")
        .arg("--margin-top")
        .arg("20mm")
        .arg("--margin-bottom")
        .arg("15mm")
        .arg("--margin-left")
        .arg("20mm")
        .arg("--margin-right")
        .arg("20mm")
        .arg("--encoding")
        .arg("UTF-8")
        .arg("--enable-local-file-access")
        .arg(html_abs.as_os_str())
        .arg(temp_pdf_name);

    // En macOS, wkhtmltopdf puede abrir una ventana y no terminar hasta tener foco.
    // Forzar modo headless para que genere el PDF sin display.
    #[cfg(target_os = "macos")]
    cmd.env("QT_QPA_PLATFORM", "offscreen");

    let output = cmd
        .output()
        .map_err(|e| AppError::Pdf(format!("Error ejecutando wkhtmltopdf: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !output.status.success() {
        return Err(AppError::Pdf(format!(
            "wkhtmltopdf fallo (exit code {:?}). stderr: {} stdout: {}",
            output.status.code(),
            stderr.trim(),
            stdout.trim()
        )));
    }

    if !stderr.trim().is_empty() {
        log::warn!("wkhtmltopdf stderr: {}", stderr.trim());
    }

    if !temp_pdf.exists() {
        return Err(AppError::Pdf(format!(
            "wkhtmltopdf reporto exito pero el archivo no fue creado en temp: {}. stderr: {} stdout: {}",
            temp_pdf.display(),
            stderr.trim(),
            stdout.trim()
        )));
    }

    let meta = fs::metadata(&temp_pdf).map_err(|e| AppError::Pdf(format!("No se pudo verificar PDF temporal: {}", e)))?;
    if meta.len() == 0 {
        let _ = fs::remove_file(&temp_pdf);
        return Err(AppError::Pdf("El PDF generado esta vacio (0 bytes).".to_string()));
    }

    fs::copy(&temp_pdf, &pdf_abs).map_err(|e| {
        let _ = fs::remove_file(&temp_pdf);
        AppError::Pdf(format!(
            "No se pudo copiar el PDF al destino {}: {}",
            pdf_abs.display(),
            e
        ))
    })?;
    let _ = fs::remove_file(&temp_pdf);

    let metadata = fs::metadata(&pdf_abs)
        .map_err(|e| AppError::Pdf(format!("No se pudo verificar el PDF generado: {}", e)))?;

    log::info!("PDF generado exitosamente: {} ({} bytes)", pdf_abs.display(), metadata.len());
    Ok(())
}

/// Build Handlebars template data for a ProcessedGroup.
/// `empresa_imagen_override`: cuando el PDF se genera en el navegador (html2pdf.js), pasar aquí
/// el logo como data URI; si es None, se usa empresa.imagen_path (ruta de archivo, válida para wkhtmltopdf).
fn build_template_data(
    group: &ProcessedGroup,
    empresa: &Empresa,
    year: &str,
    firmante: Option<&Firmante>,
    empresa_imagen_override: Option<&str>,
) -> serde_json::Value {
    let transactions_formatted: Vec<serde_json::Value> = group
        .transactions
        .iter()
        .map(|t| {
            json!({
                "date": t.date,
                "order_code": t.order_code,
                "amount": format_colombian(t.amount),
                "trm": format_colombian(t.trm),
                "total_price": format_colombian(t.total_price),
            })
        })
        .collect();

    // Representante legal de la empresa (siempre el registrado en la empresa) — para el cuerpo del texto
    let representante_legal_nombre = empresa.representante_nombre.clone();
    let representante_legal_id = empresa.representante_id.clone();

    // Quien firma: firmante si existe, si no el representante legal — para la sección de firma + imagen
    let (firma_nombre, firma_id) = if let Some(f) = firmante {
        (f.nombre.clone(), f.cc_id.clone())
    } else {
        (empresa.representante_nombre.clone(), empresa.representante_id.clone())
    };

    // Imagen de firma del firmante (guardada en firmantes); solo existe si hay firmante con imagen
    let firmante_imagen = firmante.and_then(|f| {
        if let (Some(ref img), Some(ref mime)) = (&f.firma_imagen, &f.firma_mime) {
            let b64 = STANDARD.encode(img);
            Some(format!("data:{};base64,{}", mime, b64))
        } else {
            None
        }
    });

    let empresa_imagen = empresa_imagen_override
        .map(String::from)
        .or_else(|| empresa.imagen_path.clone());

    json!({
        "empresa_nombre": empresa.nombre,
        "empresa_nit": empresa.nit,
        "empresa_imagen": empresa_imagen,
        "representante_legal_nombre": representante_legal_nombre,
        "representante_legal_id": representante_legal_id,
        "firma_nombre": firma_nombre,
        "firma_id": firma_id,
        "firmante_imagen": firmante_imagen,
        "year": year,
        "id": group.id,
        "third_name": group.third_name,
        "city": group.city,
        "date_range": group.date_range,
        "total_amount": format_colombian(group.total_amount),
        "total_price": format_colombian(group.total_price),
        "retencion": group.retencion,
        "transactions": transactions_formatted,
        "has_multiple_transactions": group.has_multiple_transactions,
    })
}

/// Emits PDF generation progress event
fn emit_pdf_progress(app_handle: &AppHandle, current_id: &str, current: usize, total: usize) {
    let percentage = if total > 0 {
        ((current * 100) / total).min(100) as u8
    } else {
        0
    };
    let payload = ProgressPayload {
        stage: "Generando PDF".to_string(),
        current_id: Some(current_id.to_string()),
        current_order_code: None,
        current,
        total,
        percentage,
    };
    let _ = app_handle.emit("pdf-progress", &payload);
}

/// Generates PDFs for the selected groups.
/// Uses Handlebars HTML/CSS templates + wkhtmltopdf (bundled sidecar).
pub fn generate_pdfs(
    app_handle: &AppHandle,
    groups: &[ProcessedGroup],
    empresa: &Empresa,
    year: &str,
    output_dir: &str,
    include_details: bool,
    firmante: Option<&Firmante>,
) -> Result<Vec<String>, AppError> {
    let wkhtmltopdf = find_wkhtmltopdf()?;

    // Resolver directorio de salida a ruta absoluta para que wkhtmltopdf escriba en el lugar correcto
    let output_path = {
        let p = Path::new(output_dir);
        let abs = if p.is_absolute() {
            p.to_path_buf()
        } else {
            std::env::current_dir().map_err(AppError::Io)?.join(p)
        };
        if !abs.exists() {
            fs::create_dir_all(&abs).map_err(AppError::Io)?;
        }
        abs.canonicalize().map_err(AppError::Io)?
    };

    // Load Handlebars templates (embedded in binary via include_str!)
    let mut hbs = Handlebars::new();
    hbs.set_strict_mode(false);

    let cert_template = include_str!("../../../templates/crypto/certificate.hbs");
    let detail_template = include_str!("../../../templates/crypto/details.hbs");

    hbs.register_template_string("certificate", cert_template)
        .map_err(|e| AppError::Pdf(format!("Error en template certificate: {}", e)))?;
    hbs.register_template_string("details", detail_template)
        .map_err(|e| AppError::Pdf(format!("Error en template details: {}", e)))?;

    let total = groups.len();
    let mut generated_files: Vec<String> = Vec::new();

    // Temp dir for HTML intermediates
    let temp_dir = output_path.join(".tmp_html");
    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir).map_err(|e| AppError::Io(e))?;
    }

    for (i, group) in groups.iter().enumerate() {
        emit_pdf_progress(app_handle, &group.id, i + 1, total);

        let data = build_template_data(group, empresa, year, firmante, None);
        let safe_id = group
            .id
            .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' '], "_");

        // Certificate (Hoja 1)
        let cert_html = hbs
            .render("certificate", &data)
            .map_err(|e| AppError::Pdf(format!("Error renderizando certificado {}: {}", group.id, e)))?;

        let pdf_name = format!("{}_{}_AG{}.pdf", empresa.nit, safe_id, year);
        let html_path = temp_dir.join(format!("{}_cert.html", safe_id));
        let pdf_path = output_path.join(&pdf_name);

        fs::write(&html_path, &cert_html).map_err(|e| AppError::Io(e))?;
        html_to_pdf(&wkhtmltopdf, &html_path, &pdf_path)?;
        generated_files.push(pdf_name);

        // Details (Hoja 2) — solo si se solicita y tiene multiples transacciones
        if include_details && group.has_multiple_transactions {
            let detail_html = hbs
                .render("details", &data)
                .map_err(|e| AppError::Pdf(format!("Error renderizando detalle {}: {}", group.id, e)))?;

            let detail_name = format!("{}_{}_AG{}_detalle.pdf", empresa.nit, safe_id, year);
            let detail_html_path = temp_dir.join(format!("{}_detail.html", safe_id));
            let detail_pdf_path = output_path.join(&detail_name);

            fs::write(&detail_html_path, &detail_html).map_err(|e| AppError::Io(e))?;
            html_to_pdf(&wkhtmltopdf, &detail_html_path, &detail_pdf_path)?;
            generated_files.push(detail_name);
        }
    }

    // Cleanup temp files
    let _ = fs::remove_dir_all(&temp_dir);

    Ok(generated_files)
}

/// Result item for prepare_pdf_htmls: file name and HTML content (for frontend to convert with html2pdf.js).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PdfHtmlItem {
    pub pdf_file_name: String,
    pub html: String,
}

/// Convierte la ruta del logo de la empresa en data URI para que el HTML sea autocontenido en el navegador.
fn empresa_imagen_as_data_uri(empresa: &Empresa) -> Option<String> {
    let path = empresa.imagen_path.as_ref()?;
    let path = Path::new(path);
    if !path.exists() {
        return None;
    }
    let bytes = fs::read(path).ok()?;
    let mime = infer_image_mime(path);
    let b64 = STANDARD.encode(&bytes);
    Some(format!("data:{};base64,{}", mime, b64))
}

fn infer_image_mime(path: &Path) -> &'static str {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/jpeg",
    }
}

/// Prepara el HTML de cada PDF (sin wkhtmltopdf).
/// Flujo: plantilla Handlebars → rellenar con datos → HTML; el frontend convierte a PDF con html2pdf.js y escribe con write_pdf_file.
pub fn prepare_pdf_htmls(
    groups: &[ProcessedGroup],
    empresa: &Empresa,
    year: &str,
    output_dir: &str,
    include_details: bool,
    firmante: Option<&Firmante>,
) -> Result<(String, Vec<PdfHtmlItem>), AppError> {
    let output_path = {
        let p = Path::new(output_dir);
        let abs = if p.is_absolute() {
            p.to_path_buf()
        } else {
            std::env::current_dir().map_err(AppError::Io)?.join(p)
        };
        if !abs.exists() {
            fs::create_dir_all(&abs).map_err(AppError::Io)?;
        }
        abs.canonicalize().map_err(AppError::Io)?
    };

    let mut hbs = Handlebars::new();
    hbs.set_strict_mode(false);

    let cert_template = include_str!("../../../templates/crypto/certificate.hbs");
    let detail_template = include_str!("../../../templates/crypto/details.hbs");
    let detail_section_template = include_str!("../../../templates/crypto/details_section.hbs");

    hbs.register_template_string("certificate", cert_template)
        .map_err(|e| AppError::Pdf(format!("Error en template certificate: {}", e)))?;
    hbs.register_template_string("details", detail_template)
        .map_err(|e| AppError::Pdf(format!("Error en template details: {}", e)))?;
    hbs.register_template_string("details_section", detail_section_template)
        .map_err(|e| AppError::Pdf(format!("Error en template details_section: {}", e)))?;

    let mut items: Vec<PdfHtmlItem> = Vec::new();
    let empresa_imagen_uri = empresa_imagen_as_data_uri(empresa);

    for group in groups {
        let data = build_template_data(group, empresa, year, firmante, empresa_imagen_uri.as_deref());
        let safe_id = group
            .id
            .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' '], "_");

        let cert_html = hbs
            .render("certificate", &data)
            .map_err(|e| AppError::Pdf(format!("Error renderizando certificado {}: {}", group.id, e)))?;

        let pdf_name = format!("{}_{}_AG{}.pdf", empresa.nit, safe_id, year);

        let html = if include_details && group.has_multiple_transactions {
            let details_body = hbs
                .render("details_section", &data)
                .map_err(|e| AppError::Pdf(format!("Error renderizando detalle {}: {}", group.id, e)))?;
            let page_break = r#"<div class="html2pdf__page-break" style="page-break-before: always;"></div>"#;
            cert_html
                .trim_end()
                .strip_suffix("</body></html>")
                .unwrap_or(cert_html.trim_end())
                .to_string()
                + page_break
                + &details_body
                + "\n</body></html>"
        } else {
            cert_html
        };

        items.push(PdfHtmlItem {
            pdf_file_name: pdf_name,
            html,
        });
    }

    let output_dir_str = output_path
        .to_str()
        .ok_or_else(|| AppError::Pdf("Ruta de salida no válida UTF-8".to_string()))?
        .to_string();

    Ok((output_dir_str, items))
}
