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
npm run build      # Produktions-Build (mit Hashing)
```

---

## Web Component Einbettung

Die Komponente wird als Angular Custom Element (`<metadata-agent-canvas>`) ausgeliefert und kann ohne iframe in jede HTML-Seite eingebettet werden.

### Erforderliche Schriften

Die Webkomponente nutzt **Roboto** als Textschrift sowie **Material Icons** (filled + outlined). Diese muessen **vor** dem JS-Bundle geladen werden:

```html
<!-- Schriften (alle drei werden benoetigt) -->
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined" rel="stylesheet">
```

### JS-Bundle einbinden

```html
<!-- Produktions-Build einbinden (nach npm run build) -->
<script src="path/to/metadata-agent-canvas.js"></script>
```

### Grundlegende Einbettung

```html
<!-- API-URL BEVOR Angular bootet setzen (verhindert i18n 404 auf localhost) -->
<script>window.__ENV = { agentUrl: 'https://metadata-agent-api.vercel.app' };</script>

<metadata-agent-canvas
  context-name="default"
  schema-version="latest"
  layout="default">
</metadata-agent-canvas>
```

> **Wichtig:** Die API-URL wird ueber `window.__ENV.agentUrl` gesetzt — **nicht** ueber das `api-url` HTML-Attribut. So kennt der i18n-Loader die richtige URL bereits beim Boot. Das `api-url` Attribut funktioniert weiterhin als Fallback.

### Minimale Einbettung (Nur-Lesen)

```html
<metadata-agent-canvas
  readonly="true"
  borderless="true">
</metadata-agent-canvas>
```

### Einbettung in Browser-Extension

```html
<metadata-agent-canvas
  layout="plugin"
  input-mode="url"
  show-floating-controls="true"
  show-content-type-only="true">
</metadata-agent-canvas>
```

### Einbettung in edu-sharing (Pruefdialog)

```html
<metadata-agent-canvas
  layout="clean"
  context-name="mds_oeh"
  schema-version="1.8.0">
</metadata-agent-canvas>
```

> **Hinweis:** `metadatenpruefdialog` ist weiterhin als Alias fuer `clean` nutzbar.

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

Schwebende Aktionsbuttons am unteren Rand. Master-Toggle fuer die gesamte Floating Bar.
Jedes Element ist einzeln steuerbar ueber eigene Parameter:

```html
<metadata-agent-canvas show-floating-controls="true"></metadata-agent-canvas>
```

**Modular steuerbare Elemente:**
- Content-Type-Selektor (`showContentType`) - Split-Button zur Inhaltstyp-Wahl
- Upload-Button (`showUploadButton`) - Upload ins Repository via API
- Save/Submit-Button (`showSaveButton`) - Metadaten speichern / ans Plugin senden
- Reset-Button (`showResetButton`) - Zuruecksetzen
- JSON-Loader (`showJsonLoader`) - JSON-Datei importieren
- Sprachumschalter (`showLanguageSwitcher`) - i18n Sprachwechsel-Pill

**Defaults:** Content-Type, Language Switcher und Reset sind standardmaessig in allen Layouts aktiv.
Upload, Save und JSON-Loader nur in Layouts, die sie bisher nutzten (s. Matrix).

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

### Flat Groups (`flatGroups`)

Fasst alle Feldgruppen eines Schemas zu **einer einzigen Gruppe** zusammen.
Die Ueberschrift wird der Schema-Name (z.B. "Veranstaltung" statt einzelner Gruppen wie "Veranstaltungsdetails", "Ort", "Organisation").

```html
<!-- Flat Groups aktivieren -->
<metadata-agent-canvas flat-groups="true"></metadata-agent-canvas>

<!-- Per JavaScript -->
<script>
  document.querySelector('metadata-agent-canvas').flatGroups = true;
</script>

<!-- Per URL-Parameter (Standalone) -->
<!-- http://localhost:4200/?flatGroups=true -->
```

**Verhalten:**
- Standard: `false` (normale Gruppierung nach Schema-Gruppen)
- Bei `true`: Alle Felder eines Schemas werden in einer Gruppe angezeigt
- Respektiert `showCoreFields` und `showSpecialFields` — wenn Core-Felder ausgeblendet sind, werden sie auch in Flat Groups nicht angezeigt
- Funktioniert in allen 7 Layouts

### Felder

```html
<!-- Nur Kernfelder (Titel, Beschreibung, Keywords, ...) -->
<metadata-agent-canvas show-core-fields="true" show-special-fields="false"></metadata-agent-canvas>

<!-- Nur Content-Type-spezifische Felder -->
<metadata-agent-canvas show-core-fields="false" show-special-fields="true"></metadata-agent-canvas>

<!-- Feld-Aktionen (Info-Icon, Status) ein/aus -->
<metadata-agent-canvas show-field-actions="false"></metadata-agent-canvas>
```

### Vorschaubild (`showPreview`)

Zeigt ein Vorschaubild (Screenshot/Thumbnail) oberhalb der Feldgruppen an. Standardmaessig aktiviert.

```html
<!-- Vorschaubild deaktivieren -->
<metadata-agent-canvas show-preview="false"></metadata-agent-canvas>

<!-- Vorschaubild aktivieren (Standard) -->
<metadata-agent-canvas show-preview="true"></metadata-agent-canvas>
```

### Screenshot-Erzeugung (`enableScreenshot`, `screenshotMethod`)

Steuert die automatische Screenshot-Erzeugung bei URL-Extraktion. Ein Toggle-Schalter im Eingabebereich erlaubt Nutzern, Screenshots zur Laufzeit ein-/auszuschalten.

```html
<!-- Screenshots deaktivieren -->
<metadata-agent-canvas enable-screenshot="false"></metadata-agent-canvas>

<!-- Screenshots mit Playwright-Methode (statt Standard pageshot) -->
<metadata-agent-canvas enable-screenshot="true" screenshot-method="playwright"></metadata-agent-canvas>
```

**Verhalten:**
- Bei URL-Extraktion wird parallel ein Screenshot erfasst und als Vorschaubild angezeigt
- Bei Text-Extraktion: Wenn in den generierten Metadaten eine URL gefunden wird (`ccm:wwwurl`), wird nachtraeglich ein Screenshot erstellt
- Der Toggle-Schalter ist in allen Layouts mit Eingabebereich verfuegbar
- `pageshot` (Standard): Externer Screenshot-Service
- `playwright`: Server-seitiger Browser-Screenshot (datenschutzfreundlich)

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
| `api-url` | `apiUrl` | string | `window.__ENV.agentUrl` | URL der Metadata Agent API (empfohlen: ueber `window.__ENV` setzen) |
| `context-name` | `contextName` | string | `'default'` | Schema-Kontext |
| `schema-version` | `schemaVersion` | string | `'latest'` | Schema-Version |

#### Multi-Instanz

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `instance-id` | `instanceId` | string | `'default'` | Instanz-Kennung fuer Multi-Instanz-Betrieb |

**Verhalten:**
- **Kein Attribut:** Alle Komponenten teilen `"default"` (rueckwaertskompatibel)
- **Gleiche ID:** Geteilter State, Events feuern nur 1× (Primary-Komponente)
- **Verschiedene IDs:** Komplett isolierter State + eigene Events

```html
<!-- API-URL einmalig setzen -->
<script>window.__ENV = { agentUrl: 'https://metadata-agent-api.vercel.app' };</script>

<!-- Isolierte Instanzen -->
<metadata-agent-canvas instance-id="editor-a" layout="default"></metadata-agent-canvas>
<metadata-agent-canvas instance-id="editor-b" layout="plugin"></metadata-agent-canvas>

<!-- Synchrone Instanzen (geteilter State, keine doppelten Events) -->
<metadata-agent-canvas instance-id="shared" layout="default"></metadata-agent-canvas>
<metadata-agent-canvas instance-id="shared" layout="plugin"></metadata-agent-canvas>
```

**Runtime-Wechsel:** `document.querySelector('metadata-agent-canvas').instanceId = 'new-id';`

#### Layout & Darstellung

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `layout` | `layout` | string | `'default'` | Layout-Preset (siehe unten) |
| `readonly` | `readonly` | boolean | `false` | Deaktiviert alle Eingaben |
| `borderless` | `borderless` | boolean | `false` | Entfernt Rahmen fuer Einbettung |
| `columns` | `columns` | 1-4 | Layout | Spaltenanzahl |
| `background-color` | `backgroundColor` | string | `''` | CSS-Hintergrundfarbe |
| `input-mode` | `inputMode` | string | `'text'` | `'text'`, `'url'`, `'nodeId'` |
| `highlight-ai` | `highlightAi` | boolean | `false` | KI-Felder violett hervorheben |
| `flat-groups` | `flatGroups` | boolean | `false` | Feldgruppen pro Schema zusammenfassen |
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
| `show-floating-controls` | `showFloatingControls` | s. Matrix | Master-Toggle: Schwebende Aktionsbuttons |
| `show-content-type` | `showContentType` | `true` | Content-Type Split-Button in Floating Bar |
| `show-upload-button` | `showUploadButton` | s. Matrix | Upload-Button (Repository) |
| `show-save-button` | `showSaveButton` | s. Matrix | Save/Submit-Button in Floating Bar |
| `show-json-loader` | `showJsonLoader` | s. Matrix | JSON-Datei-Loader in Floating Bar |
| `show-language-switcher` | `showLanguageSwitcher` | `true` | i18n Sprachwechsel in Floating Bar |
| `show-reset-button` | `showResetButton` | `true` | Reset-Button in Floating Bar |
| `show-content-type-only` | `showContentTypeOnly` | `false` | Nur Content-Type anzeigen |
| `show-preview` | `showPreview` | `true` | Vorschaubild im Canvas anzeigen |
| `flat-groups` | `flatGroups` | `false` | Feldgruppen pro Schema zusammenfassen |

#### Vorschaubild & Screenshot

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `show-preview` | `showPreview` | boolean | `true` | Vorschaubild-Anzeige ein/ausschalten |
| `enable-screenshot` | `enableScreenshot` | boolean | `true` | Automatische Screenshot-Erzeugung bei URL-Extraktion |
| `screenshot-method` | `screenshotMethod` | string | `'pageshot'` | Screenshot-Methode: `'pageshot'` oder `'playwright'` |
| `preview-image` | `previewImage` | string | - | Vorschaubild direkt als Base64 Data-URL setzen |

#### Debug

| HTML-Attribut | Angular Input | Typ | Default | Beschreibung |
|---------------|---------------|-----|---------|--------------|
| `debug` | `debug` | boolean | `false` | Aktiviert Debug-Logging in der Browser-Konsole (i18n-Ladepfade, apiUrl, instanceId, Events) |

```html
<!-- Debug aktivieren -->
<metadata-agent-canvas debug="true"></metadata-agent-canvas>
```

Per JavaScript: `element.debug = true;` / `element.debug = false;`

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
| `clean` | 1 | Minimale rahmenlose Ansicht fuer Einbettung/Review (ehem. `metadatenpruefdialog`) |
| `prueftisch` | 1 | edu-sharing Prueftisch (columns=2 fuer breit) |
| `prueftisch-org` | 1 | edu-sharing organisatorischer Prueftisch, readonly (columns=2 fuer breit) |

### Element-Defaults pro Layout (Matrix)

`true` = standardmaessig sichtbar, `false` = standardmaessig ausgeblendet.
Jeder Wert kann per Attribut ueberschrieben werden.

| Element | `default` | `plugin` | `dialog` | `detail` | `clean` | `prueftisch` | `prueftisch-org` |
|---------|-----------|----------|----------|----------|---------|--------------|------------------|
| **inputArea** | true | true | false | false | false | false | false |
| **statusBar** | true | true | false | false | false | false | false |
| **coreFields** | true | true | true | true | true | true | true |
| **specialFields** | true | true | true | true | true | true | true |
| **fieldActions** | true | true | true | false | true | true | false |
| **footer** | true | false | false | false | false | false | false |
| **floatingControls** | true | true | true | true | true | true | true |
| **contentType** | true | true | true | true | true | true | true |
| **uploadButton** | true | true | false | false | false | false | false |
| **saveButton** | true | true | true | false | false | false | false |
| **jsonLoader** | true | false | false | false | false | false | false |
| **languageSwitcher** | true | true | true | true | true | true | true |
| **resetButton** | true | true | true | true | true | true | true |
| **readonly** | false | false | false | **true** | false | false | **true** |
| **columns** | 1 | 1 | 1 | 4 | 1 | 1 | 1 |
| **borderless** | false | true | true | true | true | true | true |
| **flatGroups** | false | false | false | false | false | false | false |
| **compact** | false | true | true | false | true | false | false |

**Hinweis:** Mehrspaltige Ansichten per `columns=2` (oder 3/4) Attribut auf jedem Layout moeglich.

### Layout-Aliase

| Alias | Layout |
|-------|--------|
| `standalone`, `local`, `normal`, `edit`, `bookmarklet` | `default` |
| `browser-extension`, `extension`, `sidebar` | `plugin` |
| `modal`, `review`, `redaktion` | `dialog` |
| `preview`, `print` | `detail` |
| `webcomponent`, `embed`, `embedded`, `viewer`, `view`, `readonly` | `default` |
| `metadatenpruefdialog`, `pruefung`, `validation`, `check` | `clean` |
| `reviewtable`, `table`, `qa` | `prueftisch` |
| `prueftisch-large`, `prueftisch-gross`, `reviewtable-large`, `qa-large` | `prueftisch` |
| `prueftisch-org`, `reviewtable-org`, `qa-org` | `prueftisch-org` |
| `prueftisch-org-large`, `reviewtable-org-large`, `qa-org-large` | `prueftisch-org` |

---

## Beispiele

### Standalone mit allen Features

```html
<metadata-agent-canvas
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
  layout="plugin"
  input-mode="url"
  show-content-type-only="true">
</metadata-agent-canvas>
```

### Prueftisch Org (organisatorischer Prueftisch, readonly)

```html
<metadata-agent-canvas
  layout="prueftisch-org"
  content-type="event.json">
</metadata-agent-canvas>
```

### Inhaltstyp von aussen steuern

```html
<metadata-agent-canvas
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
  // e.detail = {
  //   contextName, schemaVersion, metadataset, metadataset_uri,
  //   language, exportedAt,
  //   metadata: { "cclom:title": [...], ... },   // nur echte Felder
  //   _origins: { "cclom:title": "ai", ... },     // nur Top-Level (kein Duplikat in metadata)
  //   _source_text: "...",                         // Rohtext (falls vorhanden)
  //   preview_image_url: "data:image/png;base64,..." // Screenshot (falls vorhanden)
  // }
  
  // Inhaltstyp nach Extraktion auslesen:
  const contentType = e.detail.metadataset;       // z.B. "event.json"
  const contentTypeUri = e.detail.metadataset_uri; // z.B. "http://w3id.org/openeduhub/vocabs/contentTypes/event"
});

// Benutzer hat "Speichern" geklickt (Submit)
canvas.addEventListener('metadataSubmit', (e) => {
  console.log('Submit:', e.detail);
  // e.detail = gleiches Format wie metadataChange
});

// Upload-Ergebnis (nach Repository-Upload)
canvas.addEventListener('uploadResult', (e) => {
  console.log('Upload:', e.detail);
  // e.detail = { success: boolean, nodeId?: string, error?: string, duplicate?: boolean, repositoryUrl?: string }
});
```

---

## Extended Metadata Fields

Beim Upload ins Repository werden automatisch drei zusaetzliche Felder geschrieben (steuerbar via API-Parameter `write_extended_data`, Standard: aktiv):

| Feld | Inhalt | Quelle |
|------|--------|--------|
| `ccm:oeh_extendedType` | URI des Inhaltstyps | Vocabulary-URI aus `core.json` (z.B. `http://w3id.org/openeduhub/vocabs/contentTypes/event`) |
| `ccm:oeh_extendedData` | Vollstaendiges Metadaten-JSON | Alle Metadaten-Felder als JSON-String |
| `ccm:oeh_extendedText` | Rohtext vor Extraktion | `userText` aus dem Eingabefeld (Text, extrahierter Seiteninhalt bei URL, etc.) |

### Datenfluss

- **Standalone/Bookmarklet:** Die Webkomponente sendet `write_extended_data: true` und `extended_text` (aus `state.userText`) direkt an die API `/upload`
- **Browser-Extension:** Die Webkomponente exportiert `_source_text` im `metadataSubmit`-Event. Das Plugin extrahiert diesen Wert und reicht ihn als `extended_text` an die API weiter
- **Harvester:** Die API fuegt `_source_text` in die `/generate`-Response ein. Der Harvester extrahiert ihn und sendet ihn als `extended_text` an `/upload`

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
| `showFloatingControls` / `controls` | Schwebende Buttons (Master-Toggle) |
| `showContentType` | Content-Type Split-Button |
| `showSaveButton` | Save/Submit-Button |
| `showJsonLoader` | JSON-Datei-Loader |
| `showLanguageSwitcher` | Sprachwechsel-Pill |
| `showResetButton` | Reset-Button |
| `showCoreFields` | Kernfelder |
| `showSpecialFields` | Spezialfelder |
| `showFooter` | Footer |
| `showFieldActions` | Feld-Aktionen |
| `showContentTypeOnly` | Nur Content-Type |
| `highlightAi` | KI-Felder violett hervorheben |
| `flatGroups` | Feldgruppen pro Schema zusammenfassen |

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

Beim Export (`metadataChange`, `metadataSubmit`, JSON-Download) wird ein `_origins`-Dict mitgeliefert, das die Herkunft jedes Feldes speichert.

**Wichtig:** `_origins` und `_source_text` liegen **nur auf Top-Level** — sie werden **nicht** in `metadata` dupliziert. Das `metadata`-Objekt enthaelt ausschliesslich echte Metadaten-Felder.

```json
{
  "contextName": "default",
  "schemaVersion": "v1.8.1",
  "metadataset": "event.json",
  "metadataset_uri": "http://w3id.org/openeduhub/vocabs/contentTypes/event",
  "language": "de",
  "exportedAt": "2026-03-10T15:26:00.000Z",
  "metadata": {
    "cclom:title": ["Mein Titel"],
    "ccm:taxonid": ["Mathematik"]
  },
  "_origins": {
    "cclom:title": "ai",
    "ccm:taxonid": "user"
  },
  "_source_text": "Workshop KI in der Bildung am 15. Maerz 2026..."
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

## Debugging / Troubleshooting

### i18n-Uebersetzungen

Die Webkomponente loggt alle i18n-Ladeaufrufe in die Browser-Konsole (F12):

```
[i18n] Loading de from http://localhost:8000/widget/assets/i18n/de.json
[i18n] ✓ Loaded de from http://localhost:8000/widget/assets/i18n/de.json (12 keys)
```

Bei Fehlern:

```
[i18n] ✗ Failed: http://localhost:8000/widget/assets/i18n/de.json (404)
[i18n] Fallback → ./assets/i18n/de.json
```

**Haeufige Ursachen:**
- `api-url` fehlt oder falsch → die Webkomponente versucht `/widget/assets/i18n/de.json` relativ zur API-URL
- i18n-Dateien fehlen auf dem Server → `src/static/widget/assets/i18n/de.json` + `en.json` muessen vorhanden sein
- CORS-Probleme → API muss CORS-Header setzen (FastAPI macht das standardmaessig)
- **Mixed Content** → Wird die Webkomponente auf einer **HTTPS-Seite** eingebettet, muss `api-url` ebenfalls HTTPS sein. Browser blockieren HTTP-Requests von HTTPS-Seiten stillschweigend. Eine bare IP wie `http://192.168.1.100:8000` funktioniert **nicht** — Loesung: Reverse-Proxy (nginx/Caddy) mit Domain + TLS-Zertifikat vor den Docker-Container stellen.

### Multi-Instanz Debug

Bei Instanz-Wechseln loggt die Komponente:

```
[canvas-0] instanceId setter called: "shared" (current: "default")
[canvas-0] → bound to instance "shared", isPrimary=true
```

---

## Projektstruktur

```
src/app/
├── core/                              # Services
│   ├── api.service.ts                 # HTTP-Kommunikation mit API (+Upload)
│   ├── canvas.service.ts              # State-Management (instance-aware)
│   ├── instance-registry.ts           # Multi-Instanz State-Registry
│   ├── schema.service.ts              # Schema-Laden
│   ├── shape-expander.service.ts      # Subfield-Expansion
│   ├── field-validation.service.ts    # Validierung
│   ├── layout.service.ts              # Layout-Verwaltung
│   ├── dynamic-translate-loader.ts    # i18n-Loader (deferred, mit Debug-Logging)
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
│   │   ├── prueftisch-layout/         # Prueftisch
│   │   ├── prueftisch-org-layout/     # Prueftisch Org (organisational)
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

### Per window.__ENV (empfohlen, ueberschreibt Environment)

```html
<script>window.__ENV = { agentUrl: 'http://localhost:8000' };</script>

<metadata-agent-canvas
  context-name="mds_oeh"
  schema-version="1.8.0">
</metadata-agent-canvas>
```

## Build & Deployment

### Lokal / Docker / Vercel

```bash
npm start              # Lokal: http://localhost:4200
npm run build          # Produktions-Build (dist/ mit Hashing)
docker build -t metadata-canvas . && docker run -p 80:80 metadata-canvas
vercel deploy          # Vercel
```

### Build fuer Browser-Extension + API-Auslieferung

Die `extension`-Konfiguration erzeugt Dateien **ohne Hashing** (wichtig fuer Extension-Einbindung):

```bash
# 1. Build ohne Dateinamen-Hashing
npx ng build --configuration extension
# -> dist-extension/main.js, polyfills.js, runtime.js, styles.css

# 2. In API kopieren (fuer /widget/dist/ Auslieferung)
copy dist-extension\main.js      ..\metadata-agent-api\src\static\widget\dist\
copy dist-extension\polyfills.js  ..\metadata-agent-api\src\static\widget\dist\
copy dist-extension\runtime.js    ..\metadata-agent-api\src\static\widget\dist\
copy dist-extension\styles.css    ..\metadata-agent-api\src\static\widget\dist\
copy dist-extension\assets\i18n\* ..\metadata-agent-api\src\static\widget\assets\i18n\

# 3. In Browser-Plugin kopieren
copy dist-extension\main.js      ..\metadata-browser-plugin-fuerAPI\webcomponent\
copy dist-extension\polyfills.js  ..\metadata-browser-plugin-fuerAPI\webcomponent\
copy dist-extension\runtime.js    ..\metadata-browser-plugin-fuerAPI\webcomponent\
copy dist-extension\styles.css    ..\metadata-browser-plugin-fuerAPI\webcomponent\
copy dist-extension\assets\i18n\* ..\metadata-browser-plugin-fuerAPI\webcomponent\assets\i18n\
```

### Build-Konfigurationen (angular.json)

| Konfiguration | Output | Hashing | Verwendung |
|---------------|--------|---------|------------|
| `production` | `dist/` | Ja | Standalone, Vercel, Docker |
| `extension` | `dist-extension/` | Nein | Browser-Plugin, API-Widget |
| `development` | — | — | Lokale Entwicklung (`ng serve`) |

## Technologie-Stack

- **Angular 19** - Standalone Components, Angular Elements
- **Angular Material 19** - Material Design v3
- **ngx-translate** - Internationalisierung (DE/EN)
- **RxJS** - Reactive State Management
- **TypeScript 5** - Typsicherheit

## Lizenz

MIT
