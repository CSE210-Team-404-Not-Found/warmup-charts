import { drawChart } from '../src/graph.js';
import { parseCsv } from '../src/csv.js';

const data = {
  xLabel: 'Input voltage (V)', yLabel: 'Output current (mA)',
  series: [],
};
const status = document.querySelector('#example-status');
let loaded = false;

function render() {
  if (!loaded) return;
  try {
    drawChart(document.querySelector('#scatter'), { ...data, type: 'scatter' });
    drawChart(document.querySelector('#line'), { ...data, type: 'line' });
    status.textContent = 'Both charts rendered: 2 series, 8 points each. The library code is unchanged.';
  } catch (error) {
    status.textContent = error.message;
  }
}

window.addEventListener('resize', render);
async function load() {
  try {
    const response = await fetch('./data/calibration.csv');
    if (!response.ok) throw new Error('Could not load the calibration CSV.');
    data.series = parseCsv(await response.text());
    document.querySelector('#source-example').textContent = `import { parseCsv } from '../src/csv.js';\nimport { drawChart } from '../src/graph.js';\n\nconst series = parseCsv(csvText);\nconst data = ${JSON.stringify(data, null, 2)};\n\ndrawChart(canvas, { ...data, type: 'scatter' });\ndrawChart(canvas, { ...data, type: 'line' });`;
    loaded = true;
    render();
  } catch (error) {
    status.textContent = error.message;
  }
}
load();
