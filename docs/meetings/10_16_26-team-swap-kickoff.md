# 10/16/26 - Warmup Project Team-Swap Kickoff

Format: Zoom

Attendees: Anna, Jason, Loisel, Max, Mia, Sukruth

## 1. Project Handoff and Current Direction

The team reviewed the existing chart library and discussed which parts of the
previous team's intended scope to continue. The team understood that the
previous team used a developer competing with Wolfram Alpha as a user-story
example and discussed considering users unfamiliar with software internals,
including those on slower devices or networks (see the [10/09 kickoff
meeting](10_09_26-warmup-kickoff.md)). The team will keep these user
considerations as part of its theory of the chart's purpose, users, and design, and use
that theory to guide future features and modifications. The team will discuss and 
attempt to prioritize the previous team's ideas and goals.

## 2. Data Capacity and Performance

The team discussed how much data the chart should support. Test inputs now
include `data/large-multi-series.csv` with 1,000,000 rows and two series, and
`data/many-series.csv` with 1,000 rows and 200 series. These are stress-test
samples, not a guarantee of the maximum supported dataset size; a maximum has
not yet been established.

[ADR-0012](../decisions/0012-parallel-data-rendering) records the accepted
direction to use MapReduce-style parallel work with Canvas 2D rather than
rewrite the renderer for WebGL. The performance target is to draw a chart in
under one second while keeping the page responsive. To evaluate this target,
the team plans to benchmark increasing CSV sizes from a header-only file
(zero data points) through 500,000 data rows, measuring end-to-end load render latency. 
Benchmark results could include the browser, device specs, chart dimensions, and 
series count for context.

## 3. Hover Inspection

Hover inspection was discussed as a way to show a point's series and values
without labeling every point. ADR-0005 lists hover interactions as a stretch
goal. [ADR-0011](../decisions/0011-hover-inspection.md) remains proposed and
does not yet record a final implementation decision. 

## 4. Chart UI Features

The team  discussed a Save/Apply button to batch chart-setting changes and
redraw once with the final values, rather than redrawing during each edit. In
the current demo, axis-label fields redraw on each input event. 
A Save/Apply action could make editing several settings feel more deliberate 
and avoid intermediate redraws.

The team also considered adding demo controls for configurable axis start and end values, 
which the previous team listed as a stretch goal in [ADR-0005](../decisions/0005-scope.md).

Logarithmic axes were also briefly discussed as a possible feature to explore.

## 5. Comparison with Desmos

The team discussed comparing the library with Desmos as a reference for chart
clarity and ease of inspection. Comparison should focus on relevant
workflows such as reading values, adjusting axis ranges, and understanding
trends. 

## 6. CSV Value Formats

The team discussed whether CSV values with display formatting, such as a
currency symbol (`$1.25`), should be accepted. The previous team's format uses
plain numeric values, and the team leaned toward keeping that format rather
than supporting an open-ended range of formatting conventions. Need to investigate
how the parser handles representative value and other formats discussed in the meeting, 
to decide whether supporting any additional formats is worth the added complexity.

## 7. Task Assignments

Clearly defined roles have yet to be finalized. Current tasks are split amongst members 
by consensus during meeting.

Current User Stories / Tasks:
- Sukruth: Benchmark CSV parsing and chart drawing.
- Max: Implement MapReduce rendering.
- Mia: Add a Save/Apply button.
- Loisel: Implement tooltip inspection.
- Anna: Compare the chart with Desmos.
- Abdulaziz: Review CSV parsing and Anna's suggested formats.

## 8. Team Video

The planned video structure is:

1. Project handoff reflection
2. Current direction
3. Development approach
4. Demonstration
5. Lessons learned

## 10. Open Items
- Branching and pull-request policy
- Commit and branch naming policy
- Role assignment based on experience and preferences
