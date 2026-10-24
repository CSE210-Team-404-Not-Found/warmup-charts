import { Chart, PointSet, Series, parseCSV } from "../src/index.js";

const maxRowsInput = document.getElementById("max-rows");
const stepInput = document.getElementById("step");
const seriesCountsInput = document.getElementById("series-counts");
const runsInput = document.getElementById("runs");
const labelInput = document.getElementById("run-label");
const chartTypeSelect = document.getElementById("chart-types");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const downloadButton = document.getElementById("download");
const setupText = document.getElementById("setup");
const statusText = document.getElementById("status");
const resultsSection = document.getElementById("results-section");
const resultsTableBody = document.querySelector("#results tbody");

// The team's goal is a full load in under one second.
const TARGET_MS = 1000;
const WARM_UP_ROWS = 50_000;

// A chart counts as finished once it has gone this long without drawing.
// Long enough to cover the gaps while background workers finish their parts.
// Can be raised for slow computers by adding ?quiet=500 to the page address.
const QUIET_MS = Number(new URLSearchParams(location.search).get("quiet")) || 200;
const GIVE_UP_MS = 30_000;

// Same palette as the demo page plus gray for the target line.
const COLORS = ["#0072b2", "#d55e00", "#009e73", "#cc79a7", "#8c564b", "#6a51a3"];
const TARGET_COLOR = "#888888";

// The chart we tim at the demo page's default size.
const testChart = new Chart(document.getElementById("test-chart"));
watchDrawingCalls();
const resultsChart = new Chart(document.getElementById("results-chart"), {
    showLine: true,
    xLabel: "Rows in CSV",
    yLabel: "Total load time (ms)",
});

let results = [];
let isRunning = false;
let stopRequested = false;
let tabWasHidden = false;
let lastDrawCallTime = 0;

/**
 * Note the time of every drawing call on any canvas on the page. Some
 * versions of the chart finish drawing in the background and build the
 * picture on a hidden canvas first so this is how we know when the picture
 * is actually complete. The results chart only draws after the benchmark
 * ends, so it doesn't get in the way.
 */
function watchDrawingCalls() {
    const prototype = CanvasRenderingContext2D.prototype;
    for (const method of ["clearRect", "fillRect", "fill", "stroke", "fillText", "drawImage"]) {
        const original = prototype[method];
        prototype[method] = function (...args) {
            lastDrawCallTime = performance.now();
            return original.apply(this, args);
        };
    }
}

/** Short browser name and version for e.g. "Chrome 155". */
function browserName() {
    const patterns = [
        ["Edge", /Edg\/(\d+)/],
        ["Firefox", /Firefox\/(\d+)/],
        ["Chrome", /Chrome\/(\d+)/],
        ["Safari", /Version\/(\d+).*Safari/],
    ];
    for (const [name, pattern] of patterns) {
        const match = navigator.userAgent.match(pattern);
        if (match) {
            return `${name} ${match[1]}`;
        }
    }
    return "Unknown browser";
}

function describeSetup() {
    const { width, height } = testChart.options;
    return `${browserName()}, ${navigator.hardwareConcurrency} CPU cores, `
        + `chart ${width} × ${height} px, pixel ratio ${window.devicePixelRatio}`;
}

/** A CSV like a real upload: numeric x values and random y values. */
function makeCSV(rowCount, seriesCount) {
    const seriesNames = Array.from({ length: seriesCount }, (_, i) => `Series ${i + 1}`);
    const lines = [`x,${seriesNames.join(",")}`];
    for (let row = 0; row < rowCount; row++) {
        const values = [];
        for (let i = 0; i < seriesCount; i++) {
            values.push((Math.random() * 1000).toFixed(3));
        }
        lines.push(`${row},${values.join(",")}`);
    }
    return lines.join("\n");
}

/** Wait for the next frame. Resolves with the time that frame started. */
function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Wait until the chart stops drawing. Returns the time of its last drawing
 * call, and the start of the next frame (which is when the finished chart
 * goes to the screen).
 */
async function waitForChartToFinish(drawingStartedAfter) {
    const frameTimes = [];
    for (;;) {
        frameTimes.push(await nextFrame());
        const now = performance.now();
        const lastDraw = lastDrawCallTime;
        if (lastDraw > drawingStartedAfter && now - lastDraw >= QUIET_MS) {
            const shownAt = frameTimes.find((time) => time > lastDraw) ?? frameTimes.at(-1);
            return { lastDraw, shownAt };
        }
        if (now - drawingStartedAfter > GIVE_UP_MS) {
            throw new Error("The chart didn't finish drawing within 30 seconds.");
        }
    }
}

function median(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function colorsFor(series) {
    return series.map((_, i) => COLORS[i % COLORS.length]);
}

/**
 * Time one load the way the demo page does it: read the file, parse it, and
 * let the chart draw.
 *
 * The times are split so waiting doesn't get counted as work:
 * -> draw: from when the chart starts drawing until its last drawing call
 *   including any drawing done in the background
 * -> paint: everything after that until the finished chart is on its way to
 *   the screen, including waiting for the screen to refresh
 *
 * We never read pixels back from the canvas. That makes Chrome switch the
 * canvas to slower software drawing and skews every later run.
 */
async function timeOneLoad(file, chartType, expectedPoints) {
    // Start every run from an empty chart.
    testChart.setOptions({ showLine: chartType === "line" });
    testChart.setSeries([], []);
    await nextFrame();

    const start = performance.now();
    const text = await file.text();
    const afterRead = performance.now();
    const series = parseCSV(text);
    const afterParse = performance.now();

    // setSeries asks for a draw on the next frame. The chart starts drawing
    // at the start of that frame right before our own callback.
    testChart.setSeries(series, colorsFor(series));
    const frameStart = await nextFrame();
    const { lastDraw, shownAt } = await waitForChartToFinish(afterParse);

    const points = series.reduce((total, s) => total + s.points.length, 0);
    if (points !== expectedPoints) {
        throw new Error(`Expected ${expectedPoints} points but the parser returned ${points}.`);
    }

    const readMs = afterRead - start;
    const parseMs = afterParse - afterRead;
    const drawMs = lastDraw - Math.max(frameStart, afterParse);
    const totalMs = shownAt - start;
    return { readMs, parseMs, drawMs, paintMs: totalMs - readMs - parseMs - drawMs, totalMs };
}

function addTableRow(result) {
    const cells = [
        result.rows.toLocaleString(),
        result.seriesCount,
        result.points.toLocaleString(),
        result.fileMB.toFixed(2),
        result.chartType,
        result.readMs.toFixed(1),
        result.parseMs.toFixed(1),
        result.drawMs.toFixed(1),
        result.paintMs.toFixed(1),
        result.totalMs.toFixed(1),
    ];
    const row = document.createElement("tr");
    for (const text of cells) {
        const cell = document.createElement("td");
        cell.textContent = text;
        row.append(cell);
    }
    if (result.totalMs > TARGET_MS) {
        row.lastChild.classList.add("over-target");
    }
    resultsTableBody.append(row);
}

/**
 * Total time against rows one line per chart type and series count +
 * the 1 second goal.
 */
function drawResultsChart() {
    if (!results.length) {
        return;
    }

    const series = [];
    const colors = [];
    const chartTypes = [...new Set(results.map((result) => result.chartType))];
    const seriesCounts = [...new Set(results.map((result) => result.seriesCount))];
    for (const chartType of chartTypes) {
        for (const seriesCount of seriesCounts) {
            const matching = results.filter((result) => result.chartType === chartType
                && result.seriesCount === seriesCount);
            if (!matching.length) {
                continue;
            }
            const xs = matching.map((result) => result.rows);
            const ys = matching.map((result) => result.totalMs);
            const typeName = chartType === "scatter" ? "Scatter" : "Line";
            const name = `${typeName}, ${seriesCount} series`;
            series.push(new Series(name, PointSet.fromArrays(xs, ys)));
            colors.push(COLORS[(series.length - 1) % COLORS.length]);
        }
    }

    const largestRows = Math.max(...results.map((result) => result.rows));
    const target = PointSet.fromArrays([0, largestRows], [TARGET_MS, TARGET_MS]);
    series.push(new Series("1 second goal", target));
    colors.push(TARGET_COLOR);

    resultsChart.setSeries(series, colors);
}

/** The label typed on the page. */
function runLabel() {
    return labelInput.value.trim().replace(/[^\w-]+/g, "-") || "unlabeled";
}

function downloadResults() {
    const label = runLabel();
    const setupColumns = [
        browserName(),
        navigator.hardwareConcurrency,
        testChart.options.width,
        testChart.options.height,
        window.devicePixelRatio,
    ];
    const lines = [[
        "label", "rows", "series_count", "points", "file_mb", "chart_type", "runs",
        "read_ms", "parse_ms", "draw_ms", "paint_ms", "total_ms",
        "browser", "cpu_cores", "chart_width", "chart_height", "pixel_ratio",
    ].join(",")];
    for (const result of results) {
        lines.push([
            label, result.rows, result.seriesCount, result.points, result.fileMB.toFixed(3),
            result.chartType, result.runs,
            result.readMs.toFixed(2), result.parseMs.toFixed(2),
            result.drawMs.toFixed(2), result.paintMs.toFixed(2), result.totalMs.toFixed(2),
            ...setupColumns,
        ].join(","));
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }));
    link.download = `benchmark-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    // Give the download a moment to start before freeing the file.
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Turn "1, 2" into [1, 2]. Returns null if any entry isn't a whole number of at least 1. */
function parseSeriesCounts(text) {
    const counts = text.split(",").map((part) => Number(part.trim()));
    const allValid = counts.every((count) => Number.isInteger(count) && count >= 1);
    return allValid ? [...new Set(counts)] : null;
}

function readSettings() {
    const inputs = [maxRowsInput, stepInput, runsInput];
    const invalidInput = inputs.find((input) => !input.checkValidity() || input.value === "");
    if (invalidInput) {
        invalidInput.reportValidity();
        return null;
    }

    const seriesCounts = parseSeriesCounts(seriesCountsInput.value);
    if (!seriesCounts) {
        seriesCountsInput.setCustomValidity("Enter whole numbers separated by commas, like 1, 2");
        seriesCountsInput.reportValidity();
        return null;
    }
    seriesCountsInput.setCustomValidity("");

    return {
        maxRows: maxRowsInput.valueAsNumber,
        step: stepInput.valueAsNumber,
        seriesCounts,
        runCount: runsInput.valueAsNumber,
        chartTypes: chartTypeSelect.value === "both"
            ? ["scatter", "line"]
            : [chartTypeSelect.value],
    };
}

function setRunning(running) {
    isRunning = running;
    startButton.disabled = running;
    stopButton.disabled = !running;
    downloadButton.disabled = running || !results.length;
    for (const control of [maxRowsInput, stepInput, seriesCountsInput, runsInput,
        chartTypeSelect, labelInput]) {
        control.disabled = running;
    }
}

async function runBenchmark() {
    const settings = readSettings();
    if (!settings) {
        return;
    }
    const { maxRows, step, seriesCounts, runCount, chartTypes } = settings;

    results = [];
    resultsTableBody.replaceChildren();
    resultsSection.hidden = true;
    stopRequested = false;
    tabWasHidden = false;
    setRunning(true);

    try {
        // The first loads are slower while the browser warms up so you do a
        // couple that don't count.
        statusText.textContent = "Warming up…";
        const warmUpFile = new Blob([makeCSV(WARM_UP_ROWS, seriesCounts[0])]);
        for (const chartType of chartTypes) {
            await timeOneLoad(warmUpFile, chartType, WARM_UP_ROWS * seriesCounts[0]);
        }

        for (let rows = 0; rows <= maxRows && !stopRequested; rows += step) {
            for (const seriesCount of seriesCounts) {
                if (stopRequested) {
                    break;
                }
                // Build each file once and reuse it for every run and chart type.
                const file = new Blob([makeCSV(rows, seriesCount)], { type: "text/csv" });
                const points = rows * seriesCount;

                for (const chartType of chartTypes) {
                    const runs = [];
                    for (let run = 1; run <= runCount && !stopRequested; run++) {
                        statusText.textContent = `${rows.toLocaleString()} rows, `
                            + `${seriesCount} series, ${chartType}, run ${run} of ${runCount}`;
                        runs.push(await timeOneLoad(file, chartType, points));
                    }
                    if (runs.length < runCount) {
                        break;
                    }

                    const result = {
                        rows,
                        seriesCount,
                        points,
                        fileMB: file.size / 1e6,
                        chartType,
                        runs: runCount,
                        readMs: median(runs.map((run) => run.readMs)),
                        parseMs: median(runs.map((run) => run.parseMs)),
                        drawMs: median(runs.map((run) => run.drawMs)),
                        paintMs: median(runs.map((run) => run.paintMs)),
                        totalMs: median(runs.map((run) => run.totalMs)),
                    };
                    results.push(result);
                    addTableRow(result);
                    resultsSection.hidden = false;
                }
            }
        }

        statusText.textContent = stopRequested
            ? `Stopped after ${results.length} results.`
            : `Done: ${results.length} results.`;
        if (tabWasHidden) {
            statusText.textContent += " The tab was hidden during the run, so some "
                + "timings may be too high. Run it again with the tab in front.";
        }
    } catch (error) {
        statusText.textContent = `The benchmark stopped with an error: ${error.message}`;
    } finally {
        // Only now, so redrawing this chart never adds to a measured draw.
        drawResultsChart();
        setRunning(false);
    }
}

// Browsers pause animation frames in background tabs.
document.addEventListener("visibilitychange", () => {
    if (document.hidden && isRunning) {
        tabWasHidden = true;
    }
});

seriesCountsInput.addEventListener("input", () => seriesCountsInput.setCustomValidity(""));
startButton.addEventListener("click", runBenchmark);
stopButton.addEventListener("click", () => {
    stopRequested = true;
    statusText.textContent = "Stopping after this run…";
});
downloadButton.addEventListener("click", downloadResults);

setupText.textContent = `Setup: ${describeSetup()}`;
