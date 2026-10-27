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

A live demo is available at https://cse210-team-404-not-found.github.io/warmup-charts/

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

CircleCI runs them on every push and pull request, and publishes each release
to GitHub Pages (ADR-0015). SonarQube Cloud analyzes `main` and each pull
request from the same pipeline, test coverage included, and reports on the
pull request (ADR-0014).
ESLint's rules include the code-smell limits chosen in
[docs/code-analysis.md](docs/code-analysis.md).

### Pre-commit hook
`npm install` (or `npm ci`) also installs a Git pre-commit hook, using
[husky](https://typicode.github.io/husky/) and
[lint-staged](https://github.com/lint-staged/lint-staged). There is nothing
else to set up. If you cloned the repository before the hook was added, run
`npm install` once more.

On each commit, the hook runs `eslint --fix` on the staged `.js` files. Fixable
problems, such as indentation and quotes, are corrected and added to the
commit. Any remaining error blocks the commit; fix it, stage the file, and
commit again.

To check that the hook is installed, run:

```sh
git config core.hooksPath
```

It should print `.husky/_`. In an emergency, `git commit --no-verify` skips
the hook, but CI still runs the linter on every push.

## E2E tests
The end-to-end (E2E) tests open the demo in a real browser and use it the way a
person would: loading files, changing options, hovering over points and downloading the chart. We use [Playwright](https://playwright.dev) to drive the
browser. Each test checks one acceptance criterion from the user stories in
`docs/user-stories.md`.

**Files.** The following files are in `e2e/`:

- `load-csv.spec.js`, `read-data.spec.js`, `tooltip.spec.js`, `customize.spec.js`,
  and `large-data.spec.js` contain the tests, one file for each of the five user
  stories.
- `helpers.js` contains the steps the tests share such as opening the demo,
  uploading a file and finding a series' color on the chart.
- `server.js` is a small file server that Playwright starts before the tests so
  you don't need to start one yourself.
- `fixtures/` contains small CSV files whose points land in known places.

**Getting Started.** You will need Node.js 22 or later. Install the dependencies
and Chromium and then run the tests:

```sh
npm ci
npx playwright install chromium
npm run e2e
```

All the tests should pass in under a minute.

**Running and Debugging Tips.**

- To run a single file you give its path. e.g. `npx playwright test e2e/tooltip.spec.js`.
- Add `--headed` to watch the browser while the tests run or `--ui` to open
  Playwright's test viewer where you can step through each test.
- When a test fails, Playwright saves a trace in `test-results/`. You can open it
  with `npx playwright show-trace <path to trace.zip>`.

**Continuous Integration.** CircleCI runs the E2E tests on every push in
Playwright's Docker image. The version of that image must match the version of
`@playwright/test` in `package.json` so update both together.

**Coverage.** Each test records which lines of the page's scripts the browser
ran, and the run ends by merging them into `test-results/e2e-lcov.info`.
CircleCI hands that file to the `analyze` job, so Sonar counts the browser
tests towards coverage next to the Node tests. It counts lines executed, not
behaviour checked: a line the browser ran while a test looked at something
else still counts.

**Limitations.** The chart is drawn on a canvas. The page cannot tell the
tests where the points are. Instead, the tests find points by looking for each
series' color in the canvas pixels. Anything that is only visible in the
picture such as how the axes fit the data or the order in which a line connects
its points is not tested.

## Releases
Pull request titles follow Conventional Commits, such as
`feat(chart): add a log scale`, and a GitHub check holds the squash merge until
the title does. release-please turns the merged titles into a release pull
request carrying the version bump and the changelog. Merging that pull request
tags the release, publishes its notes on GitHub and deploys the site. The
version is `VERSION` in `src/index.js` and shows in the page header. See
[docs/releases.md](docs/releases.md) and ADR-0015.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for the team's GitHub, code, and
repository README standards.
