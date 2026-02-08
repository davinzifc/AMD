mod commands;
mod db;
mod errors;
mod models;
mod services;

use commands::crypto::{empresa_commands, firmante_commands, report_commands};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            db::initialize(app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            empresa_commands::create_empresa,
            empresa_commands::get_empresa_by_nit,
            empresa_commands::update_empresa,
            empresa_commands::list_empresas,
            report_commands::upload_excel,
            report_commands::process_selected_records,
            report_commands::generate_pdfs,
            report_commands::prepare_pdf_htmls,
            report_commands::write_pdf_file,
            report_commands::get_temp_dir,
            firmante_commands::create_firmante,
            firmante_commands::get_firmante,
            firmante_commands::update_firmante,
            firmante_commands::delete_firmante,
            firmante_commands::list_firmantes,
            firmante_commands::get_firma_imagen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
