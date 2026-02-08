use std::collections::{BTreeSet, HashMap};

use chrono::{Datelike, NaiveDate};
use tauri::{AppHandle, Emitter};

use crate::errors::AppError;
use crate::models::crypto::{
    ProcessedGroup, ProcessingResult, ProgressPayload, RawTransaction, TransactionDetail,
    ValidationError,
};

/// Orquestador principal del procesamiento
pub fn process_transactions(
    app_handle: &AppHandle,
    transactions: &[RawTransaction],
    selected_ids: &[String],
) -> Result<ProcessingResult, AppError> {
    // Stage 1: Filtrar por IDs seleccionados
    emit_progress(app_handle, "Filtrando registros seleccionados", None, None, 0, 4, 5);
    let filtered = filter_selected(transactions, selected_ids);

    // Stage 2: Agrupar por ID
    emit_progress(app_handle, "Agrupando los datos", None, None, 1, 4, 15);
    let groups = group_by_id(&filtered);

    // Stage 3: Validar consistencia de ciudad
    emit_progress(app_handle, "Validando consistencia de datos", None, None, 2, 4, 30);
    let (valid_groups, validation_errors) = validate_groups(&groups);

    // Stage 4: Calcular totales y ordenar por cada ID
    emit_progress(app_handle, "Calculando totales", None, None, 3, 4, 50);
    let total_groups = valid_groups.len();
    let mut processed: Vec<ProcessedGroup> = Vec::new();

    for (i, (id, group_txs)) in valid_groups.iter().enumerate() {
        let order_code = group_txs.first().map(|t| t.order_code.clone());
        let pct = 50 + ((i * 50) / total_groups.max(1)) as u8;
        emit_progress(
            app_handle,
            "Procesando cada ID individual",
            Some(id.clone()),
            order_code,
            i,
            total_groups,
            pct,
        );

        let group = process_single_group(id, group_txs)?;
        processed.push(group);
    }

    let total_processed = filtered.len();
    let total_valid = processed.len();
    let total_invalid = validation_errors.len();

    emit_progress(app_handle, "Procesamiento completado", None, None, total_groups, total_groups, 100);

    Ok(ProcessingResult {
        valid_groups: processed,
        validation_errors,
        total_processed,
        total_valid,
        total_invalid,
    })
}

/// Filtra transacciones que coincidan con los IDs seleccionados
fn filter_selected<'a>(
    transactions: &'a [RawTransaction],
    selected_ids: &[String],
) -> Vec<&'a RawTransaction> {
    transactions
        .iter()
        .filter(|tx| selected_ids.contains(&tx.id))
        .collect()
}

/// Agrupa transacciones por ID del receptor
fn group_by_id<'a>(transactions: &[&'a RawTransaction]) -> HashMap<String, Vec<&'a RawTransaction>> {
    let mut groups: HashMap<String, Vec<&RawTransaction>> = HashMap::new();
    for tx in transactions {
        groups.entry(tx.id.clone()).or_default().push(tx);
    }
    groups
}

/// Valida consistencia de ciudad por grupo y separa validos de invalidos
fn validate_groups<'a>(
    groups: &HashMap<String, Vec<&'a RawTransaction>>,
) -> (HashMap<String, Vec<&'a RawTransaction>>, Vec<ValidationError>) {
    let mut valid: HashMap<String, Vec<&RawTransaction>> = HashMap::new();
    let mut errors = Vec::new();

    for (id, txs) in groups {
        let cities: BTreeSet<&str> = txs.iter().map(|t| t.city.as_str()).collect();

        if cities.len() > 1 {
            let city_list: Vec<&str> = cities.into_iter().collect();
            errors.push(ValidationError {
                id: id.clone(),
                third_name: txs[0].third_name.clone(),
                error_type: "CITY_MISMATCH".to_string(),
                details: format!(
                    "Se encontraron multiples ciudades para este ID: {}",
                    city_list.join(", ")
                ),
                affected_rows: txs.iter().map(|t| t.row_number).collect(),
            });
        } else {
            valid.insert(id.clone(), txs.clone());
        }
    }

    (valid, errors)
}

/// Procesa un grupo individual: ordena por fecha, calcula totales, genera detalle
fn process_single_group(id: &str, transactions: &[&RawTransaction]) -> Result<ProcessedGroup, AppError> {
    let mut sorted: Vec<&&RawTransaction> = transactions.iter().collect();
    sorted.sort_by(|a, b| {
        parse_date(&a.date)
            .unwrap_or(NaiveDate::MIN)
            .cmp(&parse_date(&b.date).unwrap_or(NaiveDate::MIN))
    });

    let total_amount: f64 = sorted.iter().map(|t| t.amount).sum();
    let total_price: f64 = sorted.iter().map(|t| t.total_price).sum();

    let date_range = build_date_range(&sorted)?;

    let details: Vec<TransactionDetail> = sorted
        .iter()
        .map(|t| TransactionDetail {
            date: format_date_for_display(&t.date),
            order_code: t.order_code.clone(),
            amount: round_2(t.amount),
            trm: round_2(t.trm),
            total_price: round_2(t.total_price),
        })
        .collect();

    let has_multiple = sorted.len() > 1;

    Ok(ProcessedGroup {
        id: id.to_string(),
        third_name: sorted[0].third_name.clone(),
        city: sorted[0].city.clone(),
        date_range,
        total_amount: round_2(total_amount),
        total_price: round_2(total_price),
        retencion: "NO".to_string(),
        transactions: details,
        has_multiple_transactions: has_multiple,
    })
}

/// Construye el rango de fechas en español
fn build_date_range(sorted: &[&&RawTransaction]) -> Result<String, AppError> {
    let dates: Vec<NaiveDate> = sorted
        .iter()
        .filter_map(|t| parse_date(&t.date).ok())
        .collect();

    if dates.is_empty() {
        return Ok("Fecha no disponible".to_string());
    }

    let unique_dates: BTreeSet<NaiveDate> = dates.into_iter().collect();

    if unique_dates.len() == 1 {
        Ok(format_date_spanish_full(unique_dates.iter().next().unwrap()))
    } else {
        let first = unique_dates.iter().next().unwrap();
        let last = unique_dates.iter().next_back().unwrap();
        Ok(format!(
            "Del {} hasta el {}",
            format_date_spanish_full(first),
            format_date_spanish_full(last),
        ))
    }
}

/// Formatea una fecha en español: "24 de noviembre de 2024"
fn format_date_spanish_full(date: &NaiveDate) -> String {
    let months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    let month_idx = date.month0() as usize;
    format!("{} de {} de {}", date.day(), months[month_idx], date.year())
}

/// Intenta parsear una fecha desde distintos formatos comunes de Excel
fn parse_date(date_str: &str) -> Result<NaiveDate, AppError> {
    let trimmed = date_str.trim();

    // Intentar formatos comunes
    let formats = [
        "%Y-%m-%d",        // 2024-11-24
        "%d/%m/%Y",        // 24/11/2024
        "%m/%d/%Y",        // 11/24/2024
        "%d-%m-%Y",        // 24-11-2024
        "%Y/%m/%d",        // 2024/11/24
        "%d.%m.%Y",        // 24.11.2024
    ];

    for fmt in &formats {
        if let Ok(date) = NaiveDate::parse_from_str(trimmed, fmt) {
            return Ok(date);
        }
    }

    // Intentar parsear como numero de serie Excel (dias desde 1899-12-30)
    if let Ok(serial) = trimmed.parse::<f64>() {
        let serial_int = serial as i64;
        if serial_int > 0 && serial_int < 200000 {
            let base = NaiveDate::from_ymd_opt(1899, 12, 30)
                .ok_or_else(|| AppError::Validation("Error interno de fecha base".into()))?;
            if let Some(date) = base.checked_add_signed(chrono::Duration::days(serial_int)) {
                return Ok(date);
            }
        }
    }

    Err(AppError::Validation(format!(
        "No se pudo parsear la fecha: '{}'",
        trimmed
    )))
}

/// Formatea una fecha para display en el detalle
fn format_date_for_display(date_str: &str) -> String {
    match parse_date(date_str) {
        Ok(date) => format_date_spanish_full(&date),
        Err(_) => date_str.to_string(),
    }
}

/// Redondea a 2 decimales
fn round_2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

/// Emite un evento de progreso al frontend
fn emit_progress(
    app_handle: &AppHandle,
    stage: &str,
    current_id: Option<String>,
    current_order_code: Option<String>,
    current: usize,
    total: usize,
    percentage: u8,
) {
    let payload = ProgressPayload {
        stage: stage.to_string(),
        current_id,
        current_order_code,
        current,
        total,
        percentage,
    };
    let _ = app_handle.emit("processing-progress", &payload);
}
