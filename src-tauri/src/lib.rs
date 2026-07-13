#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        // Register the File System plugin
        .plugin(tauri_plugin_fs::init())
        // Register the SQL plugin
        .plugin(tauri_plugin_sql::Builder::default().build())
        // Register your invoke commands
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
