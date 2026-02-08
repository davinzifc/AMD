use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Firmante {
    pub id: Option<i64>,
    pub nombre: String,
    pub cc_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub firma_imagen: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub firma_mime: Option<String>,
}

/// Lightweight version for listing (no BLOB)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmanteListItem {
    pub id: i64,
    pub nombre: String,
    pub cc_id: String,
    pub has_firma: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFirmanteDto {
    pub nombre: String,
    pub cc_id: String,
    pub firma_imagen: Option<Vec<u8>>,
    pub firma_mime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFirmanteDto {
    pub nombre: Option<String>,
    pub cc_id: Option<String>,
    pub firma_imagen: Option<Vec<u8>>,
    pub firma_mime: Option<String>,
}
