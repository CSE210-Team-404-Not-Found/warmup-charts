# Graph Plotter

A browser JavaScript plotting library and demo for CSE210 Team 7-11. Supports scatter plots, line charts, and multiple named series.

## Run locally

Requires Node.js 24 or later.

```sh
npm start
```

Open **http://127.0.0.1:4173**. Choose an example or load a local CSV, set the axis labels and units, and switch between scatter and line. **View plotted measurements** shows the source values. Invalid input keeps the last successful chart and table.

The server serves static files; CSV parsing and drawing run in the browser. `npm start` needs no installed packages. For another port on macOS/Linux, use `GRAPH_PLOTTER_PORT=4174 npm start`.

You can also serve this directory with a static HTTP server and open `index.html`. Use HTTP so the browser can load ES modules.

## Call the library

Import `drawChart` from `src/graph.js` and keep the `src/` files together. The library is independent of the demo page.

```html
<canvas id="my-chart" width="800" height="450"
        style="width: 800px; height: 450px"></canvas>
<script type="module">
  import { drawChart } from './src/graph.js';

  const canvas = document.querySelector('#my-chart');
  const data = {
    xLabel: 'Time (s)',
    yLabel: 'Distance (m)',
    series: [
      { name: 'Trial A', points: [{ x: 0, y: 0 }, { x: 2.5, y: 2.5 }, { x: 5, y: 5 }] },
      { name: 'Trial B', points: [{ x: 0, y: 0 }, { x: 2.5, y: 1.5 }, { x: 5, y: 3 }] }
    ]
  };

  try {
    const result = drawChart(canvas, { ...data, type: 'scatter' });
    console.log(result.pointCount); // 6
    drawChart(canvas, { ...data, type: 'line' });
  } catch (error) {
    console.error(error.message);
  }
</script>
```

`examples/reuse.html` calls the library with `examples/data/calibration.csv` and draws both chart types. Replace the CSV and axis labels to try another dataset.

### CSV contract

CSV must have a case-sensitive header: `x,y` for one series, or `series,x,y` for multiple series. The demo uses the filename as the single-series name.

```csv
series,x,y
Trial A,0,0
Trial B,0,0
Trial A,2.5,2.5
Trial B,2.5,1.5
Trial A,5,5
Trial B,5,3
```

The sample files in `examples/data/` include synthetic motion measurements (seconds and metres), sensor calibration (volts and milliamps), single-series and empty data, and three invalid-input examples.

The parser supports decimal/scientific notation, quoted commas and newlines, escaped quotes, UTF-8 BOM, and CRLF. It trims surrounding whitespace in headers, names, and numbers. Series follow first appearance; points keep their row order within each series.

Blank measurement rows, column mismatches, malformed quotes, missing names, nonfinite numbers, and coordinates outside 0–5 reject the file with a located error. A final newline is allowed; a header-only file is valid empty data. Axis labels and units are supplied separately by the caller or page controls.

```js
import { parseCsv } from './src/csv.js';
import { drawChart } from './src/graph.js';

const series = parseCsv(csvText, { defaultSeriesName: 'Trial A' });
drawChart(canvas, { type: 'line', xLabel: 'Time (s)', yLabel: 'Distance (m)', series });
```

### Data contract

- `type`: `scatter` or `line`. `xLabel` and `yLabel`: nonempty strings, including units where relevant.
- `series`: an array of `{ name, points }`. Names must be nonempty and unique after trimming.
- `points`: an array of `{ x, y }` finite numbers. Numeric strings, missing values, `NaN`, and infinity are rejected.
- Both axes are fixed at **0–5 inclusive**, with integer ticks. Bounds and ticks are in `src/config.js`.
- Lines join consecutive points **in input order**, separately for each series. Input objects and values are unchanged.
- Colors follow series order and stay the same when switching chart type.
- Empty data draws axes and “No data”. One point has no segment; two points have one segment in line mode.
- Invalid input throws `Error` before changing the bitmap.

### Canvas sizing and return value

Give the canvas a displayed size of at least **240 × 240 CSS pixels**, with enough height for the legend. The bitmap scales with device pixel density; a canvas sized by HTML attributes keeps its displayed size. Call `drawChart` again after a resize. The demo handles this automatically.

The return value contains `type`, `pointCount`, `series` (name, color, pointCount), `width`, `height`, and `plotArea`. Dimensions use CSS pixels. Long legend entries wrap or use condensed text; a legend that cannot fit throws a size error.

The demo provides a text summary and read-only table alongside the canvas for access to measurement values.

## Checks

```sh
npm ci
npm run check
```

Runs ESLint, 54 Node tests, and the build. Tests cover CSV parsing and errors, coordinates, line order, redraw, input preservation, colors, legends, and canvas sizing. Browser results and pending checks are in [docs/verification.md](docs/verification.md).

```sh
npm run build
```

Copies `index.html`, `styles.css`, `src/`, `demo/`, and `examples/` into `dist/`, plus `.nojekyll`. Edit the source files, then rebuild.

## Review branch

This standalone copy is in `prototypes/graph-plotter/` on `codex/product-prototype`. The shared app's `src/`, `demo/`, `data/`, and public API are unchanged.

The repository's Pages workflow publishes the shared app and excludes this prototype folder. Run the prototype locally using the instructions above. See [docs/integration.md](docs/integration.md) for the comparison with backend PR #3 and the recommendation to integrate drawing logic in smaller changes before merging.

## Files and team follow-up

| Path | Purpose |
| --- | --- |
| `src/graph.js` | Public rendering interface, axes, points, lines, and legend |
| `src/csv.js` | CSV parsing, multi-series grouping and located input errors |
| `src/validation.js` | Input checks and a separate copy of the source points |
| `src/coordinates.js` | Numeric-to-pixel mapping |
| `src/config.js` | Fixed ranges, ticks, and stable series colors |
| `demo/` | Frozen synthetic datasets and page controls |
| `examples/` | A separate consumer of the library |
| `test/` | Automated behavioral checks |
| `docs/prd.en.md` | English MVP PRD |
| `docs/prototype.md` | English prototype handoff, demo and team trial instructions |
| `docs/integration.md` | Implemented interface and frontend/backend integration checks |
| `docs/verification.md` | Verification evidence and incomplete acceptance work |
| `docs/adr/` | Brief records of implementation choices |

This prototype was developed with AI coding assistance. Review the implementation before integrating it. [docs/integration.md](docs/integration.md) compares this API with the team's shared `Chart`, `Series`, and `PointSet` skeleton.
