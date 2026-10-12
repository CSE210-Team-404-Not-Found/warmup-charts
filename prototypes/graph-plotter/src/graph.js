import { AXIS_RANGES, TICK_VALUES } from './config.js';
import { mapPoint } from './coordinates.js';
import { validateChart } from './validation.js';

/** @typedef {{x: number, y: number}} Point */
/** @typedef {{name: string, points: Point[]}} Series */
/** @typedef {{type: 'scatter'|'line', xLabel: string, yLabel: string, series: Series[]}} ChartOptions */

function legendLayout(context, series, width) {
  const entries = [];
  let x = 24;
  let y = 24;
  const maxTextWidth = width - 76;
  for (const item of series) {
    const textWidth = Math.min(context.measureText(item.name).width, maxTextWidth);
    const entryWidth = textWidth + 44;
    if (x > 24 && x + entryWidth > width - 24) {
      x = 24;
      y += 24;
    }
    entries.push({ ...item, x, y, textWidth });
    x += entryWidth;
  }
  return { entries, height: series.length ? y + 12 : 12 };
}

function drawAxes(context, plotArea, model) {
  const bottom = plotArea.top + plotArea.height;
  const right = plotArea.left + plotArea.width;
  context.font = '13px sans-serif';
  context.lineWidth = 1;
  context.strokeStyle = '#666';
  context.fillStyle = '#222';
  context.beginPath();
  context.moveTo(plotArea.left, plotArea.top);
  context.lineTo(plotArea.left, bottom);
  context.lineTo(right, bottom);
  context.stroke();

  for (const tick of TICK_VALUES) {
    const xPixel = mapPoint({ x: tick, y: 0 }, plotArea).x;
    const yPixel = mapPoint({ x: 0, y: tick }, plotArea).y;
    context.beginPath();
    context.moveTo(xPixel, bottom);
    context.lineTo(xPixel, bottom + 5);
    context.moveTo(plotArea.left - 5, yPixel);
    context.lineTo(plotArea.left, yPixel);
    context.stroke();
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(String(tick), xPixel, bottom + 10);
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.fillText(String(tick), plotArea.left - 10, yPixel);
  }

  context.font = '14px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(model.xLabel, plotArea.left + plotArea.width / 2, bottom + 46, plotArea.width);
  context.save();
  context.translate(18, plotArea.top + plotArea.height / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(model.yLabel, 0, 0, plotArea.height);
  context.restore();
}

function drawSeries(context, model, plotArea) {
  for (const series of model.series) {
    const pixels = series.points.map(point => mapPoint(point, plotArea));
    context.strokeStyle = series.color;
    context.fillStyle = series.color;
    context.lineWidth = 2;
    if (model.type === 'line' && pixels.length > 1) {
      context.beginPath();
      context.moveTo(pixels[0].x, pixels[0].y);
      for (const point of pixels.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();
    }
    for (const point of pixels) {
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
}

/**
 * Draw a scatter plot or line chart using the canvas's CSS dimensions.
 * Input data is unchanged; the bitmap scales with devicePixelRatio.
 * @param {HTMLCanvasElement} canvas
 * @param {ChartOptions} options
 * @returns {{type: string, pointCount: number, series: {name: string, color: string, pointCount: number}[], width: number, height: number, plotArea: {left: number, top: number, width: number, height: number}}}
 * @throws {Error} Invalid input or canvas size; the current drawing is preserved.
 */
export function drawChart(canvas, options) {
  const model = validateChart(options);
  if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas drawing target is required.');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser does not provide a Canvas 2D drawing context.');
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 240 || height < 240) {
    throw new Error('The canvas must be at least 240 × 240 CSS pixels.');
  }
  // Check legend fit before resizing the canvas, which clears its bitmap.
  context.save();
  context.font = '13px sans-serif';
  const legend = legendLayout(context, model.series, width);
  context.restore();
  const plotArea = { left: 64, top: legend.height + 20, width: width - 88, height: height - legend.height - 84 };
  if (plotArea.height < 80) throw new Error('The canvas is too short to fit this legend. Increase its CSS height.');

  const pixelRatio = canvas.ownerDocument?.defaultView?.devicePixelRatio || 1;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  // Keep an attribute-sized canvas from growing on each high-DPI redraw.
  if (canvas.style && canvas.clientWidth && canvas.clientWidth !== width) canvas.style.width = `${width}px`;
  if (canvas.style && canvas.clientHeight && canvas.clientHeight !== height) canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  drawAxes(context, plotArea, model);
  drawSeries(context, model, plotArea);

  context.font = '13px sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  for (const entry of legend.entries) {
    context.fillStyle = entry.color;
    context.fillRect(entry.x, entry.y - 5, 10, 10);
    context.fillStyle = '#222';
    context.fillText(entry.name, entry.x + 18, entry.y, entry.textWidth || 1);
  }
  if (model.pointCount === 0) {
    context.textAlign = 'center';
    context.fillText('No data', plotArea.left + plotArea.width / 2, plotArea.top + plotArea.height / 2);
  }
  return {
    type: model.type, pointCount: model.pointCount, width, height, plotArea,
    series: model.series.map(series => ({ name: series.name, color: series.color, pointCount: series.points.length })),
  };
}

export { AXIS_RANGES };
