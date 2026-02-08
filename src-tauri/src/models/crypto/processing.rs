use serde::{Deserialize, Serialize};

/// Resultado de un grupo procesado y validado
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedGroup {
    pub id: String,
    pub third_name: String,
    pub city: String,
    pub date_range: String,
    pub total_amount: f64,
    pub total_price: f64,
    pub retencion: String,
    pub transactions: Vec<TransactionDetail>,
    pub has_multiple_transactions: bool,
}

/// Detalle individual de transaccion (Hoja 2)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionDetail {
    pub date: String,
    pub order_code: String,
    pub amount: f64,
    pub trm: f64,
    pub total_price: f64,
}

/// Error de validacion de un grupo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub id: String,
    pub third_name: String,
    pub error_type: String,
    pub details: String,
    pub affected_rows: Vec<usize>,
}

/// Payload de evento de progreso
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressPayload {
    pub stage: String,
    pub current_id: Option<String>,
    pub current_order_code: Option<String>,
    pub current: usize,
    pub total: usize,
    pub percentage: u8,
}

/// Resultado final del procesamiento
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingResult {
    pub valid_groups: Vec<ProcessedGroup>,
    pub validation_errors: Vec<ValidationError>,
    pub total_processed: usize,
    pub total_valid: usize,
    pub total_invalid: usize,
}
