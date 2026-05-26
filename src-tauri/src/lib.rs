use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tokio::fs;

// ── Managed state ─────────────────────────────────────────────────────────────

struct PreviousApp(Mutex<Option<i32>>);
struct CurrentShortcut(Mutex<String>);
struct DataDir(Mutex<PathBuf>);

// ── Data model ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptVersion {
    pub id: String,
    pub content: String,
    pub created_at: i64,
    pub note: String,
    pub rating: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub collection_id: Option<String>,
    pub tags: Vec<String>,
    pub model_target: String,
    #[serde(default, alias = "isFavorite")]
    pub is_pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_used_at: Option<i64>,
    pub use_count: u64,
    #[serde(default)]
    pub versions: Vec<PromptVersion>,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StashData {
    pub prompts: Vec<Prompt>,
    pub collections: Vec<Collection>,
    pub version: u32,
}

// ── Settings model ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_shortcut")]
    pub global_shortcut: String,
    #[serde(default)]
    pub data_dir: Option<String>,
    #[serde(default)]
    pub has_seen_shortcut_hint: bool,
    #[serde(default)]
    pub has_seen_variable_hint: bool,
}

fn default_theme() -> String { "system".to_string() }
fn default_shortcut() -> String { "Super+Shift+KeyP".to_string() }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            global_shortcut: default_shortcut(),
            data_dir: None,
            has_seen_shortcut_hint: false,
            has_seen_variable_hint: false,
        }
    }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

fn default_data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("app data dir")
}

fn resolve_data_dir(app: &AppHandle, settings: &AppSettings) -> PathBuf {
    settings
        .data_dir
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or_else(|| default_data_dir(app))
}

fn stash_path(app: &AppHandle) -> PathBuf {
    app.state::<DataDir>().0.lock().unwrap().join("stash.json")
}

fn settings_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("app data dir").join("settings.json")
}

fn read_settings_sync(path: &std::path::Path) -> AppSettings {
    if !path.exists() { return AppSettings::default(); }
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

async fn read_data(app: &AppHandle) -> Result<StashData, String> {
    let path = stash_path(app);
    if !path.exists() {
        return Ok(StashData { version: 1, ..Default::default() });
    }
    let raw = fs::read_to_string(&path).await.map_err(|e| e.to_string())?;
    match serde_json::from_str::<StashData>(&raw) {
        Ok(data) => Ok(data),
        Err(primary_err) => {
            // Recovery path for files with trailing garbage after a valid JSON payload.
            let mut stream = serde_json::Deserializer::from_str(&raw).into_iter::<StashData>();
            if let Some(Ok(recovered)) = stream.next() {
                // Normalize file contents so subsequent reads/writes are stable.
                write_data(app, &recovered).await?;
                Ok(recovered)
            } else {
                Err(primary_err.to_string())
            }
        }
    }
}

async fn write_data(app: &AppHandle, data: &StashData) -> Result<(), String> {
    let path = stash_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).await.map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).await.map_err(|e| e.to_string())
}

async fn read_settings(app: &AppHandle) -> AppSettings {
    let path = settings_path(app);
    if !path.exists() { return AppSettings::default(); }
    fs::read_to_string(&path).await
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

async fn write_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).await.map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).await.map_err(|e| e.to_string())
}

// ── Shortcut helpers ──────────────────────────────────────────────────────────

fn parse_shortcut_string(s: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = s.split('+').collect();
    if parts.is_empty() { return None; }
    let code_str = *parts.last()?;
    let code = str_to_code(code_str)?;
    let mut modifiers = Modifiers::empty();
    for m in &parts[..parts.len() - 1] {
        match *m {
            "Super" => modifiers |= Modifiers::SUPER,
            "Shift" => modifiers |= Modifiers::SHIFT,
            "Alt" => modifiers |= Modifiers::ALT,
            "Control" => modifiers |= Modifiers::CONTROL,
            _ => {}
        }
    }
    let mods = if modifiers.is_empty() { None } else { Some(modifiers) };
    Some(Shortcut::new(mods, code))
}

fn str_to_code(s: &str) -> Option<Code> {
    match s {
        "KeyA" => Some(Code::KeyA), "KeyB" => Some(Code::KeyB), "KeyC" => Some(Code::KeyC),
        "KeyD" => Some(Code::KeyD), "KeyE" => Some(Code::KeyE), "KeyF" => Some(Code::KeyF),
        "KeyG" => Some(Code::KeyG), "KeyH" => Some(Code::KeyH), "KeyI" => Some(Code::KeyI),
        "KeyJ" => Some(Code::KeyJ), "KeyK" => Some(Code::KeyK), "KeyL" => Some(Code::KeyL),
        "KeyM" => Some(Code::KeyM), "KeyN" => Some(Code::KeyN), "KeyO" => Some(Code::KeyO),
        "KeyP" => Some(Code::KeyP), "KeyQ" => Some(Code::KeyQ), "KeyR" => Some(Code::KeyR),
        "KeyS" => Some(Code::KeyS), "KeyT" => Some(Code::KeyT), "KeyU" => Some(Code::KeyU),
        "KeyV" => Some(Code::KeyV), "KeyW" => Some(Code::KeyW), "KeyX" => Some(Code::KeyX),
        "KeyY" => Some(Code::KeyY), "KeyZ" => Some(Code::KeyZ),
        "Digit0" => Some(Code::Digit0), "Digit1" => Some(Code::Digit1),
        "Digit2" => Some(Code::Digit2), "Digit3" => Some(Code::Digit3),
        "Digit4" => Some(Code::Digit4), "Digit5" => Some(Code::Digit5),
        "Digit6" => Some(Code::Digit6), "Digit7" => Some(Code::Digit7),
        "Digit8" => Some(Code::Digit8), "Digit9" => Some(Code::Digit9),
        "F1" => Some(Code::F1), "F2" => Some(Code::F2), "F3" => Some(Code::F3),
        "F4" => Some(Code::F4), "F5" => Some(Code::F5), "F6" => Some(Code::F6),
        "F7" => Some(Code::F7), "F8" => Some(Code::F8), "F9" => Some(Code::F9),
        "F10" => Some(Code::F10), "F11" => Some(Code::F11), "F12" => Some(Code::F12),
        "Space" => Some(Code::Space),
        "Enter" => Some(Code::Enter),
        "Tab" => Some(Code::Tab),
        "Escape" => Some(Code::Escape),
        "Comma" => Some(Code::Comma),
        "Period" => Some(Code::Period),
        "Slash" => Some(Code::Slash),
        "Semicolon" => Some(Code::Semicolon),
        "Backslash" => Some(Code::Backslash),
        "BracketLeft" => Some(Code::BracketLeft),
        "BracketRight" => Some(Code::BracketRight),
        "Minus" => Some(Code::Minus),
        "Equal" => Some(Code::Equal),
        _ => None,
    }
}

fn register_palette_shortcut(app: &AppHandle, shortcut_str: &str) -> Result<(), String> {
    let shortcut = parse_shortcut_string(shortcut_str)
        .ok_or_else(|| format!("Invalid shortcut: {}", shortcut_str))?;
    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                #[cfg(target_os = "macos")]
                {
                    let pid = get_frontmost_pid();
                    if let Some(state) = app_handle.try_state::<PreviousApp>() {
                        *state.0.lock().unwrap() = pid;
                    }
                }
                if let Some(window) = app_handle.get_webview_window("palette") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .map_err(|e| e.to_string())
}

// ── macOS helpers ─────────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn get_frontmost_pid() -> Option<i32> {
    let output = std::process::Command::new("osascript")
        .args(["-e", "tell application \"System Events\" to get unix id of first process whose frontmost is true"])
        .output().ok()?;
    String::from_utf8(output.stdout).ok()?.trim().parse::<i32>().ok()
}

#[cfg(target_os = "macos")]
fn activate_app_by_pid(pid: i32) {
    let _ = std::process::Command::new("osascript")
        .args(["-e", &format!(
            "tell application \"System Events\" to set frontmost of first process whose unix id is {} to true",
            pid
        )])
        .spawn();
}

// ── Tauri commands ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn list_prompts(app: AppHandle) -> Result<Vec<Prompt>, String> {
    Ok(read_data(&app).await?.prompts)
}

#[tauri::command]
async fn save_prompt(app: AppHandle, prompt: Prompt) -> Result<(), String> {
    let mut data = read_data(&app).await?;
    if let Some(idx) = data.prompts.iter().position(|p| p.id == prompt.id) {
        data.prompts[idx] = prompt;
    } else {
        data.prompts.push(prompt);
    }
    write_data(&app, &data).await
}

#[tauri::command]
async fn delete_prompt(app: AppHandle, id: String) -> Result<(), String> {
    let mut data = read_data(&app).await?;
    data.prompts.retain(|p| p.id != id);
    write_data(&app, &data).await
}

#[tauri::command]
async fn list_collections(app: AppHandle) -> Result<Vec<Collection>, String> {
    Ok(read_data(&app).await?.collections)
}

#[tauri::command]
async fn save_collection(app: AppHandle, collection: Collection) -> Result<(), String> {
    let mut data = read_data(&app).await?;
    if let Some(idx) = data.collections.iter().position(|c| c.id == collection.id) {
        data.collections[idx] = collection;
    } else {
        data.collections.push(collection);
    }
    write_data(&app, &data).await
}

#[tauri::command]
async fn delete_collection(app: AppHandle, id: String) -> Result<(), String> {
    let mut data = read_data(&app).await?;
    data.collections.retain(|c| c.id != id);
    for p in data.prompts.iter_mut() {
        if p.collection_id.as_deref() == Some(&id) {
            p.collection_id = None;
        }
    }
    write_data(&app, &data).await
}

#[tauri::command]
async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

// ── Settings commands ─────────────────────────────────────────────────────────

#[tauri::command]
async fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    Ok(read_settings(&app).await)
}

#[tauri::command]
async fn save_theme(app: AppHandle, theme: String) -> Result<(), String> {
    let mut settings = read_settings(&app).await;
    settings.theme = theme;
    write_settings(&app, &settings).await
}

#[tauri::command]
async fn update_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    // Unregister old shortcut
    let old_str = app.state::<CurrentShortcut>().0.lock().unwrap().clone();
    if let Some(old) = parse_shortcut_string(&old_str) {
        let _ = app.global_shortcut().unregister(old);
    }
    // Register new
    register_palette_shortcut(&app, &shortcut)?;
    // Update state
    *app.state::<CurrentShortcut>().0.lock().unwrap() = shortcut.clone();
    // Save
    let mut settings = read_settings(&app).await;
    settings.global_shortcut = shortcut;
    write_settings(&app, &settings).await
}

#[tauri::command]
async fn mark_hint_seen(app: AppHandle, hint: String) -> Result<(), String> {
    let mut settings = read_settings(&app).await;
    match hint.as_str() {
        "shortcut" => settings.has_seen_shortcut_hint = true,
        "variable" => settings.has_seen_variable_hint = true,
        _ => {}
    }
    write_settings(&app, &settings).await
}

#[tauri::command]
async fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[tauri::command]
async fn get_data_stats(app: AppHandle) -> Result<serde_json::Value, String> {
    let data = read_data(&app).await?;
    Ok(serde_json::json!({
        "promptCount": data.prompts.len(),
        "collectionCount": data.collections.len(),
        "dataPath": stash_path(&app).to_string_lossy()
    }))
}

#[tauri::command]
async fn show_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Palette commands ──────────────────────────────────────────────────────────

#[tauri::command]
async fn setup_palette_window(app: AppHandle) -> Result<(), String> {
    if let Some(palette) = app.get_webview_window("palette") {
        palette.set_visible_on_all_workspaces(true).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn hide_palette(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("palette") {
        window.hide().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        let pid = app.try_state::<PreviousApp>().and_then(|s| *s.0.lock().unwrap());
        if let Some(pid) = pid {
            activate_app_by_pid(pid);
        }
    }
    Ok(())
}

#[tauri::command]
async fn show_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Data folder command ───────────────────────────────────────────────────────

#[tauri::command]
async fn change_data_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tokio::sync::oneshot;
    let (tx, rx) = oneshot::channel::<Option<PathBuf>>();

    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder.and_then(|f| f.into_path().ok()));
    });

    let picked = rx.await.map_err(|e| e.to_string())?;

    if let Some(folder_path) = picked {
        let new_stash = folder_path.join("stash.json");

        // Copy current data to new location
        let current = stash_path(&app);
        if current.exists() {
            if let Some(parent) = new_stash.parent() {
                fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
            }
            fs::copy(&current, &new_stash).await.map_err(|e| e.to_string())?;
        } else {
            fs::create_dir_all(&folder_path).await.map_err(|e| e.to_string())?;
        }

        // Update state
        *app.state::<DataDir>().0.lock().unwrap() = folder_path.clone();

        // Save to settings
        let mut settings = read_settings(&app).await;
        settings.data_dir = Some(folder_path.to_string_lossy().to_string());
        write_settings(&app, &settings).await?;

        Ok(Some(new_stash.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

// ── Tag commands ──────────────────────────────────────────────────────────────

#[tauri::command]
async fn rename_tag(app: AppHandle, old_name: String, new_name: String) -> Result<Vec<Prompt>, String> {
    let trimmed = new_name.trim().to_string();
    if trimmed.is_empty() || trimmed == old_name {
        return Err("Invalid tag name".to_string());
    }
    let mut data = read_data(&app).await?;
    for prompt in data.prompts.iter_mut() {
        if prompt.tags.contains(&old_name) {
            prompt.tags = prompt.tags.iter()
                .map(|t| if t == &old_name { trimmed.clone() } else { t.clone() })
                .collect::<std::collections::LinkedList<_>>()
                .into_iter()
                .collect::<Vec<_>>();
            // Deduplicate
            let mut seen = std::collections::HashSet::new();
            prompt.tags.retain(|t| seen.insert(t.clone()));
        }
    }
    write_data(&app, &data).await?;
    Ok(data.prompts)
}

#[tauri::command]
async fn delete_tag(app: AppHandle, name: String) -> Result<Vec<Prompt>, String> {
    let mut data = read_data(&app).await?;
    for prompt in data.prompts.iter_mut() {
        prompt.tags.retain(|t| t != &name);
    }
    write_data(&app, &data).await?;
    Ok(data.prompts)
}

// ── Template cache commands ───────────────────────────────────────────────────

#[tauri::command]
async fn get_templates_cache(app: AppHandle) -> Result<Option<String>, String> {
    let path = app.path().app_data_dir().expect("app data dir").join("templates-cache.json");
    if path.exists() {
        Ok(Some(fs::read_to_string(path).await.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn set_templates_cache(app: AppHandle, json: String) -> Result<(), String> {
    let path = app.path().app_data_dir().expect("app data dir").join("templates-cache.json");
    fs::write(path, json).await.map_err(|e| e.to_string())
}

// ── App entry point ───────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .manage(PreviousApp(Mutex::new(None)))
        .manage(CurrentShortcut(Mutex::new(default_shortcut())))
        .manage(DataDir(Mutex::new(PathBuf::new())))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Load settings
            let settings_file = settings_path(app.handle());
            let settings = read_settings_sync(&settings_file);
            let shortcut_str = settings.global_shortcut.clone();

            // Resolve and store data dir
            let data_dir = resolve_data_dir(app.handle(), &settings);
            *app.state::<DataDir>().0.lock().unwrap() = data_dir;

            // Store the current shortcut
            *app.state::<CurrentShortcut>().0.lock().unwrap() = shortcut_str.clone();

            // Register shortcut with handler
            register_palette_shortcut(app.handle(), &shortcut_str)?;

            // Hide main window on close instead of destroying it (app keeps running for global shortcut)
            if let Some(main) = app.get_webview_window("main") {
                let main_clone = main.clone();
                main.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_prompts,
            save_prompt,
            delete_prompt,
            list_collections,
            save_collection,
            delete_collection,
            copy_to_clipboard,
            show_window,
            setup_palette_window,
            hide_palette,
            load_settings,
            save_theme,
            update_global_shortcut,
            get_app_version,
            get_data_stats,
            show_in_finder,
            open_url,
            change_data_folder,
            rename_tag,
            delete_tag,
            get_templates_cache,
            set_templates_cache,
            mark_hint_seen,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Stash")
        .run(|app, event| {
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    if let Some(main) = app.get_webview_window("main") {
                        let _ = main.show();
                        let _ = main.set_focus();
                    }
                }
            }
        });
}
