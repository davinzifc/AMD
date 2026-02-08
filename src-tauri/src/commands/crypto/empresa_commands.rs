use std::fs;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use base64::{engine::general_purpose::STANDARD, Engine};

use crate::db::DbPool;
use crate::models::crypto::{CreateEmpresaDto, Empresa, UpdateEmpresaDto};
use crate::services::crypto::empresa_service;

fn extension_from_mime(mime: &str) -> &'static str {
    match mime {
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "jpg",
    }
}

#[derive(Debug, Serialize)]
pub struct EmpresaImagenResult {
    pub imagen_base64: String,
    pub mime: String,
}

#[tauri::command]
pub fn create_empresa(
    db: State<'_, DbPool>,
    empresa: CreateEmpresaDto,
) -> Result<Empresa, String> {
    empresa_service::create(&db, empresa).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_empresa_by_nit(
    db: State<'_, DbPool>,
    nit: String,
) -> Result<Option<Empresa>, String> {
    empresa_service::get_by_nit(&db, &nit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_empresa(
    db: State<'_, DbPool>,
    nit: String,
    empresa: UpdateEmpresaDto,
) -> Result<Empresa, String> {
    empresa_service::update(&db, &nit, empresa).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_empresas(
    db: State<'_, DbPool>,
) -> Result<Vec<Empresa>, String> {
    empresa_service::list(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_empresa(db: State<'_, DbPool>, nit: String) -> Result<(), String> {
    empresa_service::delete(&db, &nit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_empresa_imagen(
    db: State<'_, DbPool>,
    nit: String,
) -> Result<Option<EmpresaImagenResult>, String> {
    let empresa = match empresa_service::get_by_nit(&db, &nit).map_err(|e| e.to_string())? {
        Some(e) => e,
        None => return Ok(None),
    };
    let (bytes, mime) = match empresa_service::get_imagen_bytes(&empresa) {
        Some(b) => b,
        None => return Ok(None),
    };
    let imagen_base64 = STANDARD.encode(&bytes);
    Ok(Some(EmpresaImagenResult {
        imagen_base64,
        mime,
    }))
}

/// Guarda la imagen del logo de la empresa en el directorio de datos de la app
/// y devuelve la ruta absoluta para almacenarla en la empresa.
#[tauri::command]
pub fn save_empresa_imagen(
    app: AppHandle,
    nit: String,
    contents_base64: String,
    mime: String,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener directorio de datos: {}", e))?;

    let logos_dir = app_data_dir.join("empresa_logos");
    fs::create_dir_all(&logos_dir).map_err(|e| format!("No se pudo crear carpeta de logos: {}", e))?;

    let safe_nit = nit.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' '], "_");
    let ext = extension_from_mime(&mime);
    let file_name = format!("{}.{}", safe_nit, ext);
    let path = logos_dir.join(&file_name);

    let bytes = STANDARD
        .decode(&contents_base64)
        .map_err(|e| format!("Contenido de imagen inválido: {}", e))?;

    fs::write(&path, &bytes).map_err(|e| format!("No se pudo guardar la imagen: {}", e))?;

    path.into_os_string()
        .into_string()
        .map_err(|_| "Ruta de imagen no válida UTF-8".to_string())
}
