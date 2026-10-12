---
status: proposed
date: 2026-10-12
decision-makers: Backend subteam
---

# ADR-0010: CSV input format, wide layout

## Context and Problem Statement

ADR-0004 fixed a single CSV input format but left open how multiple series
are represented. ADR-0005 puts multiple series, with a legend, in the MVP, so
each series also needs a name. How are several series, and their names,
laid out in one CSV file?

## Decision Drivers

* Each series needs a name for the legend.
* Files should match what users' spreadsheets already export.
* Files may hold millions of points, so the format should stay compact and
  map cheaply onto one `PointSet` per series.

## Considered Options

* Wide layout: first column is x, each further column is one series
* Long ("tidy") layout: `series,x,y` on every row

## Decision Outcome

Proposed option: **wide layout**, split on plain commas.

```
x,Revenue,Cost
0,1.2,0.8
1,1.5,
2,1.7,1.1
```

* A header row is required. The first column is x, and each other column is
  one series named by its header. The first column's header is ignored.
* A file with one value column (`x,y`) is a single series named by that header.
* An empty cell means the series has no point at that row's x.
* No quoting: every comma separates fields, so series names cannot contain
  commas. Full RFC 4180 quoting is unnecessary for the warmup.
* Malformed input:
  * A cell that is not a finite number is skipped and counted, so no NaN
    reaches `PointSet`. The x cell being invalid skips the whole row.
  * A missing header, fewer than two columns, or duplicate series names is
    an error.

### Consequences

* Good: matches spreadsheet exports (Excel, Google Sheets) and their chart
  conventions.
* Good: series names appear once, in the header, keeping large files small.
* Good: each column maps directly onto one `PointSet`.
* Bad: series that share no x values produce many empty cells.

## Pros and Cons of the Options

### Wide layout

* Good: what spreadsheet tools export for charts.
* Good: compact, names are not repeated.
* Bad: sparse when series have unrelated x values.

### Long ("tidy") layout

Used by `ggplot` and Vega-Lite.

* Good: series can have completely independent x values.
* Bad: the series name repeats on every row.
* Bad: less accessible to spreadsheet users.
