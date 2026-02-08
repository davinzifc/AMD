use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Empresa {
    pub id: Option<i64>,
    pub nombre: String,
    pub nit: String,
    pub imagen_path: Option<String>,
    pub representante_nombre: String,
    pub representante_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmpresaDto {
    pub nombre: String,
    pub nit: String,
    pub imagen_path: Option<String>,
    pub representante_nombre: String,
    pub representante_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEmpresaDto {
    pub nombre: Option<String>,
    pub imagen_path: Option<String>,
    pub representante_nombre: Option<String>,
    pub representante_id: Option<String>,
}
