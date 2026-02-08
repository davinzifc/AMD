use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DbPool;
use crate::models::crypto::firmante::{
    CreateFirmanteDto, Firmante, FirmanteListItem, UpdateFirmanteDto,
};
use crate::services::crypto::firmante_service;

#[tauri::command]
pub fn create_firmante(
    db: State<'_, DbPool>,
    firmante: CreateFirmanteDto,
) -> Result<Firmante, String> {
    firmante_service::create(&db, firmante).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_firmante(db: State<'_, DbPool>, id: i64) -> Result<Option<Firmante>, String> {
    firmante_service::get_by_id(&db, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_firmante(
    db: State<'_, DbPool>,
    id: i64,
    firmante: UpdateFirmanteDto,
) -> Result<Firmante, String> {
    firmante_service::update(&db, id, firmante).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_firmante(db: State<'_, DbPool>, id: i64) -> Result<(), String> {
    firmante_service::delete(&db, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_firmantes(db: State<'_, DbPool>) -> Result<Vec<FirmanteListItem>, String> {
    firmante_service::list(&db).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmaImagenResult {
    pub imagen: Vec<u8>,
    pub mime: String,
}

#[tauri::command]
pub fn get_firma_imagen(
    db: State<'_, DbPool>,
    id: i64,
) -> Result<Option<FirmaImagenResult>, String> {
    firmante_service::get_firma_imagen(&db, id)
        .map(|opt| opt.map(|(imagen, mime)| FirmaImagenResult { imagen, mime }))
        .map_err(|e| e.to_string())
}
