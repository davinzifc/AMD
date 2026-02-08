CREATE TABLE IF NOT EXISTS crypto_empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    nit TEXT NOT NULL UNIQUE,
    imagen_path TEXT,
    representante_nombre TEXT NOT NULL,
    representante_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_empresas_nit ON crypto_empresas(nit);
