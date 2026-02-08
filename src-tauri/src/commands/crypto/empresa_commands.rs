use tauri::State;

use crate::db::DbPool;
use crate::models::crypto::{CreateEmpresaDto, Empresa, UpdateEmpresaDto};
use crate::services::crypto::empresa_service;

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
