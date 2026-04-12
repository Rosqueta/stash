# Librería de Prompts — Especificación de feature

**Stash · Feature adicional al PRD v1**

---

## Qué es esto

La Librería de Prompts es un apartado dentro de Stash que muestra una colección curada de prompts listos para usar. El usuario puede explorarlos por categoría y añadir cualquiera a su biblioteca personal con un solo clic.

**Objetivo principal:** evitar el empty state en la primera apertura y dar al usuario ideas concretas de qué tipo de prompts puede guardar en Stash.

---

## Cómo funciona para el usuario

1. El usuario abre Stash y navega al apartado "Librería" (accesible desde el sidebar)
2. Ve prompts organizados por categoría
3. Hace clic en cualquier prompt para previsualizarlo
4. Con un botón "Añadir a mi Stash" lo importa a su biblioteca personal
5. El prompt añadido se comporta exactamente igual que uno creado por el usuario

---

## Arquitectura de datos

### Dónde viven los templates

Los templates se almacenan en un **repositorio GitHub público separado** del repo principal de Stash:

```
github.com/[tu-usuario]/stash-templates
```

Separar este repo del código de la app tiene dos ventajas:
- Puedes añadir prompts sin tocar el código de la app
- En el futuro, la comunidad puede contribuir prompts via Pull Request sin acceder al código

### Cómo llegan los templates a la app

La app hace un **fetch automático** al JSON generado en GitHub cada vez que el usuario abre la sección Librería. Si no hay conexión a internet, usa la última versión descargada (caché local).

Nunca se requiere que el usuario actualice la app para ver prompts nuevos.

---

## Estructura del repositorio stash-templates

```
stash-templates/
├── README.md                    ← Instrucciones para contribuir
├── .github/
│   └── workflows/
│       └── build.yml            ← GitHub Action que genera el JSON automáticamente
├── templates/
│   ├── general/
│   │   ├── summarize-document.md
│   │   └── explain-concept.md
│   ├── writing/
│   │   ├── rejection-email.md
│   │   └── linkedin-post.md
│   ├── design/
│   │   ├── ui-feedback.md
│   │   └── component-naming.md
│   ├── development/
│   │   ├── code-review.md
│   │   └── write-tests.md
│   ├── analysis/
│   │   ├── analyze-metrics.md
│   │   └── compare-options.md
│   └── meetings/
│       ├── meeting-minutes.md
│       └── prepare-agenda.md
└── dist/
    └── templates.json           ← Generado automáticamente por la GitHub Action. No editar.
```

**Regla importante:** la carpeta `dist/` y el archivo `templates.json` son generados automáticamente. Nunca hay que editarlos a mano.

---

## Categorías

| Categoría | Slug | Descripción |
|---|---|---|
| General | `general` | All-purpose prompts, no specific domain |
| Writing | `writing` | Emails, posts, copy, articles |
| Design | `design` | UI/UX, components, visual feedback |
| Development | `development` | Code, review, tests, debugging |
| Analysis | `analysis` | Summarize, extract, compare, reports |
| Meetings | `meetings` | Minutes, agendas, transcriptions |

Cada prompt pertenece a **una sola categoría**.

---

## Formato de un archivo .md de template

Cada prompt es un archivo `.md` con dos partes: un bloque de metadatos arriba (llamado frontmatter) y el contenido del prompt abajo.

```markdown
---
title: Polite rejection email
tags: [email, communication, professional-tone]
variables: [company, contact_name, reason]
---
Write a professional and empathetic rejection email for {{company}}.

The email is addressed to {{contact_name}} and the reason for the rejection is: {{reason}}.

The tone should be cordial, direct, and leave the door open for future collaboration.
```

### Campos del frontmatter

| Campo | Obligatorio | Descripción |
|---|---|---|
| `title` | ✅ | Título del prompt. Claro y descriptivo. |
| `tags` | ✅ | Array de tags. Mínimo 1, máximo 5. |
| `variables` | ⬜ | Array con los nombres de las variables `{{}}` que contiene el prompt. Omitir si no hay variables. |

### Reglas para escribir el contenido

- Las variables se escriben siempre como `{{nombre_variable}}` — exactamente igual que en el resto de Stash
- Sin límite de longitud, pero los prompts de la librería deben ser completos y listos para usar, no borradores
- Plain text, sin markdown dentro del contenido del prompt (el contenido es el prompt en sí, no documentación)

---

## El archivo templates.json generado

La GitHub Action convierte todos los `.md` en este JSON. La app solo lee este archivo.

```json
{
  "version": 1,
  "updatedAt": 1718000000,
  "categories": [
    { "slug": "general", "label": "General" },
    { "slug": "writing", "label": "Writing" },
    { "slug": "design", "label": "Design" },
    { "slug": "development", "label": "Development" },
    { "slug": "analysis", "label": "Analysis" },
    { "slug": "meetings", "label": "Meetings" }
  ],
  "templates": [
    {
      "id": "tpl-rejection-email",
      "title": "Polite rejection email",
      "category": "writing",
      "tags": ["email", "communication", "professional-tone"],
      "variables": ["company", "contact_name", "reason"],
      "content": "Write a professional and empathetic rejection email..."
    }
  ]
}
```

---

## GitHub Action — cómo funciona

El archivo `.github/workflows/build.yml` le dice a GitHub: *"cada vez que alguien suba un cambio al repo, ejecuta este script automáticamente"*.

El script hace lo siguiente:
1. Lee todos los archivos `.md` de la carpeta `templates/`
2. Extrae el frontmatter y el contenido de cada uno
3. Genera el `dist/templates.json` con todos los prompts
4. Hace commit automático del JSON actualizado

El proceso tarda entre 10 y 30 segundos desde que haces push hasta que el JSON está actualizado.

Claude Code puede generar el archivo `build.yml` completo — no necesitas escribirlo ni entenderlo en detalle.

---

## Tu flujo de trabajo para añadir un prompt nuevo

### Opción A — Desde el navegador (sin terminal)

1. Entra a `github.com/[tu-usuario]/stash-templates`
2. Navega a `templates/[categoria]/`
3. Clic en "Add file" → "Create new file"
4. Escribe el nombre del archivo: `nombre-del-prompt.md`
5. Escribe el frontmatter y el contenido (ver formato arriba)
6. Clic en "Commit changes"
7. La GitHub Action se dispara automáticamente
8. En ~20 segundos el prompt está disponible para todos los usuarios de Stash

### Opción B — Desde tu ordenador (con terminal / editor)

1. Abre la carpeta del repo `stash-templates` en tu editor
2. Crea un archivo `.md` nuevo en la carpeta de la categoría correspondiente
3. Escribe el frontmatter y el contenido
4. En terminal: `git add .` → `git commit -m "Añado prompt: nombre"` → `git push`
5. La GitHub Action se dispara automáticamente
6. En ~20 segundos el prompt está disponible para todos los usuarios de Stash

---

## Comportamiento en la app

### Fetch y caché

| Situación | Comportamiento |
|---|---|
| Primera apertura con internet | Descarga el JSON, lo guarda en caché local |
| Aperturas posteriores con internet | Comprueba si hay versión nueva, actualiza la caché |
| Sin internet, caché disponible | Muestra los templates de la caché sin indicador de error |
| Sin internet, sin caché | Muestra estado vacío con mensaje "Conéctate para ver la librería" |

La URL del JSON a consumir es la raw de GitHub:
```
https://raw.githubusercontent.com/[tu-usuario]/stash-templates/main/dist/templates.json
```

### Importar un template

Cuando el usuario hace clic en "Añadir a mi Stash", antes de importar se muestra un pequeño modal o dropdown que pregunta **¿en qué colección quieres guardarlo?** con dos opciones:

- Las colecciones que el usuario tiene creadas (lista desplegable)
- "No collection" — lo guarda sin colección asignada

El usuario elige y confirma. Solo entonces se crea el prompt en `stash.json`.

**Por qué este paso es necesario:** las categorías de la librería (General, Writing, Design…) son independientes de las colecciones que el usuario haya creado en su Stash. No se puede asumir que coincidan ni hacer una asignación automática — el usuario es quien mejor sabe dónde quiere organizar ese prompt.

- Los tags del template se copian al prompt
- El prompt importado es completamente editable — es una copia independiente, no una referencia al template

### Identificar prompts importados (opcional, Fase 3)

Se puede añadir un campo `sourceTemplateId` al modelo `Prompt` para saber si un prompt fue importado desde la librería. Útil en el futuro para mostrar "Ver original" o detectar duplicados. No es necesario en v1.

---

## Integración con el modelo de datos existente

No se modifica el modelo `Prompt` del PRD para v1. Al importar un template, se crea un objeto `Prompt` estándar:

```typescript
{
  id: generateUUID(),
  title: template.title,
  content: template.content,
  collectionId: selectedCollectionId ?? null,  // elegido por el usuario en el modal de importación
  tags: template.tags,
  modelTarget: 'any',
  isFavorite: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastUsedAt: null,
  useCount: 0,
  versions: [],
  notes: ''
}
```

---

## Tareas para Claude Code

### Repo stash-templates (crear desde cero)

1. Crear la estructura de carpetas descrita arriba
2. Generar el archivo `.github/workflows/build.yml` con el script de conversión md→json
3. Crear 2-3 templates de ejemplo por categoría para validar el pipeline
4. Verificar que la Action se ejecuta correctamente y genera `dist/templates.json`

### App Stash (integración)

1. Crear servicio `templateService.ts` con:
   - `fetchTemplates()` — fetch a la raw URL de GitHub con caché en `localStorage` o archivo local via Tauri
   - `importTemplate(template, collectionId)` — convierte un template en `Prompt` con la colección elegida por el usuario y lo guarda en `stash.json`
2. Crear componente `LibraryView` — lista de templates con filtro por categoría
3. Crear componente `TemplateCard` — tarjeta de preview con botón "Add to my Stash"
4. Crear componente `ImportModal` — modal que pregunta al usuario en qué colección guardar el prompt antes de importarlo (opciones: colecciones del usuario + "No collection")
5. Añadir entrada "Library" al sidebar (entre la navegación principal y las colecciones)
6. Manejar estado de carga, error y caché vacía

---

## Decisiones pendientes

- [ ] ¿El sidebar de Librería muestra las categorías como filtros o como secciones separadas?
- [ ] ¿Se puede previsualizar un template antes de importarlo (panel derecho) o solo hay tarjeta?
- [ ] ¿La Librería va en Fase 2 o Fase 3? (Recomendación: Fase 2, junto al shortcut global, ya que resuelve el empty state desde el primer día)
