use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::errors::AppError;

pub struct DbPool(pub Mutex<Connection>);

pub fn initialize(app_handle: &AppHandle) -> Result<(), AppError> {
    let db_path = get_db_path(app_handle)?;

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(&db_path)?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;

    run_migrations(&conn)?;

    app_handle.manage(DbPool(Mutex::new(conn)));

    log::info!("Database initialized at: {:?}", db_path);
    Ok(())
}

fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, AppError> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    Ok(app_data_dir.join("amd_tools.db"))
}

fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    // Create migrations tracking table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    )?;

    // List of migrations in order
    let migrations: Vec<(&str, &str)> = vec![
        ("v001_create_empresas", include_str!("migrations/v001_create_empresas.sql")),
    ];

    for (name, sql) in migrations {
        let already_applied: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM _migrations WHERE name = ?1",
                [name],
                |row| row.get(0),
            )?;

        if !already_applied {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO _migrations (name) VALUES (?1)",
                [name],
            )?;
            log::info!("Migration applied: {}", name);
        }
    }

    Ok(())
}
