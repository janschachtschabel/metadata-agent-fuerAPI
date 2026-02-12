# Canvas Layout System

7 Layout-Presets mit modular steuerbaren Elementen.

## Dateistruktur

```
src/app/shared/layouts/
├── README.md                    # Diese Dokumentation
├── index.ts                     # Zentrale Exports + getLayout()
├── layout.models.ts             # TypeScript Interfaces + MODE_LAYOUT_MAP
└── presets/
    ├── default.layout.ts        # Standard (Standalone, Vercel, Docker)
    ├── plugin.layout.ts         # Browser Extension (kompakt)
    ├── dialog.layout.ts         # Redaktionsdialog (Modal)
    ├── detail.layout.ts         # Detail/Preview (Read-Only, 4-spaltig)
    ├── metadatenpruefdialog.layout.ts
    ├── prueftisch.layout.ts     # Prueftisch (1-spaltig)
    └── prueftisch-gross.layout.ts  # Prueftisch gross (2-spaltig)
```

## Layouts

| Layout | Spalten | Einsatz |
|--------|---------|---------|
| `default` | 1 | Standalone, Vercel, Docker, Bookmarklet |
| `plugin` | 1 | Browser Extension Sidebar |
| `dialog` | 1 | Redaktionsdialog, Modal |
| `detail` | 4 | Detail-Ansicht, Preview, Druck |
| `metadatenpruefdialog` | 1 | edu-sharing Metadaten-Pruefung |
| `prueftisch` | 1 | edu-sharing Prueftisch |
| `prueftisch-gross` | 2 | edu-sharing Prueftisch gross |

Siehe Haupt-README.md fuer die vollstaendige Element-Matrix und Beispiele.
