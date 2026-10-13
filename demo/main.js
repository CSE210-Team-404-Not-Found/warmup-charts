/**
 * The demo page's script.
 *
 * Owned by the frontend team.
 *
 * Displays one chart with random data, a sample from data/, or a chosen CSV file.
 */

import { Chart, parseCSV, randomData } from "../src/index.js";

const datasets = document.getElementById("test-sets");
const input = document.getElementById("csv-input");
const chartType = document.getElementById("chart-type");
const xLabel = document.getElementById("x-axis");
const yLabel = document.getElementById("y-axis");
const chartWidth = document.getElementById("chart-width");
const chartHeight = document.getElementById("chart-height");
const datasetName = document.getElementById("dataset-name");
const message = document.getElementById("message");

const chart = new Chart(document.getElementById("chart"), {
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
            onWarning: ({ skippedRows, skippedCells }) => {
                warning = `Loaded ${name}, skipping ${skippedRows} invalid rows `
                    + `and ${skippedCells} invalid cells.`;
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

chartType.addEventListener("change", () => {
    chart.setOptions({ showLine: chartType.value === "line" });
});

for (const control of [xLabel, yLabel]) {
    control.addEventListener("input", () => {
        chart.setOptions({ xLabel: xLabel.value, yLabel: yLabel.value });
    });
}

const toggles = {
    showAxes: document.getElementById("show-axes"),
    showAxisLabels: document.getElementById("show-axis-labels"),
    showLegend: document.getElementById("show-legend"),
};
for (const [option, checkbox] of Object.entries(toggles)) {
    checkbox.addEventListener("change", () => {
        chart.setOptions({ [option]: checkbox.checked });
    });
}

for (const control of [chartWidth, chartHeight]) {
    control.addEventListener("change", () => {
        if (chartWidth.checkValidity() && chartHeight.checkValidity()) {
            chart.setOptions({
                width: chartWidth.valueAsNumber,
                height: chartHeight.valueAsNumber,
            });
        }
    });
}
