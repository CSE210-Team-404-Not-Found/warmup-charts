/**
 * The demo page's script.
 *
 * Owned by the frontend team.
 *
 * Displays one chart with random data, a sample from data/, or a chosen CSV file.
 */

import { Chart, VERSION, parseCSV, randomData } from "../src/index.js";

document.getElementById("version").textContent = `v${VERSION}`;

const datasets = document.getElementById("test-sets");
const input = document.getElementById("csv-input");
const chartType = document.getElementById("chart-type");
const xLabel = document.getElementById("x-axis");
const yLabel = document.getElementById("y-axis");
const chartWidth = document.getElementById("chart-width");
const chartHeight = document.getElementById("chart-height");
const datasetName = document.getElementById("dataset-name");
const message = document.getElementById("message");
const canvas = document.getElementById("chart");
const tooltip = document.getElementById("tooltip");

// The Chart wraps the canvas element and does the drawing and hit-testing.
const chart = new Chart(canvas, {
    width: chartWidth.valueAsNumber,
    height: chartHeight.valueAsNumber,
    showLine: chartType.value === "line",
    xLabel: xLabel.value,
    yLabel: yLabel.value,
});

// From the prototype; the first four are Okabe-Ito (colorblind-safe).
const COLORS = ["#0072b2", "#d55e00", "#009e73", "#cc79a7", "#8c564b", "#6a51a3"];

/** Pick a color for each series. */
function colorsFor(series) {
    return series.map((_, i) => COLORS[i] ?? `hsl(${(i * 137.508) % 360} 65% 35%)`);
}

function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
}

// Load counter, to drop stale loads.
let loads = 0;

/** Parse and show a CSV. Keeps the previous chart on error. */
async function load(name, readText) {
    const id = ++loads;
    try {
        const text = await readText();
        if (id !== loads) {
            return;
        }

        let warning = "";
        const series = parseCSV(text, {
            onWarning: ({ skippedRows, skippedCells, roundedPoints }) => {
                warning = `Loaded ${name}, skipping ${skippedRows} invalid rows and `
                    + `${skippedCells} invalid cells, and rounding ${roundedPoints} `
                    + "points too large to store exactly.";
            },
        });
        chart.setSeries(series, colorsFor(series));
        datasetName.textContent = name;
        showMessage(warning);
    } catch (error) {
        if (id === loads) {
            showMessage(`Could not load ${name}: ${error.message}`);
        }
    }
}

function showDataset() {
    const option = datasets.selectedOptions[0];
    // Lets the same file be chosen again.
    input.value = "";

    if (datasets.value === "random") {
        loads++;
        const series = randomData({ seriesCount: 2 });
        chart.setSeries(series, colorsFor(series));
        datasetName.textContent = option.text;
        showMessage("");
        return;
    }

    load(option.text, async () => {
        const response = await fetch(`data/${datasets.value}.csv`);
        if (!response.ok) {
            throw new Error(`the server returned ${response.status}.`);
        }
        return response.text();
    });
}

showDataset();
datasets.addEventListener("change", showDataset);

input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        load(file.name, () => file.text());
    }
});

const toggles = {
    showAxes: document.getElementById("show-axes"),
    showAxisLabels: document.getElementById("show-axis-labels"),
    showLegend: document.getElementById("show-legend"),
};
const chartStatus = document.getElementById("chart-status");
document.getElementById("chart-options").addEventListener("input", () => {
    chartStatus.textContent = "";
});

document.getElementById("apply-changes").addEventListener("click", () => {
    if (!chartWidth.reportValidity() || !chartHeight.reportValidity()) {
        return;
    }
    chart.setOptions({
        showLine: chartType.value === "line",
        xLabel: xLabel.value,
        yLabel: yLabel.value,
        width: chartWidth.valueAsNumber,
        height: chartHeight.valueAsNumber,
        showAxes: toggles.showAxes.checked,
        showAxisLabels: toggles.showAxisLabels.checked,
        showLegend: toggles.showLegend.checked,
    });
    // setOptions schedules the chart's draw before this callback.
    requestAnimationFrame(() => {
        chartStatus.textContent = "Plot changes applied successfully.";
    });
});

// Save the chart as it is currently drawn.
document.getElementById("download-png").addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = chart.canvas.toDataURL("image/png");
    link.download = `${datasetName.textContent.replace(/\.csv$/i, "") || "chart"}.png`;
    link.click();
});

// Show the nearest point's series and value while hovering the chart.
canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Hit-test on the Chart, which knows the data-to-pixel transform; the canvas does not.
    const hit = chart.findNearestPoint(x, y, 7);
    if (!hit) {
        tooltip.hidden = true;
        return;
    }

    tooltip.hidden = false;
    tooltip.textContent = `${hit.series.name}: (${hit.x}, ${hit.y})`;
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
});

canvas.addEventListener("pointerleave", () => {
    tooltip.hidden = true;
});
