use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use std::path::Path;

use base64::{engine::general_purpose::STANDARD, Engine};

use crate::db::DbPool;
use crate::models::crypto::{Empresa, ProcessedGroup, ProcessingResult, RawTransaction};
use crate::services::crypto::{data_processor, empresa_service, excel_processor, firmante_service, pdf_generator};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelUploadResult {
    pub empresa: Empresa,
    pub transactions: Vec<RawTransaction>,
    pub total_rows: usize,
}

#[tauri::command]
pub fn upload_excel(
    db: State<'_, DbPool>,
    file_path: String,
) -> Result<ExcelUploadResult, String> {
    let (nit, transactions) =
        excel_processor::parse_excel(&file_path).map_err(|e| e.to_string())?;

    let empresa = empresa_service::get_by_nit(&db, &nit)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| {
            format!(
                "El NIT '{}' extraido del archivo no corresponde a ninguna empresa registrada",
                nit
            )
        })?;

    let total_rows = transactions.len();

    Ok(ExcelUploadResult {
        empresa,
        transactions,
        total_rows,
    })
}

#[tauri::command]
pub fn process_selected_records(
    app_handle: AppHandle,
    transactions: Vec<RawTransaction>,
    selected_ids: Vec<String>,
) -> Result<ProcessingResult, String> {
    data_processor::process_transactions(&app_handle, &transactions, &selected_ids)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratePdfsRequest {
    pub groups: Vec<ProcessedGroup>,
    pub empresa_nit: String,
    pub year: String,
    pub output_dir: String,
    pub include_details: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratePdfsResult {
    pub generated_files: Vec<String>,
    pub total_files: usize,
    pub output_dir: String,
}

/// Generación de PDFs con wkhtmltopdf (deprecado). La app usa prepare_pdf_htmls + html2pdf.js en el frontend.
#[tauri::command]
pub fn generate_pdfs(
    _app_handle: AppHandle,
    _db: State<'_, DbPool>,
    _groups: Vec<ProcessedGroup>,
    _empresa_nit: String,
    _year: String,
    _output_dir: String,
    _include_details: bool,
    _firmante_id: Option<i64>,
) -> Result<GeneratePdfsResult, String> {
    Err(
        "La generación de PDFs ya no usa wkhtmltopdf. Use el botón de la app (genera con html2pdf.js). \
         Si sigue viendo un error de wkhtmltopdf, recargue la aplicación (Ctrl+R o Cmd+R) para cargar la versión actualizada."
            .to_string(),
    )
}

/// Resultado de prepare_pdf_htmls: directorio y lista de (nombre PDF, HTML).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreparePdfHtmlsResult {
    pub output_dir: String,
    pub items: Vec<pdf_generator::PdfHtmlItem>,
}

/// Prepara el HTML de cada PDF. El frontend convierte a PDF con html2pdf.js y escribe con write_pdf_file.
#[tauri::command]
pub fn prepare_pdf_htmls(
    db: State<'_, DbPool>,
    groups: Vec<ProcessedGroup>,
    empresa_nit: String,
    year: String,
    output_dir: String,
    include_details: bool,
    firmante_id: Option<i64>,
) -> Result<PreparePdfHtmlsResult, String> {
    let empresa = empresa_service::get_by_nit(&db, &empresa_nit)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Empresa con NIT '{}' no encontrada", empresa_nit))?;

    let firmante = if let Some(fid) = firmante_id {
        firmante_service::get_by_id(&db, fid).map_err(|e| e.to_string())?
    } else {
        None
    };

    let (output_dir_resolved, items) = pdf_generator::prepare_pdf_htmls(
        &groups,
        &empresa,
        &year,
        &output_dir,
        include_details,
        firmante.as_ref(),
    )
    .map_err(|e| e.to_string())?;

    Ok(PreparePdfHtmlsResult {
        output_dir: output_dir_resolved,
        items,
    })
}

/// Escribe un archivo PDF en el directorio indicado (contenido en base64). Usado tras generar PDF en frontend con html2pdf.js.
#[tauri::command]
pub fn write_pdf_file(
    output_dir: String,
    file_name: String,
    contents_base64: String,
) -> Result<(), String> {
    // Evitar path traversal: el nombre no debe contener path separadores
    if file_name.contains('/') || file_name.contains('\\') {
        return Err("Nombre de archivo no válido".to_string());
    }
    if file_name.is_empty() || file_name == "." || file_name == ".." {
        return Err("Nombre de archivo no válido".to_string());
    }

    let bytes = STANDARD
        .decode(&contents_base64)
        .map_err(|e| format!("Contenido PDF inválido (base64): {}", e))?;

    let path = Path::new(&output_dir).join(&file_name);
    std::fs::write(&path, &bytes).map_err(|e| format!("No se pudo escribir el archivo: {}", e))?;

    Ok(())
}

/// Devuelve el directorio temporal del sistema. Útil para vista previa de PDF sin pedir carpeta al usuario.
#[tauri::command]
pub fn get_temp_dir() -> String {
    std::env::temp_dir()
        .to_str()
        .unwrap_or("/tmp")
        .to_string()
}
