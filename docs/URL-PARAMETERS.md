# URL-Parameter Dokumentation

Diese Dokumentation beschreibt alle verfügbaren URL-Parameter zur Konfiguration des Metadata-Agent Frontends.

## Basis-URL

```
http://localhost:61627/
https://metadata-agent-fuerapi.vercel.app/
```

---

## Layout-Parameter

### `layout`
Wählt das Layout-Preset für die Anzeige.

| Wert | Beschreibung |
|------|-------------|
| `default` | Standard-Layout mit allen Features (Standard) |
| `viewer` | Viewer-Layout für Anzeige/Bearbeitung |
| `metadatenpruefdialog` | Kompaktes Dialog-Layout für Metadatenprüfung |
| `prueftisch` | Review-Table Layout mit Card-Design für QA |

**Beispiel:**
```
?layout=metadatenpruefdialog
```

---

## Anzeige-Parameter

### `showStatusBar`
Zeigt/versteckt die Status-Bar mit Content-Type-Selector, Feld-Statistiken und Fortschrittsbalken.

| Wert | Beschreibung |
|------|-------------|
| `true` | Status-Bar anzeigen |
| `false` | Status-Bar verstecken |

**Standard-Werte:**
- `default` Layout: `true`
- `metadatenpruefdialog` Layout: `false`

**Beispiel:**
```
?layout=metadatenpruefdialog&showStatusBar=true
```

### `controls`
Zeigt/versteckt die schwebenden Steuerelemente (Content-Type-Selector, Language-Switcher).

| Wert | Beschreibung |
|------|-------------|
| `true` | Floating Controls anzeigen |
| `false` | Floating Controls verstecken |

**Beispiel:**
```
?controls=true
```

### `viewerMode` / `viewer`
Aktiviert den Viewer-Modus (nur Anzeige).

| Wert | Beschreibung |
|------|-------------|
| `true` | Viewer-Modus aktivieren |

**Beispiel:**
```
?viewerMode=true
?viewer=true
```

### `readonly`
Aktiviert den Nur-Lesen-Modus (keine Bearbeitung möglich).

| Wert | Beschreibung |
|------|-------------|
| `true` | Readonly-Modus aktivieren |

**Beispiel:**
```
?readonly=true
```

### `borderless`
Entfernt Rahmen und Hintergründe für Embedding.

| Wert | Beschreibung |
|------|-------------|
| `true` | Borderless-Modus aktivieren |

**Beispiel:**
```
?borderless=true
```

---

## Input-Parameter

### `inputMode`
Wählt den Eingabe-Modus für die Datenquelle.

| Wert | Beschreibung |
|------|-------------|
| `text` | Text-Eingabe (Standard) - Textarea für freien Text |
| `url` | URL-Eingabe - Extrahiert Metadaten von einer Webseite |
| `nodeId` | NodeId-Eingabe - Lädt Metadaten aus dem Repository |

**Beispiel:**
```
?inputMode=url
?inputMode=nodeId
```

### `highlightAi`
Aktiviert/deaktiviert die violette Hervorhebung von KI-generierten Feldern.

| Wert | Beschreibung |
|------|-------------|
| `true` | KI-Felder violett hervorheben (Standard) |
| `false` | Keine farbliche Unterscheidung |

**Beispiel:**
```
?highlightAi=false
```

---

## Kombinierte Beispiele

### Standard-Ansicht mit URL-Eingabe
```
http://localhost:61627/?inputMode=url
```

### Metadatenprüfdialog mit Status-Bar
```
http://localhost:61627/?layout=metadatenpruefdialog&showStatusBar=true
```

### Viewer-Modus ohne Bearbeitung
```
http://localhost:61627/?layout=viewer&readonly=true
```

### NodeId-Eingabe mit Status-Bar
```
http://localhost:61627/?inputMode=nodeId&showStatusBar=true
```

### Komplett konfiguriertes Beispiel
```
http://localhost:61627/?layout=metadatenpruefdialog&showStatusBar=true&inputMode=url&controls=true
```

---

## API-Parameter

Die folgenden Parameter werden intern an die API gesendet:

### Text-Extraktion (`inputMode=text`)
```json
{
  "input_source": "text",
  "text": "<eingegebener Text>",
  "context": "default",
  "language": "de",
  "include_core": true,
  "enable_geocoding": true,
  "normalize": true
}
```

### URL-Extraktion (`inputMode=url`)
```json
{
  "input_source": "url",
  "text": "",
  "source_url": "<eingegebene URL>",
  "extraction_method": "simple",
  "context": "default",
  "language": "de",
  "include_core": true,
  "enable_geocoding": true,
  "normalize": true
}
```

### NodeId-Extraktion (`inputMode=nodeId`)
```json
{
  "input_source": "node_id",
  "text": "",
  "node_id": "<eingegebene NodeId>",
  "repository": "staging",
  "context": "default",
  "language": "de",
  "include_core": true,
  "enable_geocoding": true,
  "normalize": true
}
```

---

## Layouts im Detail

### Default Layout
- **Input-Area:** Ja (Text/URL/NodeId je nach `inputMode`)
- **Status-Bar:** Ja
- **Feld-Gruppen:** Ja (Core + Spezial)
- **Footer:** Ja (Download, Submit)
- **Floating Controls:** Ja

### Viewer Layout
- **Input-Area:** Nein
- **Status-Bar:** Ja
- **Feld-Gruppen:** Ja
- **Footer:** Nein
- **Floating Controls:** Ja

### Metadatenprüfdialog Layout
- **Input-Area:** Nein (für Dialog-Embedding)
- **Status-Bar:** Nein (aktivierbar via `showStatusBar=true`)
- **Feld-Gruppen:** Ja (kompakt)
- **Footer:** Nein
- **Floating Controls:** Ja (Content-Type + Language)

### Prüftisch Layout
- **Input-Area:** Nein
- **Status-Bar:** Nein
- **Feld-Gruppen:** Ja (Card-Design mit Icons in Headern)
- **Footer:** Nein
- **Floating Controls:** Ja (Content-Type + Language)

**Besonderheiten:**
- Gruppen-Header mit Icons (z.B. 📄 BESCHREIBUNG, 🎓 PÄDAGOGISCHES)
- Clean card-based Design für QA-Workflows
- Optimiert für Metadaten-Review

---

## Changelog

### 2026-02-10
- **NEU:** `highlightAi` Parameter — KI-Hervorhebung ein/ausschaltbar
- **NEU:** `_origins` Dict im Export-Format — speichert Herkunft (AI/User) pro Feld
- Import stellt `isAiGenerated` korrekt aus `_origins` wieder her
- Subfields erben `isAiGenerated` vom Parent-Feld

### 2026-01-23
- **NEU:** `prueftisch` Layout für QA-Workflows (Card-Design mit Icons)
- `inputMode` Parameter hinzugefügt (text, url, nodeId)
- API-Parameter für URL-Extraktion korrigiert (`input_source`, `source_url`, `extraction_method`)
- API-Parameter für NodeId-Extraktion korrigiert (`input_source`, `repository`)
- Status-Bar standardmäßig AUS in metadatenpruefdialog Layout

### 2026-01-22
- `showStatusBar` Parameter hinzugefügt
- `controls` Parameter hinzugefügt
- Metadatenprüfdialog Layout implementiert
