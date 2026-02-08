use std::collections::HashMap;
use std::path::Path;

use calamine::{open_workbook_auto, Data, DataType, Reader};

use crate::errors::AppError;
use crate::models::crypto::{RawTransaction, REQUIRED_HEADERS};

pub fn extract_nit_from_filename(file_path: &str) -> Result<String, AppError> {
    let path = Path::new(file_path);
    let filename = path
        .file_name()
        .and_then(|f| f.to_str())
        .ok_or_else(|| AppError::Validation("Ruta de archivo invalida".into()))?;

    let name_without_ext = filename
        .strip_suffix(".xlsx")
        .or_else(|| filename.strip_suffix(".XLSX"))
        .ok_or_else(|| {
            AppError::Validation("El archivo debe tener extension .xlsx".into())
        })?;

    let nit = name_without_ext
        .split('-')
        .next()
        .ok_or_else(|| {
            AppError::Validation(
                "Formato de nombre invalido. Debe ser: NIT-nombre.xlsx".into(),
            )
        })?;

    if nit.is_empty() {
        return Err(AppError::Validation(
            "El NIT no puede estar vacio en el nombre del archivo".into(),
        ));
    }

    Ok(nit.to_string())
}

pub fn parse_excel(file_path: &str) -> Result<(String, Vec<RawTransaction>), AppError> {
    let nit = extract_nit_from_filename(file_path)?;

    let mut workbook = open_workbook_auto(file_path)
        .map_err(|e| AppError::Excel(format!("No se pudo abrir el archivo: {}", e)))?;

    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err(AppError::Excel("El archivo no contiene hojas".into()));
    }

    let range = workbook
        .worksheet_range(&sheet_names[0])
        .map_err(|e| AppError::Excel(format!("No se pudo leer la hoja: {}", e)))?;

    let header_map = validate_headers(&range)?;
    let transactions = parse_rows(&range, &header_map)?;

    if transactions.is_empty() {
        return Err(AppError::Excel(
            "El archivo no contiene registros de datos".into(),
        ));
    }

    Ok((nit, transactions))
}

fn validate_headers(
    range: &calamine::Range<Data>,
) -> Result<HashMap<String, usize>, AppError> {
    let first_row = range.rows().next().ok_or_else(|| {
        AppError::Excel("El archivo esta vacio".into())
    })?;

    let headers: Vec<String> = first_row
        .iter()
        .map(|cell| cell.to_string().trim().to_uppercase())
        .collect();

    let mut header_map = HashMap::new();
    let mut missing = Vec::new();

    for required in &REQUIRED_HEADERS {
        if let Some(pos) = headers.iter().position(|h| h == required) {
            header_map.insert(required.to_string(), pos);
        } else {
            missing.push(*required);
        }
    }

    if !missing.is_empty() {
        return Err(AppError::Validation(format!(
            "Faltan los siguientes encabezados obligatorios: {}",
            missing.join(", ")
        )));
    }

    Ok(header_map)
}

fn parse_rows(
    range: &calamine::Range<Data>,
    header_map: &HashMap<String, usize>,
) -> Result<Vec<RawTransaction>, AppError> {
    let mut transactions = Vec::new();

    for (row_idx, row) in range.rows().enumerate().skip(1) {
        if row.iter().all(|cell| cell.is_empty()) {
            continue;
        }

        let get_str = |key: &str| -> String {
            header_map
                .get(key)
                .and_then(|&idx| row.get(idx))
                .map(|cell| cell.to_string().trim().to_string())
                .unwrap_or_default()
        };

        let get_f64 = |key: &str| -> f64 {
            header_map
                .get(key)
                .and_then(|&idx| row.get(idx))
                .and_then(|cell| cell.get_float())
                .unwrap_or(0.0)
        };

        let transaction = RawTransaction {
            row_number: row_idx + 1,
            order_code: get_str("ORDER_CODE"),
            id: get_str("ID"),
            third_name: get_str("THIRD_NAME"),
            city: get_str("CITY"),
            total_price: get_f64("TOTAL_PRICE"),
            trm: get_f64("TRM"),
            amount: get_f64("AMOUNT"),
            crypto_coin: get_str("CRYPTO_COIN"),
            date: get_str("DATE"),
            nit: get_str("NIT"),
        };

        transactions.push(transaction);
    }

    Ok(transactions)
}
