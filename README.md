# warmup-charts

Team 7-11 \ CSE 210

A canvas charting library for scatter plots and line graphs.

warmup-charts draws data series on an HTML `<canvas>`, either as individual
points or connected by lines. It is written in plain JavaScript and has no
dependencies or build step.

- Multiple series per chart, each with its own color and legend entry
- Any number of independent charts on one page
- CSV loading that skips malformed rows and cells
- Typed-array point storage, designed for data sets with millions of points

A live demo is available at https://cse210-team-7-11.github.io/warmup-charts/.

## Running the demo
The page uses ES modules, which browsers won't load from `file://`. Instead, serve the file with `python3`:

```sh
cd <project-directory>
python3 -m http.server
```

Then open http://localhost:8000.

## Using the library
A chart is created on a `<canvas>` element and given a list of series, along
with one color per series.

```js
import { Chart, randomData } from "./src/index.js";

const chart = new Chart(document.querySelector("canvas"), { showLine: true });
const series = randomData({ seriesCount: 2 });
chart.setSeries(series, ["red", "blue"]);
```

All public exports are in `src/index.js`. The other modules in `src/` are internal.

## CSV format
The header row names the x column, followed by each series. Each subsequent
row contains an x value and the value of each series at that x. An empty cell
indicates that the series has no point at that x.

```csv
x,Revenue,Cost
0,1.2,0.8
1,1.5,
2,1.7,1.1
```

## API

### `new Chart(canvas, options)`
Creates a chart on a `<canvas>` element. The options are `width` and `height`
in CSS pixels (default 800 × 450), `showLine` (default `false`), the axis labels
`xLabel` and `yLabel`, and the fixed axis ranges `xRange` and `yRange`, each
given as `[start, end]`. Without a fixed range, an axis fits the data. The
chart sizes the canvas's bitmap to match its displayed size, including on
high-density screens.

`showAxes`, `showAxisLabels` and `showLegend` (all default `true`) turn those
parts on and off. Small charts also drop them when they don't fit: axis labels
below 240 × 200, the legend below 160 × 120 or when it would take over a quarter
of the height, and axes below 120 × 100, leaving only the data.

`setSeries(series, colors)` replaces the chart's data, with one CSS color per
series in the same order. `setOptions(options)` merges new options into the
current ones. The chart redraws on the next frame after either call and
whenever its canvas is resized. `draw()` starts a redraw immediately.

For large scatter plots (18,000 points or more), browsers with module workers
and `OffscreenCanvas` render data layers in a pool of up to 32 workers. Axes,
labels, layout, and final composition remain on the main thread. Smaller
datasets, line charts, and browsers without the required APIs use the regular
main-thread renderer.

`destroy()` disconnects the chart from its canvas.

### `new Series(name, points)`
Creates a series from a name, shown in the legend, and a `PointSet`.

```js
const series = new Series("Revenue", PointSet.fromArrays([0, 1, 2], [1.2, 1.5, 1.7]));
```

### `PointSet`
Holds points stored as `Float32Array`s, in the order they were added.
`PointSet.fromArrays(xs, ys)` copies existing arrays into a new set. To load
points individually, create a set with a fixed capacity and push the points in
any order.

`sort()` sorts the points by x, then y, in place without allocating. It is a
no-op if they are already sorted, and `sorted` reports whether they are. A
chart sorts a series only to draw it as a line; scatter plots are drawn in
any order.

```js
const points = new PointSet(1000);
points.push(3, 30);
points.push(1, 10);
points.sort();
```

`push` throws if the set is full. `xs` and `ys` return the stored coordinates
as read-only views, and `start` and `end` return the first and last points in
sort order, without sorting.

Coordinates are stored with about 7 significant digits of precision, which is
insufficient for large x values such as Unix timestamps.

### `parseCSV(text, { onWarning })`
Returns one `Series` per column of the [CSV format](#csv-format) and throws if
the header is invalid. If anything was skipped or rounded by Float32 storage,
`onWarning` is called with `{ skippedRows, skippedCells, roundedPoints }`.

```js
const series = parseCSV(text, { onWarning: console.warn });
```

### `randomData(options)`
Returns randomly generated series for testing. The default is one series of
10 points, with x and y between 0 and 10. `seriesCount` and `pointCount` set
the size, and `xMin`, `xMax`, `yMin`, and `yMax` set the ranges. `random`
accepts a function returning numbers in `[0, 1)`, for repeatable tests.

```js
const series = randomData({ seriesCount: 3, pointCount: 100000 });
```

## Sample data
`data/` contains a single-series file, a two-series file, a header-only file,
and a malformed file for testing how invalid input is handled.

## Layout
`src/` contains the charting library; `index.html` and `demo/` instantiate the chart and demonstrate its usage.

| Path | Owner | Contents |
|---|---|---|
| `src/index.js` | Both | The library's public API, and the only module pages import |
| `src/chart.js` | Frontend | `Chart`, which draws and manages one chart |
| `src/series.js` | Both | `Series`, which passes data from the backend to the frontend |
| `src/point-set.js` | Backend | `PointSet`, which stores each series' points |
| `src/data.js` | Backend | `parseCSV(text)` and `randomData(options)`, both returning `Series[]` |
| `index.html`, `style.css`, `demo/` | Frontend | Demo page using the library, with a 7-11 theme toggle |
| `data/` | Backend | Sample CSVs |
| `test/` | Backend | Unit tests for the library |
| `docs/decisions/` | Leads | Architecture Decision Records (MADR) |
| `docs/meetings/` | Leads | Meeting notes |

## Checks
These need Node.js 22 or later.

```sh
npm ci
npm run lint
npm test
```

CircleCI runs them on every push and pull request, and publishes `main` to
GitHub Pages when they pass.
