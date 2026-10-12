# Graph Plotter MVP PRD

| Field | Value |
| --- | --- |
| Team | CSE210 Team 7-11 |
| Date | October 9, 2026 |

## 1. Users, Problem, and Goal

The initial users are our own team members. We need to visualize small scientific or engineering datasets, compare data series, and interpret the results while preserving the original measurements.

The product is a **reusable JavaScript plotting library that runs in the browser**, accompanied by a simple demo page. A team member should be able to follow the documentation to read CSV data, call the library, and draw either a scatter plot or a line chart. The demo page provides a way to load CSV files and try the library's capabilities.

The goal is to deliver a working MVP by Tuesday, October 13: implement the core plotting logic for both chart types ourselves, provide a clear public interface, and complete teammate trials, deployment, and the team presentation.

## 2. Deliverables and Completion Criteria

| Deliverable | Completion criteria and evidence |
| --- | --- |
| Plotting library | A documented public interface accepts caller-provided data and draws scatter plots and line charts. |
| CSV input and examples | Read and parse CSV files containing x/y points in the browser. Provide repeatable example CSV files with their context, units, and multi-series conventions. |
| Static demo page | Both chart types, multiple series, axes, axis labels, and a legend can be demonstrated locally and through a shared deployment URL. |
| Usage and decision documentation | The README provides usage instructions; this PRD is retained; important decisions, alternatives, and tradeoffs are recorded briefly. |
| Independent teammate trial | A member who did not implement the library follows the documentation, uses another valid dataset, and records the result. |
| Team video and submission | Every member participates; the video introduces the team, explains the approach, and demonstrates the results; an accessible YouTube link is submitted to Canvas. |

The video must be **no longer than four minutes** and set to **Public or Unlisted**. Every member participates. Submit one YouTube link to Canvas by **11:59 a.m. on Tuesday, October 13**, with **one submission per team**. During the presentation, explain the approach, results, and tradeoffs, and be ready to answer questions.

## 3. MVP Scope

| ID | Requirement |
| --- | --- |
| REQ-01 | Provide a reusable library interface that can be called outside the demo page. |
| REQ-02 | Draw numeric x/y points as a scatter plot, with no connecting lines. |
| REQ-03 | Use the same point representation for a line chart, connecting consecutive points within each series. |
| REQ-04 | Display x/y axes, descriptive axis labels, and enough numeric ticks to interpret point positions. |
| REQ-05 | Support multiple series, distinguish them by color, and show the corresponding series names and colors in a basic legend. |
| REQ-06 | Preserve caller-provided measurements. Provide no controls to add, delete, or modify points on the graph. |
| REQ-07 | Support CSV as the initial file input format and parse numeric x/y points in the browser. Provide example CSV files and document column conventions, multi-series organization, context, and any relevant units. |
| REQ-08 | Provide a simple static demo page, an accessible shared URL, and local run instructions. |

Use native HTML, CSS, and JavaScript, with HTML Canvas for plotting. The library can be called independently of the demo's controls and layout. Data processing and drawing take place in the browser; this MVP requires no server or database.

**CSV file reading and parsing are required for the initial delivery.** Provide repeatable example CSV files, and pass the parsed data to the plotting library.

### Deferred and Out-of-Scope Work

Custom axis controls, additional point shapes, special x-axis annotations, hover tooltips, and crosshairs are future extensions. The initial version focuses on core plotting.

Multiple input formats, conversion between file formats, on-graph editing, cross-chart interaction, a database, and a web framework are outside this MVP.

## 4. Data Contract and Public Interface

### CSV Input

The initial version reads numeric x/y points from CSV. The demo provides controls to select and load files, with reading and parsing performed in the browser. After loading, users can switch between scatter and line modes; the page provides no controls to edit measurements directly.

Example CSV for one series:

```csv
x,y
0,0
1,1
2,4
```

The README must provide complete, usable example CSV files and document column definitions, header conventions, series names, and how multiple series are organized. Input processing and plotting use the same data contract; multi-series input must map to an array of named series.

CSV parsing preserves measurement values and row order within each series. It does not automatically sort, add points, or discard invalid rows. Initialize or replace the chart only after parsing and validation succeed.

### Plotting Interface

Convert parsed CSV data to the following JavaScript structure before calling the library. This structure is the runtime plotting interface, not an additional file import format. For example:

```js
drawChart(canvas, {
  type: "scatter", // "scatter" for a scatter plot; "line" for a line chart
  xLabel: "Time (s)",
  yLabel: "Distance (m)",
  series: [
    {
      name: "Trial A",
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }]
    },
    {
      name: "Trial B",
      points: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 3 }]
    }
  ]
});
```

Apply the following conventions:

- `canvas` is the drawing target. The caller provides the chart type, axis labels, and an array of named series.
- Point coordinates must be finite JavaScript numbers. Series names must be nonempty and unique within a chart.
- A line connects points in their supplied order. The library does not automatically sort points, interpolate curves, or connect different series. Scatter mode uses the same points without connecting lines.
- Rendering does not modify input arrays, objects, values, or order. Pixel coordinates and other derived data are stored separately.
- The initial version uses fixed axis ranges that cover the selected example data. Define the bounds in a shared configuration, ensure ticks match the ranges, and document them in the README. User-adjustable ranges are deferred.
- Series colors match the legend. The color mapping remains stable when the same ordered series are rendered in the other chart mode.
- Rendering again on the same canvas replaces the previous chart without leaving old points or segments behind.

### Boundary Cases and Error Handling

| Input or situation | Expected behavior |
| --- | --- |
| All series contain no points | Display the axes and a visible “No data” message without crashing. |
| CSV contains no measurement rows | Display the axes and a visible “No data” message without crashing. |
| CSV cannot be read or parsed, columns do not match the documented contract, or coordinates are missing or cannot be converted to finite numbers | Display a descriptive error, identifying the row or column when possible. Do not skip invalid rows and continue drawing, or overwrite the existing chart. |
| One point | Show the point in either mode; line mode draws no segment. |
| Two points in one series | Scatter mode shows both points; line mode also draws the segment between them. |
| Missing or nonfinite coordinates, empty or duplicate series names, or an unsupported chart type | Throw a descriptive `Error`. The demo catches it and displays a readable message. Preserve the input data. |
| A point falls outside the fixed axis ranges | Throw an `Error` explaining the supported ranges. |

Validate the input before changing the current drawing so invalid input does not partially overwrite a displayed chart.

## 5. Acceptance Criteria

Use a small dataset with known coordinates to verify the following behaviors. Two series are used to check multi-series display and differentiation.

| ID | Requirements | Setup and action | Expected result and evidence |
| --- | --- | --- | --- |
| AC-01 | REQ-01, REQ-07 | A teammate who did not implement the library follows the README, reads another valid CSV dataset, and supplies the parsed data through the public interface. | Both chart types work without changing internal library code. Record the participant, CSV data, result, and any problems found in the usage documentation. |
| AC-02 | REQ-02 | Render a known two-series dataset in scatter mode. | Each point appears at the expected position, with no connecting lines. |
| AC-03 | REQ-03 | Render the same data in line mode, then render it in scatter mode on the same canvas. | Lines connect only consecutive points within each series. Scatter mode removes the lines, and no old marks remain. |
| AC-04 | REQ-04 | Use data containing the endpoints and a midpoint of the fixed ranges. | Axes, numeric ticks, and labels are readable. Coordinate-to-pixel mapping is correct, including the conversion to Canvas's vertical coordinates. |
| AC-05 | REQ-05, REQ-07 | Read and render at least two named series using the CSV multi-series conventions documented in the README. | Series names match their data. Colors are distinguishable, and legend names and colors match the plotted series in both modes. |
| AC-06 | REQ-06 | After rendering both chart types, compare the input with a saved copy and inspect the page controls. | Input values and order remain unchanged. The page has no controls for editing points on the graph. |
| AC-07 | REQ-07 | Exercise the boundary cases in Section 4. | Empty and single-point data behave as specified. Invalid input produces a clear error without a partial redraw. |
| AC-08 | REQ-08 | Follow the local run instructions and have another teammate open the deployed page in a browser. | Both chart types work. Labels, the legend, and page assets load correctly. Record the deployment commit that was checked. |
| AC-09 | REQ-06, REQ-07, REQ-08 | Load an example CSV with known coordinates in the demo, then try CSV files with no measurement rows, missing coordinates, and nonnumeric coordinates. | Valid CSV values and row order are preserved, and both chart modes work. Empty data shows a message. Invalid CSV produces a clear error and preserves the previous chart. |

Verify plotting logic with a small known dataset or coordinate-mapping checks. Basic browser checks and recorded teammate trials can verify the presentation flow. Add useful automated checks for error-prone logic such as coordinate mapping and input preservation.

### Quality Constraints

- **Performance:** prioritize correct rendering and responsive behavior with the selected example dataset. Record the point count, browser, and any visible delay. If time allows, run larger experiments, such as 10,000 points, and report the results.
- **Browser coverage:** select and record a primary desktop browser and version for acceptance. If time allows, perform basic checks in another browser used by a teammate.
- **Deployment:** keep the demo static. Use GitHub Actions for linting and GitHub Pages for deployment, and verify the workflow and shared URL.
- **Maintainability:** keep input validation, coordinate mapping, drawing, and demo integration understandable and easy to modify separately. Avoid adding a framework, server, or generalized plugin system for this MVP.
- **Example data:** provide repeatable example CSV files, label synthetic data clearly, and explain what the axes represent. Random points may help during development; use CSV files with known coordinates to verify reading and plotting.

## 6. Implementation Approach

Input processing first reads the CSV, parses each series' x/y measurements using the shared conventions, and converts them to the library's data structure. The library validates the input, converts data coordinates to pixel positions on the canvas, and draws the axes and points. Line mode connects consecutive points within each series in input order, while scatter mode displays only the points. It then displays axis labels and the legend. Both chart types share the parsed CSV data, data representation, and coordinate-mapping logic.

| Approach | Purpose and tradeoffs | Follow-up work |
| --- | --- | --- |
| Native web stack | HTML, CSS, and JavaScript support the current browser use case with little initial setup. | Start with plain JavaScript. Revisit TypeScript if a clear benefit justifies additional tooling. |
| Canvas rendering | Canvas directly draws the required points and lines. DOM elements may be easier to write and reason about; hover interaction in Canvas requires additional position mapping. | Record the tradeoff in a short ADR. Reassess interface, rendering, and interaction costs before migrating to WebGL. |
| Shared scatter and line representation | Both chart types use x/y points, with connecting lines added in line mode. | Connect points in input order and reuse the mapping logic. |
| CSV input and internal data representation | CSV is the initial file input format. Parsed data uses a shared structure of named x/y series for both chart types. | Document CSV column and multi-series conventions, loading behavior, and example files. Implement reading and parsing, and connect them to the plotting interface. |
| Fixed ranges and error handling | Fixed ranges reduce initial work. Explicit errors prevent measurements from being silently discarded. | Set the bounds to cover the example data and implement Section 4's boundary behavior. |
| Actions and Pages | Support code checks and static deployment; configuration and availability need to be verified. | Establish a minimal lint/deployment workflow and check the shared URL. |
| AI use | AI may assist coding when the contributor understands and verifies the result. Do not use AI for visual design. | Communicate the rules to all members. Contributors must be able to explain and verify AI-assisted code. |

For important decisions, use concise Markdown records in `docs/adr/` to describe the context, alternatives, choice, tradeoffs, and participants or discussion links. Use a lightweight MADR format to record actual discussion and evidence.

## 7. Implementation Checklist and Collaboration Records

Create linked Issues for the following tasks and record their progress. “Timing” describes what can begin immediately and what results are needed to complete a task.

| Task | Output and completion condition | Timing |
| --- | --- | --- |
| W-01 | Standardize CSV column and multi-series conventions, the plotting interface, example CSV files, and axis ranges; document loading and library calls. | Can begin immediately. |
| W-02 | Implement CSV reading, parsing, input validation, and coordinate mapping; verify row order, known endpoints, and a midpoint. | Begin once the CSV conventions, internal data structure, and axis ranges are established. |
| W-03 | Implement scatter and line drawing with shared logic while preserving the input. | Implement and verify drawing once coordinate mapping is ready. |
| W-04 | Integrate CSV file selection and loading, the demo page, axis labels, series colors, and the legend; demonstrate both modes. | Page structure can be built early. Complete integration once CSV parsing, the interface, and plotting functions are ready. |
| W-05 | Configure a minimal lint/deployment workflow and verify the shared demo URL. | The workflow can be configured early. Verify deployment once the demo page is ready. |
| W-06 | Complete acceptance checks and independent teammate trials; fix blocking problems. | Check the core functionality once it is complete. After deployment, check remote access and use. |
| W-07 | Update README usage instructions and record important decisions. | Throughout development, keeping the documentation aligned with the implementation. |
| W-08 | Collect member introductions and combine the approach, demo, and lessons learned into a video of no more than four minutes. | Collect introductions early. Record the demo and finish editing once the demo page is ready. |
| W-09 | Verify the Public or Unlisted YouTube link and submit one team entry before the deadline. | Check access and submit once the video is complete. |

Keep current progress in Issues or GitHub Projects. For each task, record its **status, blockers, requirement/acceptance IDs, discussion or PR links, and verification evidence**. A short Issue comment can document a review, pairing session, or handoff by stating who participated, what was discussed or tried, and the result.

Record collaboration through teammate trials, interface alignment, code reviews, and fixes. Comments should identify the participants, feedback, and outcome. Preserve useful Slack conclusions in a linked Issue or decision record.

### Schedule

| Target date | Expected result |
| --- | --- |
| Sunday, October 11 | Standardize the interface and shared data, begin plotting development, record progress in Issues, and collect member introductions. |
| Monday, October 12 | Integrate the library and demo, deploy, complete teammate trials, and edit the video. |
| Before 11:59 a.m. on Tuesday, October 13 | Check the final video's length and access, submit the YouTube link, and preserve the corresponding code and document commit. |
| Tuesday presentation | Present the approach and results, explain tradeoffs, and answer questions. |

Attach evidence of completed work to the corresponding Issue. If a target is missed, record the blocker and the actual result demonstrated.

A suggested video allocation is approximately 25 seconds for the team introduction and 12 seconds per member, with the remaining time for the approach, product demo, and lessons learned. Keep the full video within four minutes; adjust the style and segment lengths to suit the available footage.
