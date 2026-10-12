# warmup-charts
Warmup scatter-plot and line-graph project for Team 7-11

## Running locally
The page uses ES modules, which browsers won't load from `file://`. Instead, serve the file with `python3`:

```sh
cd <project-directory>
python3 -m http.server
```

Then open http://localhost:8000.

## Layout
`src/` contains the charting library; `index.html` and `demo/` instantiate the chart and demonstrate its usage.

| Path | Owner | Contents |
|---|---|---|
| `src/index.js` | Both | Public API: the library's single import point |
| `src/chart.js` | Frontend | `Chart`: one chart on one canvas, with its own state, resizing, and drawing |
| `src/series.js` | Both | `Series`, the frontend/backend data interface: a name and a `PointSet` |
| `src/point-set.js` | Backend | `PointSet`, the x-sorted point storage inside each series |
| `src/data.js` | Backend | `parseCSV(text)` and `randomData(options)`, both returning `Series[]` |
| `index.html`, `style.css`, `demo/main.js` | Frontend | Demo page using the library |
| `data/` | Backend | Sample CSVs |
| `docs/decisions/` | Leads | Architecture Decision Records (MADR) |
| `docs/meetings/` | Leads | Meeting notes |
