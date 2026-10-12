---
status: accepted
date: 2026-10-09
decision-makers: Team members present at kickoff meeting
---

# ADR-0003: Use a single renderer for arbitrary points

## Context and Problem Statement

"Line plot" was interpreted three ways: mathematical function plotting,
multiple line segments forming a graph, and a single line of the form
`y=mx+b`.

## Decision Outcome

A single renderer that supports arbitrary (x,y) points. A line graph connects
those points with lines.

* A mathematical function is represented by many points.
* A straight line is represented by two points.

### Consequences

* Good: one rendering path serves both scatter and line plots.
* Good: no equation parsing is required.
