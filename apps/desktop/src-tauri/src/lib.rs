#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // System-browser OAuth: opens the provider's login page in the
        // user's default browser rather than an embedded webview.
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Cross-platform OS secure storage (macOS Keychain, Windows
        // Credential Manager, Linux Secret Service) for the refresh token.
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
