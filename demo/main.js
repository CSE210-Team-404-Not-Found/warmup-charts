/**
 * The demo page's script.
 *
 * Owned by the frontend team.
 * 
 * Currently displays one chart with random data until a CSV file is chosen.
 * For the frontend team to discuss and expand upon.
 */

import { Chart, parseCSV, randomData } from "../src/index.js";

const chart = new Chart(document.getElementById("chart"));
const input = document.getElementById("csv-input");

/**
 * Pick a color for each series.
 * TODO(frontend): decide how the demo assigns colors.
 */
function colorsFor(series) {
    return series.map(() => "#000");
}

function show(series) {
    chart.setSeries(series, colorsFor(series));
}

// Show random data until a file is chosen.
show(randomData());

input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    show(parseCSV(await file.text()));
});
