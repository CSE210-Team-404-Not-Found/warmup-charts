---
status: accepted
date: 2026-10-09
decision-makers: Team members present at kickoff meeting
---

# ADR-0001: Use the HTML `<canvas>` element for rendering

## Context and Problem Statement

The application must render points, lines, and labels in the browser.

## Considered Options

* SVG
* WebGL
* DOM elements
* Canvas

## Decision Outcome

Chosen option: **Canvas**, for its efficiency and feature support.

### Consequences

* Bad: hover requires translating mouse coordinates into canvas space. This is
  acceptable because hover is not a core goal.

## Pros and Cons of the Options

* SVG: rejected because layered SVGs become messy quickly.
* WebGL: rejected as too complex for the warmup.
* DOM elements: proposed as a simpler way to guarantee completion, but not
  chosen.
