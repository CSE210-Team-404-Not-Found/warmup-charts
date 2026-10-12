---
status: accepted
date: 2026-10-09
decision-makers: Team members present at kickoff meeting
---

# ADR-0004: Accept a single read-only CSV input format

## Considered Options

* Multiple input formats with conversion
* Editing points directly on the graph
* A single CSV format

## Decision Outcome

Chosen option: **a CSV file of (x,y) pairs**. Randomly generated points are
used during development and testing.

### Consequences

* Good: points cannot be edited or added on the graph, which prevents
  fabricating data (as noted in lecture).
* Open: how multiple data series are represented. See ADR-0010.
