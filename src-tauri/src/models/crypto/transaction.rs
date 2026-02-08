use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawTransaction {
    pub row_number: usize,
    pub order_code: String,
    pub id: String,
    pub third_name: String,
    pub city: String,
    pub total_price: f64,
    pub trm: f64,
    pub amount: f64,
    pub crypto_coin: String,
    pub date: String,
    pub nit: String,
}

pub const REQUIRED_HEADERS: [&str; 10] = [
    "ORDER_CODE",
    "ID",
    "THIRD_NAME",
    "CITY",
    "TOTAL_PRICE",
    "TRM",
    "AMOUNT",
    "CRYPTO_COIN",
    "DATE",
    "NIT",
];
