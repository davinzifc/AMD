use rusqlite::params;

use crate::db::DbPool;
use crate::errors::AppError;
use crate::models::crypto::{CreateEmpresaDto, Empresa, UpdateEmpresaDto};

pub fn create(db: &DbPool, dto: CreateEmpresaDto) -> Result<Empresa, AppError> {
    let conn = db.0.lock().map_err(|e| AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    ))))?;

    // Check if NIT already exists
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM crypto_empresas WHERE nit = ?1",
        [&dto.nit],
        |row| row.get(0),
    )?;

    if exists {
        return Err(AppError::DuplicateNit(dto.nit));
    }

    conn.execute(
        "INSERT INTO crypto_empresas (nombre, nit, imagen_path, representante_nombre, representante_id)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            dto.nombre,
            dto.nit,
            dto.imagen_path,
            dto.representante_nombre,
            dto.representante_id,
        ],
    )?;

    let id = conn.last_insert_rowid();

    Ok(Empresa {
        id: Some(id),
        nombre: dto.nombre,
        nit: dto.nit,
        imagen_path: dto.imagen_path,
        representante_nombre: dto.representante_nombre,
        representante_id: dto.representante_id,
    })
}

pub fn get_by_nit(db: &DbPool, nit: &str) -> Result<Option<Empresa>, AppError> {
    let conn = db.0.lock().map_err(|e| AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    ))))?;

    let mut stmt = conn.prepare(
        "SELECT id, nombre, nit, imagen_path, representante_nombre, representante_id
         FROM crypto_empresas WHERE nit = ?1"
    )?;

    let result = stmt.query_row([nit], |row| {
        Ok(Empresa {
            id: row.get(0)?,
            nombre: row.get(1)?,
            nit: row.get(2)?,
            imagen_path: row.get(3)?,
            representante_nombre: row.get(4)?,
            representante_id: row.get(5)?,
        })
    });

    match result {
        Ok(empresa) => Ok(Some(empresa)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn update(db: &DbPool, nit: &str, dto: UpdateEmpresaDto) -> Result<Empresa, AppError> {
    let conn = db.0.lock().map_err(|e| AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    ))))?;

    // Build dynamic update
    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref nombre) = dto.nombre {
        updates.push("nombre = ?");
        values.push(Box::new(nombre.clone()));
    }
    if let Some(ref imagen_path) = dto.imagen_path {
        updates.push("imagen_path = ?");
        values.push(Box::new(imagen_path.clone()));
    }
    if let Some(ref rep_nombre) = dto.representante_nombre {
        updates.push("representante_nombre = ?");
        values.push(Box::new(rep_nombre.clone()));
    }
    if let Some(ref rep_id) = dto.representante_id {
        updates.push("representante_id = ?");
        values.push(Box::new(rep_id.clone()));
    }

    if updates.is_empty() {
        return get_by_nit(db, nit)?
            .ok_or_else(|| AppError::NotFound(format!("Empresa con NIT {} no encontrada", nit)));
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(Box::new(nit.to_string()));

    let sql = format!(
        "UPDATE crypto_empresas SET {} WHERE nit = ?",
        updates.join(", ")
    );

    let params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let rows_affected = conn.execute(&sql, params.as_slice())?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Empresa con NIT {} no encontrada", nit)));
    }

    drop(conn);
    get_by_nit(db, nit)?
        .ok_or_else(|| AppError::NotFound(format!("Empresa con NIT {} no encontrada", nit)))
}

pub fn list(db: &DbPool) -> Result<Vec<Empresa>, AppError> {
    let conn = db.0.lock().map_err(|e| AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    ))))?;

    let mut stmt = conn.prepare(
        "SELECT id, nombre, nit, imagen_path, representante_nombre, representante_id
         FROM crypto_empresas ORDER BY nombre"
    )?;

    let empresas = stmt.query_map([], |row| {
        Ok(Empresa {
            id: row.get(0)?,
            nombre: row.get(1)?,
            nit: row.get(2)?,
            imagen_path: row.get(3)?,
            representante_nombre: row.get(4)?,
            representante_id: row.get(5)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;

    Ok(empresas)
}
