# Metadata Agent Canvas - Angular Web Component

Schlanke Angular 19 Web Component zur Anzeige und Bearbeitung von Metadaten.
Nutzt die **Metadata Agent API** als Backend fuer KI-gesteuerte Metadaten-Extraktion.

## Architektur

```
+-----------------------------+          +------------------------+
|  metadata-agent-fuerAPI     |  HTTP    |  metadata-agent-api    |
|  (Angular Web Component)    | -------> |  (FastAPI Backend)     |
|                             |          |                        |
|  - UI Rendering             |          |  - LLM Aufrufe         |
|  - Feld-Validierung         |          |  - Schema-Management   |
|  - Layout-System            |          |  - Normalisierung      |
|  - Subfield-Expansion       |          |  - Content-Type Detect |
|  - i18n (DE/EN)             |          |  - Geocoding           |
|                             |          |  - Repository Upload   |
+-----------------------------+          +------------------------+
```

**Keine lokalen LLM-Aufrufe** - alle KI-Operationen (Extraktion, Normalisierung, Content-Type-Erkennung) werden von der API uebernommen. Die Komponente ist eine reine UI-Schicht.

## Features

- **Material Design v3** - Konsistentes Design mit Angular Material 19
- **Mehrsprachig** - Deutsch/Englisch mit ngx-translate
- **Angular Web Component** - Einbettbar als `<metadata-agent-canvas>` Custom Element (kein iframe noetig)
- **7 Layout-Presets** - Jedes UI-Element individuell ein-/ausblendbar
- **Modulare UI-Bausteine** - Texteingabe, Statusbar, Upload-Button etc. als optionale Elemente in jedem Layout
- **3 Eingabemodi** - Text, URL oder Node-ID mit visuellem Modus-Umschalter
- **Multi-Spalten-Layout** - 1-4 Spalten mit responsiven Breakpoints
- **KI-Vorschlaege in Violett** - AI-generierte Werte werden visuell hervorgehoben
- **Subfield-Expansion** - Komplexe Objekte (Orte, Personen, Zeitplaene) automatisch in Einzelfelder expandiert
- **Vocabulary-Validierung** - Offene und geschlossene Vokabulare mit Autocomplete
- **Repository Upload** - Direkter Upload via FastAPI (Server-seitige Credentials)

## Quick Start

```bash
npm install
npm start          # http://localhost:4200
npm run build      # Produktions-Build
```

---

## Web Component Einbettung

Die Komponente wird als Angular Custom Element (`<metadata-agent-canvas>`) ausgeliefert und kann ohne iframe in jede HTML-Seite eingebettet werden.

### JS-Bundle einbinden

```html
<!-- Produktions-Build einbinden (nach npm run build) -->
<script src="path/to/metadata-agent-canvas.js"></script>
```

### Grundlegende Einbettung

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  context-name="default"
  schema-version="latest"
  layout="default">
</metadata-agent-canvas>
```

### Minimale Einbettung (Nur-Lesen)

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  readonly="true"
  borderless="true">
</metadata-agent-canvas>
```

### Einbettung in Browser-Extension

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  layout="plugin"
  input-mode="url"
  show-floating-controls="true"
  show-content-type-only="true">
</metadata-agent-canvas>
```

### Einbettung in edu-sharing (Pruefdialog)

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  layout="metadatenpruefdialog"
  context-name="mds_oeh"
  schema-version="1.8.0">
</metadata-agent-canvas>
```

### Programmatischer Zugriff (JavaScript)

```javascript
const canvas = document.querySelector('metadata-agent-canvas');

// Metadaten vorab befuellen
canvas.metadataInput = { 'cclom:title': ['Mein Titel'], 'cclom:general_keyword': ['Mathe', 'Geometrie'] };

// Layout zur Laufzeit aendern
canvas.layout = 'dialog';
canvas.readonly = true;
canvas.inputMode = 'url';

// Inhaltstyp von aussen setzen
canvas.contentType = 'event.json';

// Events abhoeren
canvas.addEventListener('metadataChange', (e) => console.log(e.detail));
canvas.addEventListener('metadataSubmit', (e) => console.log(e.detail));
canvas.addEventListener('uploadResult', (e) => console.log(e.detail));
```

---

## Modulare UI-Elemente

Die Komponente besteht aus unabhaengigen UI-Bausteinen, die einzeln aktiviert/deaktiviert werden koennen. Jedes Layout hat eigene Defaults, die per Attribut ueberschrieben werden koennen.

### Texteingabefeld (`showInputArea`)

Eingabebereich mit integriertem **Modus-Umschalter** (Text / URL / Node-ID) und Extraktions-Buttons.

```html
<!-- Texteingabe aktivieren (z.B. im Dialog, wo es normalerweise aus ist) -->
<metadata-agent-canvas layout="dialog" show-input-area="true"></metadata-agent-canvas>

<!-- Texteingabe deaktivieren (z.B. im Default, wo es normalerweise an ist) -->
<metadata-agent-canvas layout="default" show-input-area="false"></metadata-agent-canvas>
```

**Enthaltene Elemente:**
- Modus-Umschalter (Text / URL / Node-ID Toggle-Buttons)
- Textarea (Text-Modus) oder Einzeiliges Feld (URL/Node-ID-Modus)
- "Extraktion starten" / "Von URL extrahieren" / "Von Node laden" Button
- "Zuruecksetzen" Button

**Eingabemodus steuern:**
```html
<metadata-agent-canvas input-mode="text"></metadata-agent-canvas>    <!-- Standard: Freitext -->
<metadata-agent-canvas input-mode="url"></metadata-agent-canvas>     <!-- URL-Eingabe -->
<metadata-agent-canvas input-mode="nodeId"></metadata-agent-canvas>  <!-- Node-ID-Eingabe -->
```

### Statusbar (`showStatusBar`)

Zeile mit Inhaltstyp-Auswahl, Feld-Statistik und Fortschrittsbalken.

```html
<metadata-agent-canvas layout="prueftisch" show-status-bar="true"></metadata-agent-canvas>
```

**Enthaltene Elemente:**
- Content-Type-Selector (Dropdown: Lernmaterial, Tool, Quelle, etc.)
- Feld-Statistik Badges ("Felder: 3/31", "Pflicht: 3/4")
- Fortschrittsbalken (prozentual)

### Floating Controls (`showFloatingControls`)

Schwebende Aktionsbuttons am unteren Rand, inkl. Content-Type-Wahl.

```html
<metadata-agent-canvas show-floating-controls="true"></metadata-agent-canvas>
```

**Enthaltene Elemente (je nach Layout):**
- Content-Type-Selektor (immer sichtbar wenn Controls an)
- Upload-Button (`showUploadButton`) - Upload ins Repository via API
- Save/Submit-Button - Metadaten speichern
- Reset-Button - Zuruecksetzen
- JSON-Loader (`showJsonLoader`) - JSON-Datei importieren
- Sprachumschalter (`showLanguageSwitcher`)

### Upload-Button (`showUploadButton`)

Button zum Hochladen der Metadaten ins WLO Repository (via FastAPI-Backend).

```html
<!-- Upload-Button einblenden -->
<metadata-agent-canvas show-upload-button="true"></metadata-agent-canvas>

<!-- Upload-Button ausblenden -->
<metadata-agent-canvas show-upload-button="false"></metadata-agent-canvas>
```

**Verhalten:**
- **Default/Dialog Layout:** Ruft `POST /upload` auf der FastAPI-API auf
- **Plugin Layout:** Sendet JSON per `postMessage` zurueck an die Browser-Extension

### Felder

```html
<!-- Nur Kernfelder (Titel, Beschreibung, Keywords, ...) -->
<metadata-agent-canvas show-core-fields="true" show-special-fields="false"></metadata-agent-canvas>

<!-- Nur Content-Type-spezifische Felder -->
<metadata-agent-canvas show-core-fields="false" show-special-fields="true"></metadata-agent-canvas>

<!-- Feld-Aktionen (Info-Icon, Status) ein/aus -->
<metadata-agent-canvas show-field-actions="false"></metadata-agent-canvas>
```

### Footer (`showFooter`)

Fusszeile mit Feld-Statistik und Aktions-Buttons (nur im Default-Layout).

```html
<metadata-agent-canvas show-footer="true"></metadata-agent-canvas>
```

---

## Steuerungsoptionen

### Komplett-Uebersicht aller Attribute

#### API & Schema

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `api-url` | `apiUrl` | string | environment.ts | URL der Metadata Agent API |
| `context-name` | `contextName` | string | `'default'` | Schema-Kontext |
| `schema-version` | `schemaVersion` | string | `'latest'` | Schema-Version |

#### Layout & Darstellung

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `layout` | `layout` | string | `'default'` | Layout-Preset (siehe unten) |
| `readonly` | `readonly` | boolean | `false` | Deaktiviert alle Eingaben |
| `borderless` | `borderless` | boolean | `false` | Entfernt Rahmen fuer Einbettung |
| `columns` | `columns` | 1-4 | Layout | Spaltenanzahl |
| `background-color` | `backgroundColor` | string | `''` | CSS-Hintergrundfarbe |
| `input-mode` | `inputMode` | string | `'text'` | `'text'`, `'url'`, `'nodeId'` |
| `highlight-ai` | `highlightAi` | boolean | `true` | KI-Felder violett hervorheben |
| `viewer-mode` | `viewerMode` | boolean | `false` | Legacy: setzt `readonly=true` |

#### Element-Sichtbarkeit

| HTML-Attribut | Angular Input | Default je Layout | Beschreibung |
|---------------|---------------|-------------------|--------------|
| `show-input-area` | `showInputArea` | s. Matrix | Texteingabefeld mit Modus-Umschalter |
| `show-status-bar` | `showStatusBar` | s. Matrix | Statusleiste (Content-Type + Fortschritt) |
| `show-core-fields` | `showCoreFields` | `true` | Kernfelder (Titel, Keywords, ...) |
| `show-special-fields` | `showSpecialFields` | `true` | Content-Type-spezifische Felder |
| `show-field-actions` | `showFieldActions` | s. Matrix | Feld-Status-Icons und Info-Buttons |
| `show-footer` | `showFooter` | s. Matrix | Footer mit Statistik und Buttons |
| `show-floating-controls` | `showFloatingControls` | s. Matrix | Schwebende Aktionsbuttons |
| `show-upload-button` | `showUploadButton` | s. Matrix | Upload-Button (Repository) |
| `show-content-type-only` | `showContentTypeOnly` | `false` | Nur Content-Type anzeigen |

#### Daten

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `metadata-input` | `metadataInput` | object | `null` | Vorab-Metadaten zum Befuellen |
| `content-type` | `contentType` | string | `null` | Inhaltstyp setzen (Schema-Dateiname, z.B. `event.json`) |

---

## Layout-Presets

### Uebersicht

| Layout | Spalten | Use Case |
|--------|---------|----------|
| `default` | 1 | Standalone, Vercel, Docker, Bookmarklet |
| `plugin` | 1 | Browser-Extension (kompakte Sidebar) |
| `dialog` | 1 | Redaktionsdialog (Modal), Metadaten-Review |
| `detail` | 4 | Detail-Ansicht, Preview, Druck (Read-Only) |
| `metadatenpruefdialog` | 1 | edu-sharing Metadaten-Qualitaetspruefung |
| `prueftisch` | 1 | edu-sharing Prueftisch (1-spaltig) |
| `prueftisch-gross` | 2 | edu-sharing Prueftisch gross (2-spaltig) |

### Element-Defaults pro Layout (Matrix)

`true` = standardmaessig sichtbar, `false` = standardmaessig ausgeblendet.
Jeder Wert kann per Attribut ueberschrieben werden.

| Element | `default` | `plugin` | `dialog` | `detail` | `pruefdialog` | `prueftisch` | `prueftisch-gross` |
|---------|-----------|----------|----------|----------|---------------|--------------|-------------------|
| **inputArea** | true | true | false | false | false | false | false |
| **statusBar** | true | true | false | false | false | false | false |
| **coreFields** | true | true | true | true | true | true | true |
| **specialFields** | true | true | true | true | true | true | true |
| **fieldActions** | true | true | true | false | true | true | true |
| **footer** | true | false | false | false | false | false | false |
| **floatingControls** | true | true | true | true | true | true | true |
| **uploadButton** | true | true | false | false | false | false | false |
| **readonly** | false | false | false | **true** | false | false | false |
| **columns** | 1 | 1 | 1 | 4 | 1 | 1 | 2 |
| **borderless** | false | true | true | true | true | true | true |
| **compact** | false | true | true | false | true | false | false |

### Layout-Aliase

| Alias | Layout |
|-------|--------|
| `standalone`, `local`, `normal`, `edit`, `bookmarklet` | `default` |
| `browser-extension`, `extension`, `sidebar` | `plugin` |
| `modal`, `review`, `redaktion` | `dialog` |
| `preview`, `print` | `detail` |
| `webcomponent`, `embed`, `embedded`, `viewer`, `view`, `readonly` | `default` |
| `pruefung`, `validation`, `check` | `metadatenpruefdialog` |
| `reviewtable`, `table`, `qa` | `prueftisch` |
| `prueftisch-large`, `reviewtable-large`, `qa-large` | `prueftisch-gross` |

---

## Beispiele

### Standalone mit allen Features

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  context-name="default"
  schema-version="latest"
  layout="default"
  columns="2"
  show-upload-button="true">
</metadata-agent-canvas>
```

### Nur-Lesen-Modus (beliebiges Layout)

```html
<metadata-agent-canvas
  layout="default"
  readonly="true">
</metadata-agent-canvas>
```

### Dialog mit Texteingabe und Statusbar (normalerweise aus)

```html
<metadata-agent-canvas
  layout="dialog"
  show-input-area="true"
  show-status-bar="true"
  input-mode="url">
</metadata-agent-canvas>
```

### Prueftisch mit Eingabefeld (normalerweise aus)

```html
<metadata-agent-canvas
  layout="prueftisch"
  show-input-area="true"
  show-status-bar="true">
</metadata-agent-canvas>
```

### Detail-Ansicht mit Upload

```html
<metadata-agent-canvas
  layout="detail"
  readonly="false"
  show-upload-button="true"
  columns="2">
</metadata-agent-canvas>
```

### Browser-Plugin (kompakt, URL-Modus)

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  layout="plugin"
  input-mode="url"
  show-content-type-only="true">
</metadata-agent-canvas>
```

### Inhaltstyp von aussen steuern

```html
<metadata-agent-canvas
  api-url="https://metadata-agent-api.vercel.app"
  layout="prueftisch"
  content-type="event.json">
</metadata-agent-canvas>
```

```javascript
// Inhaltstyp per JavaScript umschalten
const canvas = document.querySelector('metadata-agent-canvas');
canvas.contentType = 'event.json';       // Veranstaltung
canvas.contentType = 'source.json';      // Quelle
canvas.contentType = 'core.json';        // Allgemein
```

### Minimal: Nur Kernfelder, kein Footer

```html
<metadata-agent-canvas
  show-special-fields="false"
  show-footer="false"
  show-floating-controls="false">
</metadata-agent-canvas>
```

---

## Events

```javascript
const canvas = document.querySelector('metadata-agent-canvas');

// Metadaten haben sich geaendert (bei jeder Feld-Aenderung)
canvas.addEventListener('metadataChange', (e) => {
  console.log('Metadaten:', e.detail);
  // e.detail = { contextName, schemaVersion, metadataset, language, metadata: {...}, _origins: {...} }
});

// Benutzer hat "Speichern" geklickt (Submit)
canvas.addEventListener('metadataSubmit', (e) => {
  console.log('Submit:', e.detail);
  // e.detail = vollstaendiges Metadaten-Objekt
});

// Upload-Ergebnis (nach Repository-Upload)
canvas.addEventListener('uploadResult', (e) => {
  console.log('Upload:', e.detail);
  // e.detail = { success: boolean, nodeId?: string, error?: string, duplicate?: boolean, repositoryUrl?: string }
});
```

---

## URL Query Parameter (Standalone-Modus)

Im Browser koennen alle Optionen per URL gesetzt werden:

```
http://localhost:4200/?layout=dialog&showInputArea=true&showStatusBar=true&inputMode=url&readonly=false&columns=2
```

| Parameter | Beschreibung |
|-----------|-------------|
| `apiUrl` | API-URL (ueberschreibt environment.ts) |
| `context` / `contextName` | Schema-Kontext |
| `version` / `schemaVersion` | Schema-Version |
| `layout` | Layout-Name oder Alias |
| `columns` | Spaltenanzahl (1-4) |
| `readonly` | Nur-Lesen-Modus |
| `borderless` | Rahmenloser Modus |
| `inputMode` | Eingabemodus: `text`, `url`, `nodeId` |
| `showInputArea` | Texteingabefeld anzeigen |
| `showStatusBar` | Statusleiste anzeigen |
| `showUploadButton` | Upload-Button anzeigen |
| `showFloatingControls` / `controls` | Schwebende Buttons |
| `showCoreFields` | Kernfelder |
| `showSpecialFields` | Spezialfelder |
| `showFooter` | Footer |
| `showFieldActions` | Feld-Aktionen |
| `showContentTypeOnly` | Nur Content-Type |
| `highlightAi` | KI-Felder violett hervorheben |

---

## Fehler-Feedback

Bei fehlgeschlagenen API-Aufrufen wird automatisch ein roter Fehlerbanner angezeigt:

- Roter Hintergrund mit Fehlermeldung und Icon
- Erscheint in allen Layouts oberhalb der Feldgruppen
- Im Default-Layout per Klick schliessbar (Dismiss-Button)
- Wird automatisch entfernt bei erfolgreicher naechster Extraktion

---

## KI-Vorschlaege (Violet Highlight)

Von der API generierte Werte werden mit **violetter Schrift** (`#7c3aed`) markiert.
Sobald ein Benutzer den Wert manuell aendert, wird das Highlighting entfernt.

### Steuerung

```html
<!-- KI-Highlighting deaktivieren -->
<metadata-agent-canvas highlight-ai="false"></metadata-agent-canvas>

<!-- Per URL -->
http://localhost:4200/?highlightAi=false
```

### Origin-Tracking im Export-Format

Beim Export (`metadataChange`, `metadataSubmit`, JSON-Download) wird ein `_origins`-Dict mitgeliefert, das die Herkunft jedes Feldes speichert:

```json
{
  "contextName": "default",
  "schemaVersion": "v1.8.0",
  "metadataset": "event.json",
  "language": "de",
  "exportedAt": "2026-02-10T15:26:00.000Z",
  "metadata": {
    "cclom:title": ["Mein Titel"],
    "ccm:taxonid": ["Mathematik"]
  },
  "_origins": {
    "cclom:title": "ai",
    "ccm:taxonid": "user"
  }
}
```

| Wert | Bedeutung |
|------|----------|
| `"ai"` | Feld wurde von der KI generiert (violett) |
| `"user"` | Feld wurde manuell eingegeben/bearbeitet (schwarz) |

Beim Reimport (JSON laden) wird `_origins` ausgewertet und die Herkunft korrekt wiederhergestellt.
Ohne `_origins` (Rueckwaertskompatibilitaet) werden alle importierten Werte als KI-generiert behandelt.

## Subfields & Komplexe Objekte

Felder mit komplexen Datentypen werden automatisch in Unterfelder expandiert:

```
schema:location (Ort)
  -> Name
  -> Adresse -> Strasse, PLZ, Stadt
  -> Geo-Koordinaten -> Breitengrad, Laengengrad
```

## Projektstruktur

```
src/app/
├── core/                              # Services
│   ├── api.service.ts                 # HTTP-Kommunikation mit API (+Upload)
│   ├── canvas.service.ts              # State-Management
│   ├── schema.service.ts              # Schema-Laden
│   ├── shape-expander.service.ts      # Subfield-Expansion
│   ├── field-validation.service.ts    # Validierung
│   ├── layout.service.ts              # Layout-Verwaltung
│   └── i18n.service.ts                # Sprach-Management (DE/EN)
├── components/
│   ├── canvas/                        # Orchestrator (leitet an Layout weiter)
│   ├── field/                         # Einzelfeld-Komponente
│   ├── shared/
│   │   ├── input-area/                # Shared: Texteingabe + Modus-Umschalter
│   │   └── status-bar/                # Shared: Statusleiste + Fortschritt
│   ├── layouts/
│   │   ├── default-layout/            # Standard (vollstaendig)
│   │   ├── plugin-layout/             # Browser Extension (kompakt)
│   │   ├── dialog-layout/             # Redaktionsdialog
│   │   ├── detail-layout/             # Detail/Preview (multi-column)
│   │   ├── metadatenpruefdialog-layout/
│   │   ├── prueftisch-layout/         # Prueftisch + Prueftisch-Gross
│   │   └── _shared-layout-styles.scss # Gemeinsame SCSS Mixins
│   ├── json-loader/                   # JSON Import
│   └── language-switcher/             # Sprachumschalter (DE/EN)
└── shared/
    ├── models/canvas.models.ts        # Interfaces und Enums
    └── layouts/
        ├── layout.models.ts           # LayoutConfig, Presets, Aliase
        ├── presets/                    # 7 Layout-Preset-Dateien
        └── index.ts                   # Zentrale Exports
```

## API-Konfiguration

### Per Environment (`src/environments/environment.ts`)

```typescript
export const environment = {
  apiUrl: 'https://metadata-agent-api.vercel.app',
  defaultContext: 'default',
  defaultVersion: '1.8.0',
  defaultLayout: 'default'
};
```

### Per HTML-Attribut (ueberschreibt Environment)

```html
<metadata-agent-canvas
  api-url="http://localhost:8000"
  context-name="mds_oeh"
  schema-version="1.8.0">
</metadata-agent-canvas>
```

## Deployment

```bash
npm start              # Lokal: http://localhost:4200
docker build -t metadata-canvas . && docker run -p 80:80 metadata-canvas
vercel deploy          # Vercel
```

## Technologie-Stack

- **Angular 19** - Standalone Components, Angular Elements
- **Angular Material 19** - Material Design v3
- **ngx-translate** - Internationalisierung (DE/EN)
- **RxJS** - Reactive State Management
- **TypeScript 5** - Typsicherheit

## Lizenz

MIT
