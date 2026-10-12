# Product prototype verification record

| Item | Value |
| --- | --- |
| Team | CSE210 Team 7-11 |
| Date | October 12, 2026 |

## Automated checks

Local environment: Node.js 24.21.0 and npm 11.19.0. `npm run check` passed ESLint, all 54 tests, and the static build.

CSV tests cover numeric notation, quoting, BOM/CRLF, series grouping, row order, empty data, and located errors. Sample measurements match the built-in dataset. Frozen parsed input renders in both modes without changes.

Renderer tests cover known coordinates, inverted y, line order, series isolation, redraw, colors, legends, input preservation, boundaries, and canvas sizing. They use a recording Canvas context; browser layout was checked separately.

Static packaging contains the demo page, styles, library, CSV samples and independent example. It excludes PRDs, tests, development dependencies and local artifacts.

## Browser checks

Checked on October 11 at `http://127.0.0.1:4173` in Chrome; version not recorded. Browser operation was AI-assisted. Independent teammate testing is pending.

| Scenario | Observed result |
| --- | --- |
| Default Motion comparison | Two series and 12 points, labels, units and legend |
| Local motion.csv loading | Two named series and 12 points; dataset/title identify the loaded file |
| Loaded CSV switched to line | Both series connect separately; point count and color correspondence remain stable |
| Read-only values | Motion values appear in original order within each series |
| Missing coordinate CSV | Error names row 3 and column y; previous motion chart and table remain |
| Nonnumeric coordinate CSV | Error names row 3 and column y; previous motion chart and table remain |
| Out-of-range CSV | Error names row 3, column x and supported 0–5 range; prior graph remains |
| Mode switch after failed load | Last successful motion dataset switches to scatter; invalid pending file does not become chart input |
| Header-only empty.csv | Axes remain; status, canvas and table show No data |
| Single-series CSV | Three known endpoint/midpoint values load under the filename series name |
| Independent CSV caller | Calibration CSV loads and both charts render two series and eight points each |

Built-in empty, single-point, two-point, cooling, and range-endpoint examples were also checked. Screenshots are stored locally and excluded from the source archive.

Pending: mobile and second-browser checks, file-read failure simulation, large-data benchmarks, and Actions/Pages execution. Workflow YAML syntax was checked locally.

## Acceptance status

| PRD item | Evidence | Status |
| --- | --- | --- |
| AC-01 independent teammate call | Separate CSV caller and documented trial steps | Actual teammate trial remains |
| AC-02 scatter | Known coordinate tests and browser graph | Local checks passed |
| AC-03 line and redraw | Sequence/isolation/clearing tests and CSV mode switching | Local checks passed |
| AC-04 coordinates and labels | Endpoint/midpoint/y inversion tests and visible labels | Local checks passed |
| AC-05 multiple series from CSV | Interleaved sample, names/colors and both modes | Local checks passed |
| AC-06 data preservation | Frozen parsed input, value/order tests and read-only table | Local checks passed |
| AC-07 boundaries and errors | Parser/renderer tests and browser error retention | Local checks passed for tested scenarios |
| AC-08 local and shared access | Local static demo; workflows prepared | Deployment and teammate remote access remain |
| AC-09 CSV demo loading | Valid, empty, missing, nonnumeric and out-of-range files loaded in browser | Local checks passed for tested scenarios |

The English PRD is on draft PR #2. This standalone prototype is supplied for review. Prototype deployment, team review, independent teammate reuse, the final team video, and submission are pending.

## Teammate trial record template

Complete this record when a teammate runs the trial.

- Participant and date:
- Browser and version:
- Local version or deployment commit:
- CSV file, context, units and measurements:
- Scatter/line and endpoint/midpoint results:
- Series names, colors, legend and input preservation:
- Empty, single-point, two-point and invalid-file results:
- Issues, feedback, fixes and checks:
- Shared URL and remote-access result, when applicable:
