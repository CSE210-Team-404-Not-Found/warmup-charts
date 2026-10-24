import { drawChart } from '../src/graph.js';
import { parseCsv } from '../src/csv.js';
import { DATASETS } from './datasets.js';

const canvas = document.querySelector('#chart');
const datasetControl = document.querySelector('#dataset');
const typeControl = document.querySelector('#chart-type');
const errorMessage = document.querySelector('#error');
const caption = document.querySelector('#chart-caption');
let current = null;
let resizePending = false;
let loadVersion = 0;
const csvFile = document.querySelector('#csv-file');
const csvButton = document.querySelector('#load-csv');

function showMeasurements(dataset, result) {
  const body = document.querySelector('#measurements');
  body.replaceChildren();
  document.querySelector('#table-caption').textContent = `${dataset.title} — original input order`;
  document.querySelector('#x-column').textContent = dataset.xLabel;
  document.querySelector('#y-column').textContent = dataset.yLabel;
  for (const [index, series] of dataset.series.entries()) {
    for (const point of series.points) {
      const row = document.createElement('tr');
      const name = document.createElement('th');
      name.scope = 'row';
      const marker = document.createElement('span');
      marker.className = 'series-marker';
      marker.style.backgroundColor = result.series[index].color;
      marker.setAttribute('aria-hidden', 'true');
      name.append(marker, document.createTextNode(series.name));
      const x = document.createElement('td');
      const y = document.createElement('td');
      x.textContent = String(point.x);
      y.textContent = String(point.y);
      row.append(name, x, y);
      body.append(row);
    }
  }
  if (result.pointCount === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'No data';
    row.append(cell);
    body.append(row);
  }
}

function showError(error) {
  errorMessage.textContent = `${error.message}${current ? ` Still showing ${current.dataset.title} as a ${current.options.type === 'line' ? 'line chart' : 'scatter plot'}.` : ''}`;
  errorMessage.hidden = false;
}

function renderDataset(dataset) {
  const type = typeControl.value;
  try {
    const options = { type, xLabel: dataset.xLabel, yLabel: dataset.yLabel, series: dataset.series };
    const result = drawChart(canvas, options);
    current = { options, dataset };
    errorMessage.hidden = true;
    errorMessage.textContent = '';
    document.querySelector('#chart-title').textContent = dataset.title;
    document.querySelector('#dataset-description').textContent = dataset.description;
    const chartName = type === 'scatter' ? 'Scatter plot' : 'Line chart';
    const summary = result.pointCount ? `${result.series.length} series · ${result.pointCount} ${result.pointCount === 1 ? 'point' : 'points'}` : 'No data';
    caption.textContent = `${chartName} · ${summary}`;
    canvas.setAttribute('aria-label', `${dataset.title}. ${chartName}. ${summary}. See the measurements table for values.`);
    showMeasurements(dataset, result);
    return true;
  } catch (error) {
    showError(error);
    return false;
  }
}

document.querySelector('#chart-controls').addEventListener('submit', event => event.preventDefault());
function cancelPendingLoad() {
  loadVersion++;
  csvButton.textContent = 'Load CSV';
}
datasetControl.addEventListener('change', () => {
  cancelPendingLoad();
  renderDataset(DATASETS[datasetControl.value]);
});
typeControl.addEventListener('change', () => {
  if (current) renderDataset(current.dataset);
});
csvFile.addEventListener('change', cancelPendingLoad);

document.querySelector('#csv-controls').addEventListener('submit', async event => {
  event.preventDefault();
  const version = ++loadVersion;
  const file = csvFile.files[0];
  if (!file) {
    showError(new Error('Select a CSV file before loading.'));
    return;
  }
  const xLabel = document.querySelector('#csv-x-label').value.trim();
  const yLabel = document.querySelector('#csv-y-label').value.trim();
  csvButton.textContent = 'Loading CSV…';
  try {
    let text;
    try {
      text = await file.text();
    } catch {
      throw new Error(`Could not read CSV file "${file.name}". Select it again and retry.`);
    }
    if (version !== loadVersion) return;
    const series = parseCsv(text, { defaultSeriesName: file.name });
    const rendered = renderDataset({
      title: file.name,
      description: 'Loaded from a local CSV. Values and row order within each series are preserved.',
      xLabel, yLabel, series,
    });
    if (rendered) {
      const loadedOption = document.querySelector('#loaded-csv-option');
      loadedOption.hidden = false;
      loadedOption.textContent = `Loaded CSV: ${file.name}`;
      datasetControl.value = 'loaded-csv';
    }
  } catch (error) {
    if (version === loadVersion) showError(error);
  } finally {
    if (version === loadVersion) csvButton.textContent = 'Load CSV';
  }
});

// Resize from the last successful chart, even after a failed load.
function redrawAfterResize() {
  if (resizePending || !current) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    try {
      drawChart(canvas, current.options);
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    }
  });
}

new ResizeObserver(redrawAfterResize).observe(canvas);
window.addEventListener('resize', redrawAfterResize);
renderDataset(DATASETS[datasetControl.value]);
