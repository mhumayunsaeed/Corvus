#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicUsize, Ordering};

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{
    MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent,
};
use tauri::webview::NewWindowResponse;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Window, WindowEvent};

static POPUP_COUNTER: AtomicUsize = AtomicUsize::new(1);

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
                let app_handle = app.handle().clone();
                let mut main_config = app
                    .config()
                    .app
                    .windows
                    .first()
                    .cloned()
                    .expect("Missing main window config");
                if main_config.label.is_empty() {
                    main_config.label = "main".to_string();
                }
                main_config.visible = true;

                let main_window = WebviewWindowBuilder::from_config(app, &main_config)?
                    .on_new_window(move |url, features| {
                        let label =
                            format!("popup-{}", POPUP_COUNTER.fetch_add(1, Ordering::Relaxed));
                        let window = WebviewWindowBuilder::new(
                            &app_handle,
                            label,
                            WebviewUrl::External(url.clone()),
                        )
                        .window_features(features)
                        .title(url.as_str())
                        .build()
                        .expect("failed to create popup window");

                        NewWindowResponse::Create { window }
                    })
                    .build()?;

                let _ = main_window.set_icon(window_icon.clone());
                let _ = main_window.show();
                let _ = main_window.set_focus();

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
                // Only the main window hides to tray. Auxiliary windows must
                // remain closable instead of accumulating invisibly.
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    emit_window_visibility(window, false);
                }
            }
        })
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running Corvus");
}
