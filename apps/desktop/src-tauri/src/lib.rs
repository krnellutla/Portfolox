#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Must be registered first: on Windows/Linux the OAuth deep link
    // relaunches the app, and this plugin forwards the link's URL to the
    // already-running instance instead.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    builder
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
