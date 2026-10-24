# Graph Plotter product prototype

| Item | Value |
| --- | --- |
| Team | CSE210 Team 7-11 |
| Date | October 11, 2026 |

## Available behavior

The local prototype includes a reusable plotting library and an English demo page. `drawChart(canvas, options)` accepts named x/y series and renders scatter plots or line charts. The page includes CSV file loading, example selection, chart switching, axis labels and units, stable series colors, a legend, and a read-only measurement table.

`parseCsv(text)` accepts `x,y` for one series or `series,x,y` for several series, preserving values and row order within each series. Example files contain synthetic motion and sensor calibration measurements. The team's shared CSV proposal uses a different format; see `integration.md` for the differences.

Both axes are fixed at 0–5. Empty, single-point, two-point and invalid input have examples. Invalid CSV or rendering input displays a readable error and preserves the last successful plot and table. Measurements cannot be edited on the graph.

`examples/reuse.html` reads a separate calibration CSV and calls the parser and renderer directly to show both chart types.

## Run and demonstrate

From the project directory, run `npm start` with Node.js 24 or later, then open `http://127.0.0.1:4173`. No browser runtime dependencies are required. For development checks, first run `npm ci`, then `npm run check`.

1. Show Motion comparison as scatter, then switch to line. Explain that both modes share the same data and point locations.
2. Download the Motion comparison sample CSV, select the file and click Load CSV. Show the two series and the original values in the measurement table.
3. Load the header-only empty example. Axes and No data remain visible.
4. Load a missing-coordinate or nonnumeric example. Show the row/column error and the unchanged prior chart.
5. Open the independent example to show a second caller using another CSV without changing library internals.

After source changes, run `npm run build` and refresh the page. The local server can remain running.

## How the implementation works

CSV input is read as text in the browser, parsed into named series, and checked for missing, nonnumeric or out-of-range coordinates. The renderer validates chart options and copies coordinates before changing the canvas. It measures the displayed canvas, reserves space for labels and the legend, and maps each numeric coordinate into the plotting area.

A point at (0, 0) maps to the lower-left corner; (5, 5) maps to the upper-right corner; (2.5, 2.5) maps to the center. The vertical mapping reverses Canvas's downward y direction. Line mode builds a separate path for each series in the original order. Scatter mode uses the same positions without line segments. Redrawing replaces the prior bitmap.

Series colors follow array order and match the legend and table markers. Bitmap resolution follows screen pixel density while coordinate calculations use CSS pixels.

## Integration with team work

The demo owns file selection, labels, chart controls, errors, and the measurement table. The parser and renderer work independently of the page.

The shared repository uses `Chart`, `Series`, and `PointSet`. Integration needs agreement on CSV columns, invalid-cell handling, line order, and numeric precision. `integration.md` compares the code and suggests tasks. This prototype can provide drawing and file-loading logic for that work, or serve as a reviewed fallback demo.

## Team review and trial

| Work | Starting point | Expected result |
| --- | --- | --- |
| UI and visual refinement | `index.html`, `styles.css` | A layout designed by the frontend team and checked in a browser |
| CSV/API alignment | `src/csv.js`, `src/graph.js`, `docs/integration.md` | Agreed contract and working integration |
| Independent use | `examples/reuse.html`, a different valid CSV | Both chart types work; feedback and issues are recorded |
| Code review | `src/`, `test/` | Findings resolved and checks passed |
| Deployment | Actions/Pages workflows | Shared URL works for another teammate |
| Team video | Demo steps above | Member introductions, approach, demo, and lessons learned |

The page currently uses native browser controls. Visual design remains a frontend team task; the team's policy allows AI coding assistance but excludes AI visual design. See `verification.md` for completed checks and open work.
