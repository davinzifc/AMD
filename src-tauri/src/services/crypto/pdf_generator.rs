//! Generación de PDFs para certificados crypto.
//!
//! Flujo: plantillas Handlebars (`.hbs`) → `build_template_data()` → HTML.
//! `prepare_pdf_htmls()` devuelve el HTML; el frontend (Angular + jsPDF/html2canvas) convierte a PDF y guarda con `write_pdf_file`.

use std::fs;
use std::path::Path;

use base64::{engine::general_purpose::STANDARD, Engine};
use handlebars::Handlebars;
use serde_json::json;

use crate::errors::AppError;
use crate::models::crypto::firmante::Firmante;
use crate::models::crypto::{Empresa, ProcessedGroup};

/// Formatea NIT (solo dígitos) con separador de miles: 1111111 => 1.111.111
fn format_nit(nit: &str) -> String {
    let digits: String = nit.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return nit.to_string();
    }
    let mut result = String::new();
    let chars: Vec<char> = digits.chars().rev().collect();
    for (i, c) in chars.iter().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.push('.');
        }
        result.push(*c);
    }
    result.chars().rev().collect()
}

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

/// Build Handlebars template data for a ProcessedGroup.
/// `empresa_imagen_override`: cuando el PDF se genera en el frontend, pasar aquí el logo como data URI;
/// si es None, se usa `empresa.imagen_path` (ruta de archivo).
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
        "empresa_nit_formatted": format_nit(&empresa.nit),
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

/// Result item for prepare_pdf_htmls: file name and HTML content (for frontend to convert to PDF).
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
