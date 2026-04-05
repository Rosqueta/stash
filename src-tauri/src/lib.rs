use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tokio::fs;

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
    pub is_favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_used_at: Option<i64>,
    pub use_count: u64,
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

// ── Storage helpers ───────────────────────────────────────────────────────────

fn stash_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("Could not resolve app data dir")
        .join("stash.json")
}

async fn read_data(app: &AppHandle) -> Result<StashData, String> {
    let path = stash_path(app);
    if !path.exists() {
        return Ok(StashData {
            version: 1,
            ..Default::default()
        });
    }
    let raw = fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

async fn write_data(app: &AppHandle, data: &StashData) -> Result<(), String> {
    let path = stash_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(&path, json).await.map_err(|e| e.to_string())
}

// ── Tauri commands ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn list_prompts(app: AppHandle) -> Result<Vec<Prompt>, String> {
    let data = read_data(&app).await?;
    Ok(data.prompts)
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
    let data = read_data(&app).await?;
    Ok(data.collections)
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
    // Detach prompts from deleted collection
    for p in data.prompts.iter_mut() {
        if p.collection_id.as_deref() == Some(&id) {
            p.collection_id = None;
        }
    }
    write_data(&app, &data).await
}

#[tauri::command]
async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn show_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── App entry point ───────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            list_prompts,
            save_prompt,
            delete_prompt,
            list_collections,
            save_collection,
            delete_collection,
            copy_to_clipboard,
            show_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Stash");
}
