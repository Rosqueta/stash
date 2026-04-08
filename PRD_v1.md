# Stash — Product Requirements Document
**v1.0 · macOS App**

> Stash es una app macOS minimalista para guardar, organizar y usar prompts de IA con fricción cero. Offline-first, sin cuenta, los ficheros son tuyos.

---

## 1. Visión y objetivos

### 1.1 El problema

Los prompts bien escritos son activos de trabajo. Sin embargo, hoy viven dispersos en notas, documentos, conversaciones pasadas o en la cabeza del usuario. Recuperarlos cuando se necesitan requiere buscar, copiar, pegar y ajustar — demasiada fricción para algo que debería ser inmediato.

### 1.2 La solución

Stash es la primera app macOS diseñada específicamente para gestionar prompts como ciudadanos de primera clase. No son notas de texto: tienen estructura (variables, modelo target, versiones), están organizados (colecciones, tags), y son accionables desde cualquier app en el Mac con un shortcut global.

### 1.3 Principios de diseño

- **Offline-first.** Sin cuenta, sin cloud, sin internet. Los datos viven en un fichero JSON local que el usuario controla.
- **Fricción cero en el uso.** El camino desde «quiero usar este prompt» hasta «está en mi portapapeles listo» debe ser de 2-3 pasos máximo.
- **Los prompts tienen estructura.** Variables, modelo target, versiones y notas son parte del dato, no metadatos opcionales.
- **Minimalismo con carácter.** Inspirado en Scratch (`./scratch/`) — interfaz limpia, nativa macOS, con personalidad.

### 1.4 Fuera de scope en v1

- Sync en la nube
- Compartir prompts con equipo
- Ejecución directa contra APIs de IA
- Import desde URLs externas
- Extensión de navegador
- Versiones de prompts (historial de cambios, notas por versión, rating) — descartado en v1, posible en v2

---

## 2. Usuario objetivo

Perfil principal: diseñadora / desarrolladora que usa herramientas de IA intensivamente en su trabajo diario (Claude, ChatGPT, Cursor, Claude Code) y ha acumulado prompts que reutiliza con frecuencia. Técnicamente capaz, Mac user, valora la velocidad y el control.

**Pains actuales:** prompts dispersos en notas, copiar-pegar manual cada vez, olvidar qué versión de un prompt funcionó mejor, perder tiempo ajustando variables repetidamente.

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

**No usados** (a diferencia de Scratch): TipTap, Tantivy, dnd-kit, git integration. La búsqueda es en JS sobre el array de prompts en memoria.

### Arquitectura

Toda la persistencia y clipboard vive en Rust (`src-tauri/src/lib.rs`). El frontend llama via `invoke()`. El frontend nunca lee ni escribe ficheros directamente.

### Almacenamiento

Un único fichero `{APP_DATA}/stash.json`:
```json
{ "prompts": [], "collections": [], "version": 1 }
```

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
  modelTarget: ModelTarget;      // 'claude-sonnet' | 'claude-opus' | 'gpt-4o' | 'gemini' | 'any'
  isFavorite: boolean;
  createdAt: number;             // Unix timestamp
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  versions: PromptVersion[];     // Max 10
  notes: string;
}
```

### PromptVersion

```typescript
interface PromptVersion {
  id: string;
  content: string;
  createdAt: number;
  note: string;                  // 'Añadí parámetro de tono'
  rating: 1 | 2 | 3 | null;    // 1=mal, 2=ok, 3=bien
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

---

## 5. Features — v1

### 5.1 Biblioteca de prompts

**Lista (panel central)**
- Ordenada por `lastUsedAt` desc por defecto.
- Card: título, preview de contenido, tags, modelo target.
- Selección con clic o ↑↓.
- Búsqueda debounced 150ms sobre title + content.

**Detalle (panel derecho)**
- Título editable inline.
- Contenido con `{{variables}}` resaltadas como chips amber.
- Sección Versiones: hasta 10 versiones con nota, fecha y rating dots.
- Sección Notas: textarea libre.
- Botón favorito y metadata en header.

**Criterio de aceptación:** seleccionar un prompt muestra su contenido completo en menos de 200ms.

---

### 5.2 Shortcut global ⌘⇧P

El killer feature. Accesible desde **cualquier app del Mac**.

**Comportamiento**
- ⌘⇧P abre paleta flotante sobre cualquier app activa.
- Input con foco automático al abrir.
- Búsqueda sobre título y contenido, debounced 150ms.
- ↑↓ navegan, Enter confirma, Escape cierra.
- Prompt con variables → abre Warm Up modal.
- Prompt sin variables → copia directamente + toast «Copiado ✓» + cierra.
- `scrollIntoView({ block: 'center', behavior: 'smooth' })` al cambiar selección.
- Animación `slide-down` al abrir (mismo patrón que `./scratch/`).

**Implementación:** Tauri `plugin-global-shortcut`. Overlay `fixed inset-0 z-50 max-w-2xl`.

**Criterio de aceptación:** desde cualquier app, ⌘⇧P abre la paleta en menos de 300ms. El prompt debe estar en el portapapeles antes de que el usuario pueda pegar.

---

### 5.3 Warm Up modal

Pantalla de preparación antes de copiar un prompt con variables. **Interacción clave: las variables son chips editables inline dentro del texto** — no un formulario separado.

**Interacción inline**
- El prompt se renderiza completo. Cada `{{variable}}` es un chip amber clickable en su posición.
- Clic en chip → input editable inline, misma posición en el texto.
- Al escribir, el chip se expande al contenido. Sin layout shift.
- Enter / Tab → confirma y salta a la siguiente variable vacía.
- Escape → cancela sin perder el valor anterior.
- Variables repetidas (ej. `{{tono}}` dos veces) se sincronizan — editar una actualiza todas.
- Foco automático en la primera variable vacía al abrir.

**Estados de un chip**

| Estado | Apariencia |
|---|---|
| Sin rellenar | Fondo amber, nombre en cursiva, cursor pointer |
| Editando | Border amber, input inline activo, sin fondo |
| Relleno | Fondo verde, valor + tick ✓, cursor pointer para re-editar |

**Footer**
- Contador: «2 de 3 variables» → «Todo listo ✓» al completar.
- Botón «Copiar»: siempre activo. Variables vacías se copian como `{{variable}}`.
- Botón «Cancelar».

**Parsing del prompt**

```typescript
type Segment = { type: 'text'; value: string } | { type: 'var'; name: string };

function parseSegments(content: string): Segment[] {
  const parts = content.split(/(\{\{\w+\}\})/g);
  return parts.map(p => {
    const match = p.match(/^\{\{(\w+)\}\}$/);
    return match ? { type: 'var', name: match[1] } : { type: 'text', value: p };
  });
}

function resolveVariables(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}
```

**Estado React**
```typescript
const [values, setValues] = useState<Record<string, string>>({});
const [editingKey, setEditingKey] = useState<string | null>(null); // "varname_segmentIndex"
```

Variables repetidas comparten el mismo slot en `values`.

**Criterio de aceptación:** el chip se expande sin mover el texto. Editar `{{tono}}` actualiza todas sus instancias. Tab salta a la siguiente vacía.

---

### 5.4 Colecciones y tags

**Colecciones**
- Primer nivel, sin anidamiento en v1.
- Nombre + color (dot en sidebar).
- Sugeridas en onboarding: Código, Diseño, Redacción, Análisis, General.
- Crear / renombrar / eliminar desde sidebar.
- Eliminar colección → prompts pasan a «Sin colección».

**Tags**
- Libres por prompt, múltiples.
- Autosugerencia al guardar (sin IA, reglas estáticas — ver 5.7).
- El usuario confirma o edita los sugeridos.

**Vistas rápidas en sidebar**
- Todos los prompts
- Favoritos
- Usados hoy (`lastUsedAt` del día actual)

---

### 5.5 Versioning ligero

- Cada save con contenido diferente crea una versión automáticamente.
- Máximo 10 versiones por prompt. Al superar el límite, se elimina la más antigua.
- El usuario puede añadir nota y rating (1/2/3) a cualquier versión.
- Clic en versión antigua → previsualización lateral (no la activa).
- «Restaurar esta versión» → crea nueva versión con ese contenido (no sobreescribe el historial).

**UI**
- Lista vertical, más reciente arriba.
- Item: número de versión, fecha relativa, nota, dots de rating (● verde / ● rojo / ○ sin rating).
- Versión activa con borde destacado.

**Criterio de aceptación:** guardar crea versión en menos de 100ms. Restaurar crea nueva versión, no sobreescribe.

---

### 5.6 Notas por prompt

- Campo de texto libre en el panel de detalle.
- Plain text, sin formato.
- Autosave al perder foco, debounced 300ms.

---

### 5.7 Autotagging sin IA

Al guardar, el sistema analiza el contenido y sugiere tags por palabras clave:

| Tag | Palabras clave |
|---|---|
| código | función, código, debug, react, typescript, python, refactor, test, script |
| redacción | email, redacta, escribe, artículo, post, newsletter, copy, texto |
| diseño | componente, ui, ux, figma, diseño, layout, color, interfaz |
| análisis | analiza, resume, extrae, informe, datos, métricas, report |
| reunión | transcripción, reunión, meeting, agenda, acta, summary |

Los tags sugeridos se muestran como chips seleccionables. No se aplican sin confirmación del usuario.

---

## 6. Diseño y UX

### Layout de 3 paneles

| Panel | Ancho | Contenido |
|---|---|---|
| Sidebar izquierdo | 220px | Colecciones, vistas rápidas, búsqueda, nuevo prompt |
| Lista central | 240px | Prompts filtrados. Selección activa con borde izquierdo |
| Detalle derecho | flex: 1 | Contenido, versiones, notas, acciones |

### macOS nativo (copiar de `./scratch/src-tauri/tauri.conf.json`)

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

### Debounces y rendimiento

| Operación | Debounce |
|---|---|
| Búsqueda en sidebar | 150ms |
| Autosave de notas | 300ms |
| Autosave de prompt | 300ms |
| React.memo | Todos los componentes de lista (PromptCard) |

### Feedback de acciones (sonner toasts)

- Prompt copiado → «Copiado ✓» (success, 2s)
- Prompt guardado → silencioso (se refleja en UI)
- Error al copiar → «Error al copiar» (error, 3s)
- Prompt eliminado → «Prompt eliminado» + undo (3s)

---

## 7. Keyboard shortcuts

| Shortcut | Acción |
|---|---|
| ⌘⇧P | Abrir paleta global (desde cualquier app) |
| ⌘N | Nuevo prompt |
| ⌘F | Buscar en sidebar |
| ⌘, | Settings |
| ⌘\ | Toggle sidebar |
| ↑/↓ | Navegar lista de prompts |
| Enter | Abrir prompt / confirmar en paleta |
| Escape | Cerrar modal/paleta |
| ⌘S | Guardar prompt actual |
| ⌘D | Duplicar prompt actual |

---

## 8. Onboarding

Primera apertura:
1. Pantalla de bienvenida con logo ardilla y tagline «Your prompt stash.»
2. Selección de colecciones iniciales (lista sugerida o crear manualmente).
3. 3 prompts de ejemplo pre-cargados.
4. Tooltip en primer uso de ⌘⇧P.

---

## 9. Settings

| Setting | Opciones |
|---|---|
| Tema | Light / Dark / System (defecto: System) |
| Shortcut global | Configurable. Defecto: ⌘⇧P |
| Idioma autotagging | Español / English |
| Máximo versiones | 5–20. Defecto: 10 |
| Exportar datos | Exporta `stash.json` |
| Importar datos | Mergea un `stash.json` externo |

---

## 10. Fases de desarrollo

### Fase 1 — Core (MVP)
- Scaffold Tauri + React + TypeScript + Tailwind
- Modelo de datos y persistencia en `stash.json` via Rust
- Layout 3 paneles: sidebar, lista, detalle
- CRUD de prompts y colecciones
- Resaltado de `{{variables}}` en el detalle
- Copiar al portapapeles básico (sin warm up)

### Fase 2 — Killer features
- Shortcut global ⌘⇧P con paleta de búsqueda
- Warm Up modal con chips editables inline
- Autotagging por palabras clave
- Theming light/dark

### Fase 3 — Profundidad
- Versioning ligero con notas y rating
- Vistas rápidas: Favoritos, Usados hoy
- Settings page
- Onboarding con prompts de ejemplo
- Exportar / importar `stash.json`

---

## 11. Referencias

- `./scratch/` — repo local de referencia de arquitectura. No modificar.
- Tauri v2: https://v2.tauri.app
- plugin-global-shortcut: registro de ⌘⇧P
- plugin-clipboard-manager: copiar desde Rust
