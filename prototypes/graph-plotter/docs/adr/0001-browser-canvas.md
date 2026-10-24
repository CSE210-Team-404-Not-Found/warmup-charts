# Browser-side native Canvas rendering

Date: October 11, 2026

Status: Implemented in the local product prototype

## Problem

Small x/y datasets need scatter and line views. The plotting library must work outside the demo page, and teammates need to understand and extend the code.

## Decision

Use plain JavaScript ES modules and Canvas 2D. `drawChart(canvas, options)` is the public rendering interface. Input validation, coordinate mapping, drawing and page controls are separate modules. Both modes share data and positions; line mode adds connections within each series.

## Alternatives and tradeoffs

- DOM or SVG retains individually addressable graphical elements and can support per-point interaction. The current scope needs points, lines and labels, which Canvas can draw directly.
- WebGL adds graphics pipeline work beyond the current core behavior.
- An existing chart library would hide the coordinate mapping, line behavior and error handling that this implementation needs to demonstrate and explain.
- TypeScript adds a toolchain. The prototype uses JSDoc and explicit runtime checks.

Canvas pixels do not expose measurement values to a screen reader, so the demo provides a read-only HTML table and descriptive text. Hover or point selection would need hit testing. Performance has not been benchmarked.

## Evidence and revision

Tests cover coordinates, line order, series isolation, redraw, and input preservation. The reuse example loads a separate CSV. Browser results and pending checks are in [verification.md](../verification.md).
