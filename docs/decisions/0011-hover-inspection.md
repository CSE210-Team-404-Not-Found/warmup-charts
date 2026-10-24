---
status: accepted
date: 2026-10-17
decision-makers: Loisel (proposed at the 10/16 meeting with Anna, Jason, Loisel, Max, Mia, Sukruth)
---

# ADR-0011: Hover tooltips for point inspection

## Context and Problem Statement

The chart currently renders points without a way to inspect their values. With
multiple series or dense data, identifying a point's coordinates from the axes
alone is difficult. Tooltips are a core part of interactive graph websites.

## Decision Drivers

* Build on the existing canvas renderer without a deep rewrite.
* Reuse the chart's existing layout and data-to-pixel transform for hit-testing.
* Keep page-level UI in the demo, and geometry in the library.

## Considered Options

* Pointer events on the canvas, with an HTML tooltip element
* Drawing the tooltip directly on the canvas

## Decision Outcome

Chosen option: **pointer events on the canvas, with an HTML tooltip element**.
It builds on what the repository already has, and an HTML element is easier
to style and position than canvas drawing.

* `Chart#findNearestPoint(x, y, threshold)` in `src/chart.js` does the
  hit-test. It uses the same layout and transform as `draw`, so it matches what
  is on screen at any chart size.
* `demo/main.js` listens for `pointermove` / `pointerleave` on the canvas and
  shows or hides the `#tooltip` element.

Steps:

* Track the pointer over the canvas.
* Convert the pointer position to canvas-relative coordinates.
* Compare against plotted points within a pixel threshold.
* Show the tooltip only when the pointer is on a point.
* Hide it when the pointer leaves or moves away.

### Consequences

* Good: no renderer changes; tooltips work for both scatter and line charts.
* Bad: the hit-test checks every point on each pointer move. That has been fine
  on the data tested so far, but check for lag on very large datasets
  (see ADR-0012).
* Bad: resizing the canvas changes the pixel positions, so the hit-test must
  always use the current displayed size, not the bitmap size.

## Pros and Cons of the Options

### Pointer events with an HTML tooltip

* Good: familiar event model; easy to style with CSS.
* Bad: pointer positions must be converted carefully as the canvas resizes.

### Drawing the tooltip on the canvas

* Good: everything stays in one rendering surface.
* Bad: harder to style and position, and makes the renderer more complex.
