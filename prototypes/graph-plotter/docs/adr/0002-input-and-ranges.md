# CSV input, one runtime data model and fixed ranges

Date: October 11, 2026

Status: Implemented in the local product prototype

## Problem

The prototype must read CSV measurements, support multiple named series and make point placement easy to verify. It must not silently convert invalid data, reorder measurements, discard rows or change source values.

## Decision

Use CSV headers `x,y` for a single series and `series,x,y` for multiple series. The runtime drawing structure is `{ type, xLabel, yLabel, series: [{ name, points: [{ x, y }] }] }`. The parser groups series in first-appearance order and retains each series' row order. The single-series default name is the filename in the demo. Axis labels and units are provided by the caller or file-loading controls.

Both axes are fixed at 0–5, with matching ticks. The repeatable synthetic CSV samples include known endpoints and midpoints. CSV parsing and renderer validation finish before a successful chart replaces the current one.

Lines connect points in input order within a series. Empty input draws axes and No data. A single point has no segment. Invalid numbers, empty names and out-of-range coordinates produce readable errors; the demo preserves its last successful plot and table.

The shared repository proposes a wide CSV format. Format and parsing differences are documented in [integration.md](../integration.md).

## Alternatives and tradeoffs

- Wide CSV columns such as x1,y1,x2,y2 make a compact spreadsheet but add conventions for unequal series lengths and names. A series column supports variable-length and interleaved series.
- One file per series is easy for simple files but requires multiple-file selection and naming behavior. The prototype uses one file with an optional series column.
- Automatic ranges accept more data but add scaling and tick behavior. Fixed ranges make known coordinates easy to verify.
- Silently clipping out-of-range data drops measurements; explicit rejection exposes the capability boundary.
- Sorting by x changes the caller's sequence; the implementation keeps the supplied order.

Ranges and ticks are centralized in `src/config.js`. There are no user range controls. CSV values must be finite decimal numbers within the supported bounds. Header-only CSV is valid empty data; blank measurement rows and malformed CSV fail as a whole.

## Evidence and revision

Tests cover CSV quoting, line endings, grouping, row order, numeric values, and located errors. Browser checks cover loading and retention of the previous graph on failure. Results are in [verification.md](../verification.md).
