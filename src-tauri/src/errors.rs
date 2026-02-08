use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Error de base de datos: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("No encontrado: {0}")]
    NotFound(String),

    #[error("Error de validacion: {0}")]
    Validation(String),

    #[error("NIT duplicado: {0}")]
    DuplicateNit(String),

    #[error("Error de Excel: {0}")]
    Excel(String),

    #[error("Error de PDF: {0}")]
    Pdf(String),

    #[error("Error de IO: {0}")]
    Io(#[from] std::io::Error),
}

impl From<AppError> for String {
    fn from(err: AppError) -> String {
        err.to_string()
    }
}
