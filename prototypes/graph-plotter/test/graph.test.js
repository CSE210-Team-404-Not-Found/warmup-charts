import test from 'node:test';
import assert from 'node:assert/strict';
import { drawChart, AXIS_RANGES } from '../src/graph.js';
import { mapPoint } from '../src/coordinates.js';
import { DATASETS } from '../demo/datasets.js';
import { parseCsv } from '../src/csv.js';

function recordingCanvas({ width = 960, height = 500, pixelRatio = 1 } = {}) {
  const operations = [];
  let path = [];
  const context = {
    save() {}, restore() {}, translate() {}, rotate() {},
    measureText(text) { return { width: text.length * 7 }; },
    setTransform(...args) { operations.push({ kind: 'transform', args }); },
    clearRect(...args) { operations.push({ kind: 'clear', args }); },
    fillRect(...args) { operations.push({ kind: 'rectangle', color: this.fillStyle, args }); },
    fillText(text, ...args) { operations.push({ kind: 'text', text, args }); },
    beginPath() { path = []; },
    moveTo(x, y) { path.push(['move', x, y]); },
    lineTo(x, y) { path.push(['line', x, y]); },
    arc(x, y, radius) { path.push(['point', x, y, radius]); },
    stroke() { operations.push({ kind: 'stroke', color: this.strokeStyle, path: [...path] }); },
    fill() { operations.push({ kind: 'fill', color: this.fillStyle, path: [...path] }); },
  };
  const canvas = { width, height, clientWidth: width, clientHeight: height, ownerDocument: { defaultView: { devicePixelRatio: pixelRatio } }, getContext() { return context; } };
  return { canvas, operations };
}

function options(type = 'scatter') {
  return {
    type, xLabel: 'Time (s)', yLabel: 'Distance (m)',
    series: [
      { name: 'A', points: [{ x: 0, y: 0 }, { x: 2.5, y: 2.5 }, { x: 5, y: 5 }] },
      { name: 'B', points: [{ x: 0, y: 5 }, { x: 5, y: 0 }] },
    ],
  };
}

function freezeDeep(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freezeDeep(child);
  }
  return value;
}

test('range endpoints and midpoint map correctly, including inverted Canvas y', () => {
  const area = { left: 20, top: 30, width: 400, height: 200 };
  assert.deepEqual(mapPoint({ x: 0, y: 0 }, area), { x: 20, y: 230 });
  assert.deepEqual(mapPoint({ x: 5, y: 5 }, area), { x: 420, y: 30 });
  assert.deepEqual(mapPoint({ x: 2.5, y: 2.5 }, area), { x: 220, y: 130 });
});

test('scatter draws every known point and no series line', () => {
  const { canvas, operations } = recordingCanvas();
  const result = drawChart(canvas, options());
  const points = operations.filter(op => op.kind === 'fill');
  assert.equal(result.pointCount, 5);
  assert.equal(points.length, 5);
  assert.deepEqual(points[0].path[0], ['point', result.plotArea.left, result.plotArea.top + result.plotArea.height, 4]);
  assert.deepEqual(points[2].path[0], ['point', result.plotArea.left + result.plotArea.width, result.plotArea.top, 4]);
  assert.equal(operations.filter(op => op.kind === 'stroke' && result.series.some(series => series.color === op.color)).length, 0);
});

test('line paths preserve supplied order and stay within their own series', () => {
  const { canvas, operations } = recordingCanvas();
  const input = options('line');
  input.series[0].points = [{ x: 4, y: 4 }, { x: 1, y: 1 }, { x: 3, y: 2 }];
  const result = drawChart(canvas, input);
  const paths = operations.filter(op => op.kind === 'stroke' && result.series.some(series => series.color === op.color));
  assert.equal(paths.length, 2);
  const area = result.plotArea;
  assert.deepEqual(paths[0].path, [
    ['move', area.left + area.width * 0.8, area.top + area.height * (1 - 0.8)],
    ['line', area.left + area.width * 0.2, area.top + area.height * (1 - 0.2)],
    ['line', area.left + area.width * 0.6, area.top + area.height * (1 - 0.4)],
  ]);
  assert.deepEqual(paths[1].path, [
    ['move', area.left, area.top],
    ['line', area.left + area.width, area.top + area.height],
  ]);
});

test('redrawing clears the old bitmap before drawing new points and keeps colors stable', () => {
  const { canvas, operations } = recordingCanvas();
  const first = drawChart(canvas, options('line'));
  operations.length = 0;
  const second = drawChart(canvas, options('scatter'));
  assert.deepEqual(second.series, first.series);
  const clearIndex = operations.findIndex(op => op.kind === 'clear');
  const pointIndex = operations.findIndex(op => op.kind === 'fill');
  assert.ok(clearIndex >= 0 && clearIndex < pointIndex);
  assert.deepEqual(operations[clearIndex].args, [0, 0, 960, 500]);
  assert.equal(operations.filter(op => op.kind === 'stroke' && second.series.some(series => series.color === op.color)).length, 0);
});

test('legend names and marker colors correspond to the points', () => {
  const { canvas, operations } = recordingCanvas();
  const result = drawChart(canvas, options());
  assert.notEqual(result.series[0].color, result.series[1].color);
  for (const series of result.series) {
    assert.ok(operations.some(op => op.kind === 'text' && op.text === series.name));
    assert.ok(operations.some(op => op.kind === 'rectangle' && op.color === series.color));
    assert.ok(operations.some(op => op.kind === 'fill' && op.color === series.color));
  }
});

test('caller data remains unchanged, including frozen data and unsorted input', () => {
  const input = options();
  input.series[0].points.reverse();
  const snapshot = JSON.stringify(input);
  freezeDeep(input.series);
  const { canvas } = recordingCanvas();
  drawChart(canvas, input);
  drawChart(canvas, { ...input, type: 'line' });
  assert.equal(JSON.stringify(input), snapshot);
});

for (const series of [[], [{ name: 'Empty series', points: [] }]]) {
  test(`empty input (${series.length} series) keeps axes and says No data`, () => {
    const { canvas, operations } = recordingCanvas();
    const result = drawChart(canvas, { ...options(), series });
    assert.equal(result.pointCount, 0);
    assert.ok(operations.some(op => op.kind === 'text' && op.text === 'No data'));
    assert.ok(operations.some(op => op.kind === 'text' && op.text === 'Time (s)'));
    assert.ok(operations.some(op => op.kind === 'text' && op.text === 'Distance (m)'));
    assert.equal(operations.filter(op => op.kind === 'fill').length, 0);
  });
}

test('one point renders in both modes without a segment', () => {
  for (const type of ['scatter', 'line']) {
    const { canvas, operations } = recordingCanvas();
    const result = drawChart(canvas, { ...options(type), series: [{ name: 'Only', points: [{ x: 1, y: 1 }] }] });
    assert.equal(operations.filter(op => op.kind === 'fill').length, 1);
    assert.equal(operations.filter(op => op.kind === 'stroke' && op.color === result.series[0].color).length, 0);
  }
});

test('two points have one segment only in line mode', () => {
  for (const type of ['scatter', 'line']) {
    const { canvas, operations } = recordingCanvas();
    const result = drawChart(canvas, { ...options(type), series: options().series.slice(1) });
    const paths = operations.filter(op => op.kind === 'stroke' && op.color === result.series[0].color);
    assert.equal(operations.filter(op => op.kind === 'fill').length, 2);
    assert.equal(paths.length, type === 'line' ? 1 : 0);
    if (paths.length) assert.equal(paths[0].path.length, 2);
  }
});

const invalidCases = [
  ['missing options', () => undefined, /options/],
  ['unknown type', input => ({ ...input, type: 'bar' }), /type/],
  ['missing axis label', input => ({ ...input, xLabel: undefined }), /xLabel/],
  ['series is not an array', input => ({ ...input, series: {} }), /array/],
  ['empty name', input => ({ ...input, series: [{ name: '  ', points: [] }] }), /name/],
  ['duplicate trimmed names', input => ({ ...input, series: [{ name: 'A', points: [] }, { name: ' A ', points: [] }] }), /duplicated/],
  ['points is not an array', input => ({ ...input, series: [{ name: 'A', points: null }] }), /array/],
  ['missing y', input => ({ ...input, series: [{ name: 'A', points: [{ x: 1 }] }] }), /finite numeric/],
  ['numeric string', input => ({ ...input, series: [{ name: 'A', points: [{ x: '1', y: 1 }] }] }), /finite numeric/],
  ['NaN', input => ({ ...input, series: [{ name: 'A', points: [{ x: NaN, y: 1 }] }] }), /finite numeric/],
  ['Infinity', input => ({ ...input, series: [{ name: 'A', points: [{ x: 1, y: Infinity }] }] }), /finite numeric/],
  ['negative out-of-range', input => ({ ...input, series: [{ name: 'A', points: [{ x: -1, y: 1 }] }] }), /x 0–5, y 0–5/],
  ['large out-of-range', input => ({ ...input, series: [{ name: 'A', points: [{ x: 1, y: 6 }] }] }), /x 0–5, y 0–5/],
  ['late invalid point', input => ({ ...input, series: [...input.series, { name: 'C', points: [{ x: 1, y: 1 }, { x: 6, y: 1 }] }] }), /Series 3, point 2/],
  ['sparse points', input => ({ ...input, series: [{ name: 'A', points: Array(1) }] }), /finite numeric/],
];
for (const [name, makeInvalid, message] of invalidCases) {
  test(`invalid input: ${name} throws before any redraw`, () => {
    const { canvas, operations } = recordingCanvas();
    drawChart(canvas, options());
    const dimensions = [canvas.width, canvas.height];
    operations.length = 0;
    const input = makeInvalid(options());
    assert.throws(() => drawChart(canvas, input), message);
    assert.deepEqual(operations, []);
    assert.deepEqual([canvas.width, canvas.height], dimensions);
  });
}

test('the bitmap follows pixel density while coordinates remain CSS pixels', () => {
  const { canvas, operations } = recordingCanvas({ pixelRatio: 2 });
  const result = drawChart(canvas, options());
  assert.equal(canvas.width, 1920);
  assert.equal(canvas.height, 1000);
  assert.equal(result.width, 960);
  assert.deepEqual(operations[0], { kind: 'transform', args: [2, 0, 0, 2, 0, 0] });
});

test('a smaller supported canvas still positions endpoints inside its bounds', () => {
  const { canvas } = recordingCanvas({ width: 288, height: 320 });
  const result = drawChart(canvas, options());
  assert.ok(result.plotArea.width > 0 && result.plotArea.height > 0);
  assert.ok(result.plotArea.left + result.plotArea.width < 288);
  assert.ok(result.plotArea.top + result.plotArea.height < 320);
});

test('a bare visible canvas does not grow on repeated high-density renders', () => {
  const { canvas } = recordingCanvas({ pixelRatio: 2 });
  canvas.style = {};
  Object.defineProperties(canvas, {
    clientWidth: { get() { return Number.parseFloat(this.style.width) || this.width; } },
    clientHeight: { get() { return Number.parseFloat(this.style.height) || this.height; } },
  });
  drawChart(canvas, options());
  drawChart(canvas, options('line'));
  assert.equal(canvas.width, 1920);
  assert.equal(canvas.height, 1000);
  assert.equal(canvas.clientWidth, 960);
  assert.equal(canvas.clientHeight, 500);
});

test('canvas and size errors are readable and do not clear the drawing', () => {
  assert.throws(() => drawChart(null, options()), /canvas drawing target/);
  assert.throws(() => drawChart({ getContext: () => null }, options()), /2D drawing context/);
  const { canvas, operations } = recordingCanvas({ width: 100 });
  assert.throws(() => drawChart(canvas, options()), /240/);
  assert.deepEqual(operations, []);
});

test('long legend entries wrap without losing any series name', () => {
  const { canvas, operations } = recordingCanvas({ width: 320, height: 500 });
  const input = { ...options(), series: [
    { name: 'First deliberately long series name', points: [{ x: 1, y: 1 }] },
    { name: 'Second deliberately long series name', points: [{ x: 2, y: 2 }] },
    { name: 'Third deliberately long series name', points: [{ x: 3, y: 3 }] },
  ] };
  const result = drawChart(canvas, input);
  const labels = operations.filter(op => op.kind === 'text' && input.series.some(series => series.name === op.text));
  assert.equal(labels.length, 3);
  assert.ok(labels[1].args[1] > labels[0].args[1]);
  assert.ok(result.plotArea.top > labels[2].args[1]);
});

test('all valid built-in datasets render in both modes from frozen source data', () => {
  for (const [name, dataset] of Object.entries(DATASETS)) {
    if (name === 'invalid') continue;
    for (const type of ['scatter', 'line']) {
      const { canvas } = recordingCanvas();
      const result = drawChart(canvas, { type, xLabel: dataset.xLabel, yLabel: dataset.yLabel, series: dataset.series });
      assert.equal(result.pointCount, dataset.series.reduce((sum, series) => sum + series.points.length, 0));
    }
  }
  assert.ok(Object.isFrozen(AXIS_RANGES.x));
});

test('CSV measurements draw both chart types without changing values or per-series order', () => {
  const series = parseCsv('series,x,y\nA,5,5\nB,0,5\nA,0,0\nB,5,0');
  const snapshot = JSON.stringify(series);
  freezeDeep(series);
  const { canvas, operations } = recordingCanvas();
  const line = drawChart(canvas, { ...options('line'), series });
  const paths = operations.filter(op => op.kind === 'stroke' && op.color === line.series[0].color);
  assert.deepEqual(paths[0].path, [
    ['move', line.plotArea.left + line.plotArea.width, line.plotArea.top],
    ['line', line.plotArea.left, line.plotArea.top + line.plotArea.height],
  ]);
  operations.length = 0;
  const scatter = drawChart(canvas, { ...options('scatter'), series });
  assert.equal(scatter.pointCount, 4);
  assert.deepEqual(scatter.series, line.series);
  assert.equal(operations.filter(op => op.kind === 'fill').length, 4);
  assert.equal(JSON.stringify(series), snapshot);
});
