#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{
    MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent,
};
use tauri::{Emitter, Manager, WebviewWindow, Window, WindowEvent};

fn emit_webview_window_visibility(window: &WebviewWindow, visible: bool) {
    let _ = window.emit("corvus:window_visibility", visible);
}

fn emit_window_visibility(window: &Window, visible: bool) {
    let _ = window.emit("corvus:window_visibility", visible);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                let window_icon =
                    tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(window_icon.clone());
                }

                let tray_icon =
                    tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;
                let show_i =
                    MenuItem::with_id(app, "show", "Show Corvus", true, None::<&str>)?;
                let quit_i =
                    MenuItem::with_id(app, "quit", "Quit Corvus", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .icon(tray_icon)
                    .tooltip("Corvus")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                emit_webview_window_visibility(&window, true);
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            if let Some(window) =
                                tray.app_handle().get_webview_window("main")
                            {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                    emit_webview_window_visibility(&window, false);
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                    emit_webview_window_visibility(&window, true);
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Hide to tray instead of quitting
                api.prevent_close();
                let _ = window.hide();
                emit_window_visibility(window, false);
            }
        })
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running Corvus");
}
