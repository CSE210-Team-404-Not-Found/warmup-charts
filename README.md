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


## Backend checks

Use Node.js 22.13+ (22.x) or Node.js 24+:

```sh
npm ci
npm run lint
npm test
```

GitHub Actions runs these checks on every push and pull request, including `main`.
The existing frontend skeleton still contains rendering TODOs; these backend
functions provide the data and do no drawing or UI design.

## CSV input

Use the public API, matching the current skeleton and ADR-0010:

```js
import { parseCSV, randomData } from "./src/index.js";
const series = parseCSV(await file.text(), { onWarning: console.warn });
const testSeries = randomData({ seriesCount: 2, pointCount: 20 });
// Both return Series[], directly accepted by Chart.setSeries(series, colors).
```

CSV uses a wide layout: the first column is x; each remaining column is a named
series. The first header label is ignored. Names are trimmed, nonempty and unique.
Quoting is unsupported: every comma separates columns. For example:

```csv
x,Trial A,Trial B
0,0,1
2,2,4
5,5,
10,10,9
```

A blank y cell means no point for that series at that x. Invalid/nonfinite y
cells are skipped; an invalid x or wrong column count skips the whole row.
This follows the current skeleton rather than the earlier draft PRD's policy
of rejecting entire files. Optional `onWarning` receives one summary containing
`skippedRows` and `skippedCells` if any values were skipped. Blank lines do not
count as skipped rows. Invalid headers throw errors.

Coordinates accept decimal and scientific notation. BOM, LF, CRLF, and surrounding
whitespace are accepted. The PointSet sorts by x (stable for ties), keeping x/y
pairs together, and stores coordinates as Float32 values; expect normal Float32
rounding. Values that would overflow Float32 are skipped. Header-only input
returns the named series with empty PointSets; completely empty input is an error
because a header is required.

### Sample files

All samples are synthetic: x is time in seconds and y is distance in meters.
Valid points fit 0–10 on both axes; the frontend chooses its fixed axis bounds.

- `data/single-series.csv`: one series with six points.
- `data/multi-series.csv`: Trial A and Trial B with four points each.
- `data/empty.csv`: a named series with no measurements.
- `data/malformed.csv`: two skipped rows and two invalid y cells; blank cells
  are gaps. The valid data is retained, as required by the skeleton.

### Random data

`randomData()` defaults to one series with 10 points, sampled between 0 and 10.
Options: `seriesCount`, `pointCount`, `xMin`, `xMax`, `yMin`, `yMax`, and `random`.
The random function must return a finite number in [0,1), and can be injected for
repeatable tests. Counts must be nonnegative safe integers; bounds must be finite,
ordered, and representable in Float32. Equal bounds produce constant coordinates.
Stored values may round to the upper bound because PointSet uses Float32 storage.
Points are sorted by x and generated through PointSet.fromArrays.

## Understanding the backend contribution

`src/data.js` splits each CSV row into columns, validates coordinates, accumulates
one x/y array per series, and creates Series objects using PointSet.fromArrays.
PointSet handles sorting, so the parser never sorts x and y independently. Random
data generates parallel typed arrays and uses the same constructor path.

Plain comma splitting follows the team's explicitly unquoted format. A CSV
library would be appropriate if quoted fields become a requirement. Typed arrays
use compact storage but trade away some numeric precision. Tests import the public
API and check sorting, gaps, invalid input, sample files and random data.
Review and understand this code before presenting it under the team's AI policy.
