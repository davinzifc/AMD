use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Empresa {
    pub id: Option<i64>,
    pub nombre: String,
    pub nit: String,
    pub imagen_path: Option<String>,
    pub representante_nombre: String,
    pub representante_id: String,
    pub tipo_documento: String,
    pub genero_representante: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmpresaDto {
    pub nombre: String,
    pub nit: String,
    pub imagen_path: Option<String>,
    pub representante_nombre: String,
    pub representante_id: String,
    pub tipo_documento: String,
    pub genero_representante: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEmpresaDto {
    pub nombre: Option<String>,
    pub nit: Option<String>,
    pub imagen_path: Option<String>,
    pub representante_nombre: Option<String>,
    pub representante_id: Option<String>,
    pub tipo_documento: Option<String>,
    pub genero_representante: Option<String>,
}
