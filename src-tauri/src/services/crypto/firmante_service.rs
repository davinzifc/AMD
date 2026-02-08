use rusqlite::params;

use crate::db::DbPool;
use crate::errors::AppError;
use crate::models::crypto::firmante::{
    CreateFirmanteDto, Firmante, FirmanteListItem, UpdateFirmanteDto,
};

pub fn create(db: &DbPool, dto: CreateFirmanteDto) -> Result<Firmante, AppError> {
    let conn = db.0.lock().map_err(|e| {
        AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
        )))
    })?;

    conn.execute(
        "INSERT INTO crypto_firmantes (nombre, cc_id, firma_imagen, firma_mime)
         VALUES (?1, ?2, ?3, ?4)",
        params![dto.nombre, dto.cc_id, dto.firma_imagen, dto.firma_mime],
    )?;

    let id = conn.last_insert_rowid();

    Ok(Firmante {
        id: Some(id),
        nombre: dto.nombre,
        cc_id: dto.cc_id,
        firma_imagen: dto.firma_imagen,
        firma_mime: dto.firma_mime,
    })
}

pub fn get_by_id(db: &DbPool, id: i64) -> Result<Option<Firmante>, AppError> {
    let conn = db.0.lock().map_err(|e| {
        AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
        )))
    })?;

    let mut stmt = conn.prepare(
        "SELECT id, nombre, cc_id, firma_imagen, firma_mime
         FROM crypto_firmantes WHERE id = ?1",
    )?;

    let result = stmt.query_row([id], |row| {
        Ok(Firmante {
            id: row.get(0)?,
            nombre: row.get(1)?,
            cc_id: row.get(2)?,
            firma_imagen: row.get(3)?,
            firma_mime: row.get(4)?,
        })
    });

    match result {
        Ok(firmante) => Ok(Some(firmante)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn update(db: &DbPool, id: i64, dto: UpdateFirmanteDto) -> Result<Firmante, AppError> {
    let conn = db.0.lock().map_err(|e| {
        AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
        )))
    })?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref nombre) = dto.nombre {
        updates.push("nombre = ?");
        values.push(Box::new(nombre.clone()));
    }
    if let Some(ref cc_id) = dto.cc_id {
        updates.push("cc_id = ?");
        values.push(Box::new(cc_id.clone()));
    }
    if let Some(ref firma_imagen) = dto.firma_imagen {
        updates.push("firma_imagen = ?");
        values.push(Box::new(firma_imagen.clone()));
    }
    if let Some(ref firma_mime) = dto.firma_mime {
        updates.push("firma_mime = ?");
        values.push(Box::new(firma_mime.clone()));
    }

    if updates.is_empty() {
        drop(conn);
        return get_by_id(db, id)?
            .ok_or_else(|| AppError::NotFound(format!("Firmante con ID {} no encontrado", id)));
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(Box::new(id));

    let sql = format!(
        "UPDATE crypto_firmantes SET {} WHERE id = ?",
        updates.join(", ")
    );

    let params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let rows_affected = conn.execute(&sql, params.as_slice())?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!(
            "Firmante con ID {} no encontrado",
            id
        )));
    }

    drop(conn);
    get_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound(format!("Firmante con ID {} no encontrado", id)))
}

pub fn delete(db: &DbPool, id: i64) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|e| {
        AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
        )))
    })?;

    let rows_affected = conn.execute("DELETE FROM crypto_firmantes WHERE id = ?1", [id])?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!(
            "Firmante con ID {} no encontrado",
            id
        )));
    }

    Ok(())
}

pub fn list(db: &DbPool) -> Result<Vec<FirmanteListItem>, AppError> {
    let conn = db.0.lock().map_err(|e| {
        AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
        )))
    })?;

    let mut stmt = conn.prepare(
        "SELECT id, nombre, cc_id, firma_imagen IS NOT NULL
         FROM crypto_firmantes ORDER BY nombre",
    )?;

    let firmantes = stmt
        .query_map([], |row| {
            Ok(FirmanteListItem {
                id: row.get(0)?,
                nombre: row.get(1)?,
                cc_id: row.get(2)?,
                has_firma: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(firmantes)
}

pub fn get_firma_imagen(db: &DbPool, id: i64) -> Result<Option<(Vec<u8>, String)>, AppError> {
    let conn = db.0.lock().map_err(|e| {
        AppError::Database(rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
        )))
    })?;

    let mut stmt = conn.prepare(
        "SELECT firma_imagen, firma_mime FROM crypto_firmantes WHERE id = ?1",
    )?;

    let result = stmt.query_row([id], |row| {
        let imagen: Option<Vec<u8>> = row.get(0)?;
        let mime: Option<String> = row.get(1)?;
        Ok((imagen, mime))
    });

    match result {
        Ok((Some(imagen), Some(mime))) => Ok(Some((imagen, mime))),
        Ok(_) => Ok(None),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            Err(AppError::NotFound(format!("Firmante con ID {} no encontrado", id)))
        }
        Err(e) => Err(AppError::Database(e)),
    }
}
