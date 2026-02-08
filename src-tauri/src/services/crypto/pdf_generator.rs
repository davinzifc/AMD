use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use handlebars::Handlebars;
use serde_json::json;
use tauri::{AppHandle, Emitter};

use crate::errors::AppError;
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
/// 2. Fallback: system PATH (for development)
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

    // 2. Check common system locations
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

    // 3. Try PATH via `which` (macOS/Linux) or `where` (Windows)
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

/// Converts HTML to PDF using wkhtmltopdf
fn html_to_pdf(wkhtmltopdf: &Path, html_path: &Path, pdf_path: &Path) -> Result<(), AppError> {
    let output = Command::new(wkhtmltopdf)
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
        .arg("--quiet")
        .arg("--enable-local-file-access")
        .arg(html_path.to_str().unwrap_or(""))
        .arg(pdf_path.to_str().unwrap_or(""))
        .output()
        .map_err(|e| AppError::Pdf(format!("Error ejecutando wkhtmltopdf: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Pdf(format!(
            "wkhtmltopdf fallo: {}",
            stderr.trim()
        )));
    }

    Ok(())
}

/// Build Handlebars template data for a ProcessedGroup
fn build_template_data(
    group: &ProcessedGroup,
    empresa: &Empresa,
    year: &str,
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

    json!({
        "empresa_nombre": empresa.nombre,
        "empresa_nit": empresa.nit,
        "empresa_imagen": empresa.imagen_path,
        "representante_nombre": empresa.representante_nombre,
        "representante_id": empresa.representante_id,
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
) -> Result<Vec<String>, AppError> {
    let wkhtmltopdf = find_wkhtmltopdf()?;
    let output_path = Path::new(output_dir);

    if !output_path.exists() {
        fs::create_dir_all(output_path).map_err(|e| AppError::Io(e))?;
    }

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

        let data = build_template_data(group, empresa, year);
        let safe_id = group
            .id
            .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");

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
