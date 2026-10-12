# warmup-charts
Warmup scatter-plot and line-graph project for Team 7-11.

## Backend setup and checks

Install Node.js 22.13+ (22.x) or Node.js 24+, then run:

```sh
npm ci
npm run lint
npm test
```

GitHub Actions runs these checks on pushes (including `main`) and pull requests.
The renderer and demo page are still pending in this checkout; this contribution
provides data processing only. No framework or runtime dependency is required.

## CSV and frontend handoff

Import the browser-native ES modules from a script with `type="module"`:

```js
import { parseCSV } from "./src/parseCSV.js";
import { randomData } from "./src/randomData.js";

const series = parseCSV(await file.text()); // file is a selected browser File
// After successful parsing, pass series to the team's renderer:
// drawChart(canvas, { type: "scatter", xLabel: "Time (s)",
//   yLabel: "Distance (m)", series });
const testSeries = randomData({ seriesCount: 2, pointCount: 20 });
```

`parseCSV(text)` returns an array of `{ name, points: [{ x, y }] }`.
The headers are case-sensitive and must be `x,y` (one series named `Series 1`)
or `series,x,y` (named series). Repeated names group measurements into one
series. Series appear in order of first occurrence; points retain their file
order. There is no sorting or interpolation.

Coordinates accept finite decimal numbers, including scientific notation.
Fields are trimmed. Quoted fields support commas, newlines, and escaped double
quotes (`""`). UTF-8 BOM, LF and CRLF are accepted. Blank lines are ignored;
a row of empty comma-separated fields is invalid. Empty input or a valid header
without measurements returns `[]`.

Invalid headers, wrong column counts, empty names, malformed quoting, missing
coordinates, and nonnumeric/nonfinite values throw descriptive errors. Row
numbers refer to physical file lines, with a multiline record identified by its
starting line. Parsing never returns partial data or silently skips invalid rows.
The frontend must catch errors and show their message, and only call the renderer
after parsing succeeds to preserve the existing chart on failure.

### Sample data

All examples are synthetic: x represents time in seconds and y distance in meters.
Valid sample coordinates lie in 0–10 on both axes; the frontend team must confirm
and configure its fixed ranges. Parsing itself does not enforce axis bounds.

- `data/single-series.csv`: one series, including (0,0) and (10,10).
- `data/multi-series.csv`: two interleaved trials to check grouping and legend names.
- `data/empty.csv`: header only, for the renderer's no-data behavior.
- `data/malformed.csv`: fails at row 3, column y; also contains a missing coordinate.

### Random test data

`randomData()` defaults to one series of 10 points with each coordinate in [0,10).
Options: `seriesCount`, `pointCount`, `xMin`, `xMax`, `yMin`, `yMax`, and
`random` (a function returning a number in [0,1), for repeatable tests).
Counts must be nonnegative safe integers; bounds must be finite and ordered.
Equal bounds produce a constant coordinate. Random points remain in generation
order, so line graphs may zigzag. This data is only for testing, not measurements.

## Explaining this contribution

The CSV reader walks through text once, keeping track of quoted fields and line
numbers. Validation rejects the entire file on the first bad row. A JavaScript
`Map` groups points by series name while preserving insertion order. Using
`split(",")` alone would fail on quoted names containing commas. An external CSV
library is an alternative, but adds a dependency for this small warmup.

Random data uses a weighted average of the lower and upper bounds for each sampled
coordinate. Both functions return fresh arrays and objects and do no drawing.
Automated tests cover parsing, malformed input, sample files, and random bounds.
Review the code and run the tests before contributing it under the team's AI policy.
