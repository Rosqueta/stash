# Stash — Product Requirements Document
**v1.0 · macOS App**

> Stash es una app macOS minimalista para guardar, organizar y usar prompts de IA con fricción cero. Offline-first, sin cuenta, los ficheros son tuyos.

---

## 1. Visión y objetivos

### 1.1 El problema

Los prompts bien escritos son activos de trabajo. Sin embargo, hoy viven dispersos en notas, documentos, conversaciones pasadas o en la cabeza del usuario. Recuperarlos cuando se necesitan requiere buscar, copiar, pegar y ajustar — demasiada fricción para algo que debería ser inmediato.

### 1.2 La solución

Stash es la primera app macOS diseñada específicamente para gestionar prompts como ciudadanos de primera clase. No son notas de texto: tienen estructura (variables, colecciones, tags, notas), están organizados y son accionables desde cualquier app en el Mac con un shortcut global.

### 1.3 Principios de diseño

- **Offline-first para tus prompts.** Sin cuenta, sin cloud. Los prompts propios viven en un fichero JSON local que el usuario controla. La Library muestra templates remotos (con caché offline como fallback), pero esta dependencia de red es opcional y no afecta al uso principal de la app.
- **Fricción cero en el uso.** El camino desde «quiero usar este prompt» hasta «está en mi portapapeles listo» debe ser de 2-3 pasos máximo.
- **Los prompts tienen estructura.** Variables, tags, notas y colecciones son parte del dato.
- **Minimalismo con carácter.** Inspirado en Scratch (`./scratch/`) — interfaz limpia, nativa macOS, con personalidad.

### 1.4 Fuera de scope en v1

- Sync en la nube
- Compartir prompts con equipo
- Ejecución directa contra APIs de IA
- Import / export de `stash.json`
- Extensión de navegador
- Versiones de prompts (historial de cambios) — descartado, Rust struct conserva el campo con `#[serde(default)]` para compatibilidad futura
- Autotagging automático
- Onboarding

---

## 2. Usuario objetivo

Perfil principal: diseñadora / desarrolladora que usa herramientas de IA intensivamente en su trabajo diario (Claude, ChatGPT, Cursor, Claude Code) y ha acumulado prompts que reutiliza con frecuencia. Técnicamente capaz, Mac user, valora la velocidad y el control.

**Pains actuales:** prompts dispersos en notas, copiar-pegar manual cada vez, perder tiempo ajustando variables repetidamente.

**Job-to-be-done:** «Quiero acceder a mi mejor prompt de email de rechazo desde cualquier app, rellenar el nombre de la empresa, y tenerlo en el portapapeles en 5 segundos.»

---

## 3. Stack técnico

| Tecnología | Uso |
|---|---|
| Tauri v2 | Framework desktop. Backend Rust para I/O, clipboard y APIs nativas macOS. |
| React 19 + TypeScript | Frontend. Strict mode. Sin `any`. |
| Tailwind v4 | Estilos via CSS custom properties + `@theme`. |
| Radix UI | Dialogs, menus, tooltips accesibles. |
| Sonner | Sistema de toasts. |
| @tauri-apps/plugin-clipboard-manager | Copiar prompts al portapapeles. |
| @tauri-apps/plugin-global-shortcut | Registrar ⌘⇧P (configurable) como shortcut global. |

**No usados** (a diferencia de Scratch): TipTap, Tantivy, dnd-kit, git integration. La búsqueda es en JS sobre el array de prompts en memoria.

### Arquitectura

Toda la persistencia y clipboard vive en Rust (`src-tauri/src/lib.rs`). El frontend llama via `invoke()`. El frontend nunca lee ni escribe ficheros directamente.

### Almacenamiento

```
~/Documents/Stash/stash.json  → { prompts: [], collections: [], version: 1 }
{APP_DATA}/settings.json       → { theme: "system", globalShortcut: "...", dataDir: null }
```

La ruta de `stash.json` es el valor por defecto. El usuario puede cambiarla desde Settings > Data; el valor personalizado se guarda como `dataDir` en `settings.json`.

### Ventanas nativas

Solo dos ventanas definidas en `tauri.conf.json`:
- `main` — app principal (1080×720, `visible: false` hasta que carguen los datos)
- `palette` — paleta global flotante (640×420, transparente, `alwaysOnTop`)

**Settings no es una ventana nativa** — es un modal in-app con backdrop blur renderizado sobre el contenido principal.

---

## 4. Modelo de datos

### Prompt

```typescript
interface Prompt {
  id: string;                    // UUID
  title: string;
  content: string;               // Texto con {{variables}}
  collectionId: string | null;
  tags: string[];
  modelTarget: string;           // 'claude-sonnet' | 'claude-opus' | 'gpt-4o' | 'gemini' | 'any'
  isPinned: boolean;             // era isFavorite — serde alias mantiene compatibilidad con JSON antiguo
  createdAt: number;             // Unix timestamp
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  notes: string;
}
```

### Collection

```typescript
interface Collection {
  id: string;
  name: string;
  color: string;                 // Hex
}
```

### AppSettings

```typescript
interface AppSettings {
  theme: "light" | "dark" | "system";
  globalShortcut: string;        // formato: "Super+Shift+KeyP"
  dataDir: string | null;        // null → usa ~/Documents/Stash
}
```

---

## 5. Features implementadas

### 5.1 Biblioteca de prompts ✅

**Lista (panel central)**
- Ordenada por `lastUsedAt` desc por defecto.
- Card: título, colección, pin indicator.
- Selección con clic.
- Filtro por tags (dropdown con búsqueda, multi-select).

**Detalle (panel derecho)**
- Título editable inline.
- Contenido con `{{variables}}` resaltadas como chips (VariableEditor).
- Sección Notes: textarea libre con autosave.
- Acciones: copiar, eliminar, pinear.
- Asignación de colección y gestión de tags desde el detalle.

**Búsqueda (SearchSpotlight)**
- `⌘F` — overlay con input, filtra sobre título + contenido.
- Enter: copia el prompt seleccionado y lo selecciona en el panel principal.
- ⌘Enter: selecciona sin copiar.

---

### 5.2 Shortcut global ⌘⇧P ✅

El killer feature. Accesible desde **cualquier app del Mac**.

**Comportamiento**
- ⌘⇧P (configurable) abre paleta flotante sobre cualquier app activa.
- Input con foco automático al abrir.
- Búsqueda sobre título y contenido, debounced 150ms.
- ↑↓ navegan, Enter confirma, Escape cierra y restaura el foco a la app anterior.
- Prompt con variables → abre Warm Up modal.
- Prompt sin variables → copia directamente + cierra.

**Implementación:** `plugin-global-shortcut`. Guarda PID de la app frontal y la reactiva al cerrar via AppleScript.

---

### 5.3 Warm Up modal ✅

Pantalla de preparación antes de copiar un prompt con variables.

**Interacción inline**
- El prompt se renderiza completo. Cada `{{variable}}` es un chip clickable.
- Clic en chip → input editable inline, misma posición en el texto.
- Enter / Tab → confirma y salta a la siguiente variable vacía.
- Escape → cancela.
- Variables repetidas se sincronizan — editar una actualiza todas.

**Footer**
- Botón Copy: copia con variables resueltas al portapapeles.
- Botón Cancel.

---

### 5.4 Colecciones y tags ✅

**Colecciones**
- Primer nivel, sin anidamiento.
- Nombre + color (dot en sidebar).
- Crear / eliminar desde sidebar (inline input).
- Eliminar colección → prompts pasan a sin colección.
- Nuevas colecciones se añaden al principio de la lista.

**Tags**
- Libres por prompt, múltiples.
- Añadidos / eliminados desde el detalle del prompt.
- Renombrar / eliminar tag en masa (afecta a todos los prompts que lo tienen).
- Filtro por tags en el panel de lista (multi-select dropdown).

**Vistas rápidas en sidebar**
- Prompts (todos)
- Pinned
- Library

---

### 5.5 Settings ✅

Modal in-app (no ventana nativa). Abierto con ⌘, o botón en sidebar.
Backdrop: `rgba(0,0,0,0.35)` + `backdrop-filter: blur(6px)`.
Cerrado con Escape, ⌘,, botón ✕ o clic fuera.

| Sección | Contenido |
|---|---|
| Appearance | Toggle Light / Dark / System. Persiste en `settings.json`. El tema se aplica en tiempo real via evento `settings:theme-changed`. |
| Shortcuts | Shortcut global configurable (click para grabar). Lista de shortcuts in-app reales: ⌘N, ⌘F, ⌘,. |
| Data | Ruta del fichero de datos, nº de prompts, nº de colecciones. Botón "Show in Finder". |
| About | Logo, versión, descripción, links externos. |

---

### 5.6 Notas por prompt ✅

- Campo de texto libre en el panel de detalle.
- Plain text, sin formato.
- Autosave al perder foco, debounced.

---

### 5.7 Library ✅

Panel de templates curados accesible desde la vista "Library" del sidebar.

**Comportamiento**
- Reemplaza el panel central + detalle cuando está activo (el sidebar sigue visible).
- Descarga templates desde `https://raw.githubusercontent.com/Rosqueta/stash-templates/main/dist/templates.json` al abrir.
- Si no hay conexión, usa la última versión cacheada (vía `get_templates_cache` / `set_templates_cache` Tauri commands).
- Templates organizados en 6 categorías: General, Writing, Design, Development, Analysis, Meetings.
- Toggle ES / EN para ver títulos, contenidos y variables en español o inglés.
- Filtro por categoría (pills horizontales).
- Clic en card → `TemplateModal` para previsualizar e importar.
- Botón `+` en hover → importa directamente sin abrir el modal.
- Importar crea un `Prompt` nuevo con el contenido en el idioma seleccionado y lo asigna a la colección elegida.

**Fuente de templates:** repo `stash-templates` (github.com/Rosqueta/stash-templates).
Cada template tiene `content_es` / `content_en` y `variables_es` / `variables_en`.

---

## 6. Diseño y UX

### Layout de 3 paneles

| Panel | Ancho | Contenido |
|---|---|---|
| Sidebar izquierdo | 220px | Colecciones, vistas rápidas (Prompts, Pinned, Library), búsqueda, nuevo prompt, ajustes |
| Lista central | 284px | Prompts filtrados |
| Detalle derecho | flex: 1 | Contenido, notas, acciones |

Cuando la vista activa es Library, los paneles central y derecho son reemplazados por `LibraryPanel`.

### macOS nativo

```json
{
  "titleBarStyle": "Overlay",
  "hiddenTitle": true,
  "trafficLightPosition": { "x": 16, "y": 24 },
  "width": 1080,
  "height": 720,
  "minWidth": 600,
  "minHeight": 400,
  "visible": false
}
```

`visible: false` en launch — mostrar ventana tras cargar los datos para evitar flash.

### Theming

CSS custom properties en `App.css`, registradas con Tailwind `@theme`. Nunca hardcodear hex en componentes. Color de marca: amber (`#D97706` light, `#F59E0B` dark).

### Feedback de acciones (sonner toasts)

- Prompt copiado → toast success
- Error al copiar → toast error
- Prompt eliminado → toast success con acción undo
- Collection deleted → toast success

---

## 7. Keyboard shortcuts

| Shortcut | Acción | Estado |
|---|---|---|
| ⌘⇧P | Abrir paleta global (configurable, desde cualquier app) | ✅ |
| ⌘N | Nuevo prompt | ✅ |
| ⌘F | Buscar (SearchSpotlight) | ✅ |
| ⌘, | Abrir settings modal | ✅ |
| Escape | Cerrar modal/paleta | ✅ |
| ↑/↓ | Navegar en paleta global y SearchSpotlight | ✅ |

---

## 8. Landing page

Página de marketing estática en `web/index.html`.
- Sin dependencias de build — fichero HTML único con CSS embebido.
- Diseño light, tipografía Inter + Instrument Serif, color de marca amber.
- Secciones: nav, hero, mockup de la app, tabla de features, pillars, CTA, footer.

---

## 9. Fases de desarrollo

### Fase 1 — Core (MVP) ✅
- Scaffold Tauri + React + TypeScript + Tailwind
- Modelo de datos y persistencia en `stash.json` via Rust
- Layout 3 paneles: sidebar, lista, detalle
- CRUD de prompts y colecciones
- Resaltado de `{{variables}}` en el detalle (VariableEditor)
- Copiar al portapapeles

### Fase 2 — Killer features ✅
- Shortcut global ⌘⇧P con paleta de búsqueda (GlobalPalette)
- Warm Up modal con chips editables inline
- Theming light/dark/system con persistencia
- Tags con filtro multi-select en el panel de lista

### Fase 3 — Profundidad ✅
- Settings modal in-app (Appearance, Shortcuts, Data, About)
- Landing page (`web/index.html`)
- Library de templates curados con soporte bilingüe ES/EN

### Pendiente
- Onboarding con prompts de ejemplo
- Exportar / importar `stash.json`
- Vista "Used today"

---

## 10. Referencias

- `./scratch/` — repo local de referencia de arquitectura. No modificar.
- `stash-templates` — github.com/Rosqueta/stash-templates (fuente de templates de la Library)
- Tauri v2: https://v2.tauri.app
- plugin-global-shortcut: registro del shortcut global
- plugin-clipboard-manager: copiar desde Rust
