use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::db::DbPool;
use crate::models::crypto::{Empresa, ProcessedGroup, ProcessingResult, RawTransaction};
use crate::services::crypto::{data_processor, empresa_service, excel_processor, pdf_generator};

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

#[tauri::command]
pub fn generate_pdfs(
    app_handle: AppHandle,
    db: State<'_, DbPool>,
    groups: Vec<ProcessedGroup>,
    empresa_nit: String,
    year: String,
    output_dir: String,
    include_details: bool,
) -> Result<GeneratePdfsResult, String> {
    let empresa = empresa_service::get_by_nit(&db, &empresa_nit)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Empresa con NIT '{}' no encontrada", empresa_nit))?;

    let files = pdf_generator::generate_pdfs(
        &app_handle,
        &groups,
        &empresa,
        &year,
        &output_dir,
        include_details,
    )
    .map_err(|e| e.to_string())?;

    let total = files.len();
    Ok(GeneratePdfsResult {
        generated_files: files,
        total_files: total,
        output_dir,
    })
}
