# Frontend and plotting-module integration

| Item | Value |
| --- | --- |
| Team | CSE210 Team 7-11 |
| Date | October 12, 2026 |

## Current prototype boundary

CSV parsing and drawing run in the browser. Integration uses JavaScript modules; no server API is needed.

| Boundary | Prototype contract |
| --- | --- |
| CSV parser | `import { parseCsv } from './src/csv.js'`; `parseCsv(csvText, { defaultSeriesName })` returns a named series array or throws `Error` |
| Renderer | `import { drawChart } from './src/graph.js'`; `drawChart(canvas, { type, xLabel, yLabel, series })` is synchronous |
| Modes | `scatter` or `line`; same points in both modes; lines retain per-series input order |
| Series | `[{ name, points: [{ x, y }] }]`; finite numbers and unique nonempty names |
| CSV | `x,y` or `series,x,y`; first appearance controls series order; source row order controls point order |
| Bounds | x and y both 0–5 inclusive, centralized with ticks in `src/config.js` |
| Return | `{ type, pointCount, series: [{ name, color, pointCount }], width, height, plotArea }` |
| Error | Readable `Error`; CSV errors include row/column when known; validation occurs before redraw |
| Frontend | Owns files, labels, chart selection, error presentation, dataset status and read-only values |
| Module independence | Parser and renderer do not query page controls or import demo code |

This is the prototype's implemented contract. It is not yet adapted to the shared repository's `Chart`, `Series`, and `PointSet` interfaces.

## Shared repository comparison

Snapshot: [warmup-charts commit cc0922f](https://github.com/CSE210-Team-7-11/warmup-charts/tree/cc0922f47a17d139a5b50d0d6923f2c747257cff), read on October 12 after backend PR #3 merged. CSV parsing, random data, sample files, and CI are implemented. Chart drawing remains a frontend skeleton. The CSV policy is still marked `proposed` in ADR-0010, although the backend now implements it.

| Topic | Shared repository | Prototype | Integration work |
| --- | --- | --- | --- |
| Browser stack and scope | Plain HTML/CSS/JS, Canvas, one renderer, multiple named series, fixed axis bounds | Same functional scope | Reuse the verified drawing logic after teammate review. |
| Public API | Import `Chart`, `Series`, `PointSet`, `parseCSV`, and `randomData` from `src/index.js` | Import `drawChart` and `parseCsv` from separate modules | Adopt the shared public import boundary in the integrated build. |
| Rendering calls | `new Chart(canvas, options)`, `setSeries(series, colors)`, `setOptions(options)`; line mode is `showLine` | `drawChart(canvas, { type, xLabel, yLabel, series })`; line mode is `type: 'line'` | Port the drawing helpers into the `Chart` methods or use an agreed temporary adapter. Labels still need a documented option contract. |
| Point storage | `Series.name`; `Series.points` is a `PointSet` with parallel `xs` and `ys` Float32 views and `length` | `{ name, points: [{ x, y }] }` | The prototype rejects a `PointSet` passed directly as `points`. A structural adapter works for small inputs but does not restore original values or ordering. |
| Line order | `PointSet.fromArrays` sorts by x | Preserves each series' CSV row order | Decide the intended line semantics. Keep source records separately if rendering uses sorted points. |
| Numeric values | Float32 storage can round JavaScript numbers | Keeps parsed JavaScript numeric values | Decide acceptable precision and source-value preservation before changing the PRD. Float64 or separate source records are options to discuss. |
| CSV layout | Implemented wide table: `x,Revenue,Cost`; each later column is a series | `x,y` or the long table `series,x,y` | Use the shared parser in the integrated demo and reconcile the PRD and examples with the chosen format. |
| Missing or invalid CSV cells | Empty y cells are gaps; invalid y cells are skipped; invalid x or column count skips the row. `onWarning` reports `skippedRows` and `skippedCells`; invalid headers throw | Entire invalid file fails with a located error and leaves the previous chart unchanged | Show the warning counts in the page and agree the product's partial-loading behavior. |
| CSV quoting | Plain comma splitting; quoted headers rejected and quoted coordinates treated as invalid | Supports quoted commas, escaped quotes, and quoted newlines | Document the shared unquoted format. |
| Fixed bounds | `Chart` accepts `xRange` and `yRange`, initially null; sample and default random data use 0–10 | Both axes are 0–5 inclusive | Set agreed fixed bounds explicitly. A structural adapter alone cannot render the shared sample under the prototype's 0–5 validation. |
| Development state | Backend parser, generator, samples and CI merged through PR #3; `Chart` drawing/transform/resize methods remain TODOs | Drawing, strict CSV parsing, examples, tests and static packaging exist locally | Port reviewed drawing logic into `Chart` and keep the merged backend modules. |
| Performance | ADR-0010 discusses large files as a design driver | Small datasets were verified; point copies and a full HTML measurement table can be costly for large files | Keep the warmup acceptance dataset bounded. Benchmark before claiming support for millions of points. |

`PointSet` exposes parallel `xs` and `ys` views. Capacity is fixed and `push` throws when full; `fromArrays` allocates for the supplied count and sorts once. This differs from the earlier interleaved-buffer sketch in Slack.

## Focused compatibility experiment

Running the shared `PointSet` and `Series` modules locally produced two differences: x order `[2, 1, 3]` became `[1, 2, 3]`, and y value `0.1` became `0.10000000149011612`. The prototype keeps input order and JavaScript numeric values.

Passing that `Series` directly to the prototype validator throws `Series 1 points must be an array.` Converting the parallel views to `{ x, y }` objects passes validation for the three points, but keeps the sorted order and Float32 rounding.

The merged backend parses `data/multi-series.csv` into two series of four points. The prototype parser rejects its wide header. Passing the shared `Series[]` directly fails the points-array check; converting it to objects then fails on x = 10 because the prototype only accepts 0–5. The shared malformed sample retains valid points and reports two skipped rows and two skipped cells through `onWarning`.

## Merge recommendation

Keep the standalone prototype on a review branch for now. Directly replacing the shared app would discard the merged backend contract and leave format, range, ordering, and error-policy mismatches. Reuse the coordinate, axis, point, line, legend, and file-loading logic in smaller integration changes against the shared `Chart` API. Complete a joint browser trial before merging the integrated app into `main`.

## Integration decisions and task outline

Confirm four items with the leads before porting: wide CSV layout, invalid-cell handling and warning counts, line ordering, and numeric/source-record preservation. These affect the product's behavior, not just function names. The current PRD describes strict errors and source order/value preservation; revise those requirements only after the team agrees on changed behavior.

Use the shared skeleton as the integration target. Keep one parser and one rendering path in the final demo. A temporary conversion at the boundary may help a small-data trial, but converting every point to objects defeats part of the compact-storage goal for large files.

Suggested task packages, with owners to be agreed:

| Package | Shared code | Prototype logic available for review | Completion condition |
| --- | --- | --- | --- |
| Canvas layout, mapping, axes and labels | `Chart.#resize`, `#makeTransform`, `#drawAxes` | `src/coordinates.js`, axis drawing and device-pixel handling in `src/graph.js` | Known bounds and midpoint map correctly; labels, ticks and high-density sizing are readable. |
| Points, lines, colors and legend | `Chart.#drawSeries`, `#drawLegend`; demo color assignment | Series drawing, legend layout and color mapping in `src/graph.js` and `src/config.js` | Both modes use the agreed point order, keep series separate and show matching colors/legend. |
| Demo controls, file loading and integration | `demo/main.js`, public imports from `src/index.js` | File-load handling, labels, mode switching, status, errors and read-only table in `demo/app.js` | Agreed sample CSV loads in both modes; fatal errors keep the previous chart; skipped data is reported if that policy is adopted. |
| Backend data and checks | `src/data.js`, `src/point-set.js`, `data/`, lint/CI | Parser cases, sample measurements and verification scenarios | `parseCSV`/`randomData` return the agreed `Series[]`; valid, empty and malformed samples demonstrate the agreed behavior. |
| Independent review and video | README trial and team video | Local demo clip and `examples/reuse.html` | A teammate runs the code, records feedback and corrections, and the final recording shows the reviewed integration. |

Several frontend tasks touch `src/chart.js`. Agree on method ownership and use small PRs or separate drawing helpers to avoid simultaneous conflicting rewrites. The frontend lead coordinates the interface and integration; teammates choose implementation or review packages based on interest and work already started. Albert remains the video contact from the existing team plan.

## Integration check

Use a known CSV with two series, endpoints and a midpoint. Verify point positions, within-series line order, color/legend correspondence and unchanged source values. Try header-only, missing-coordinate and nonnumeric CSVs; confirm errors do not replace the previous graph or table. Have someone who did not implement the library run a second CSV through the documented interface.

## Fallback decision

If the team uses this prototype for Tuesday, agree on the modules and page changes, then complete review, teammate trials, deployment, and recording.

Proposed target: runnable integration on Monday afternoon, followed by review and recording before Tuesday at 11:59 AM.
