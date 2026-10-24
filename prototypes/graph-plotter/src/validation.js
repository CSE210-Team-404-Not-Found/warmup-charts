import { AXIS_RANGES, colorForSeries } from './config.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Validate and copy input so failed loads leave the previous chart intact. */
export function validateChart(options) {
  if (!isObject(options)) throw new Error('Chart options must be an object.');
  if (options.type !== 'scatter' && options.type !== 'line') {
    throw new Error('Chart type must be "scatter" or "line".');
  }
  for (const label of ['xLabel', 'yLabel']) {
    if (typeof options[label] !== 'string' || !options[label].trim()) {
      throw new Error(`${label} must be a nonempty string.`);
    }
  }
  if (!Array.isArray(options.series)) throw new Error('series must be an array.');

  const names = new Set();
  const series = [];
  let pointCount = 0;
  for (const [seriesIndex, input] of options.series.entries()) {
    const location = `Series ${seriesIndex + 1}`;
    if (!isObject(input) || typeof input.name !== 'string' || !input.name.trim()) {
      throw new Error(`${location} needs a nonempty name.`);
    }
    const name = input.name.trim();
    if (names.has(name)) throw new Error(`Series name "${name}" is duplicated.`);
    names.add(name);
    if (!Array.isArray(input.points)) throw new Error(`${location} points must be an array.`);
    const points = [];
    for (const [pointIndex, point] of input.points.entries()) {
      const pointLocation = `${location}, point ${pointIndex + 1}`;
      if (!isObject(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        throw new Error(`${pointLocation} needs finite numeric x and y coordinates.`);
      }
      if (point.x < AXIS_RANGES.x.min || point.x > AXIS_RANGES.x.max ||
          point.y < AXIS_RANGES.y.min || point.y > AXIS_RANGES.y.max) {
        throw new Error(`${pointLocation} is outside the supported ranges: x ${AXIS_RANGES.x.min}–${AXIS_RANGES.x.max}, y ${AXIS_RANGES.y.min}–${AXIS_RANGES.y.max}.`);
      }
      points.push({ x: point.x, y: point.y });
    }
    pointCount += points.length;
    series.push({ name, points, color: colorForSeries(seriesIndex) });
  }
  return { type: options.type, xLabel: options.xLabel, yLabel: options.yLabel, series, pointCount };
}
