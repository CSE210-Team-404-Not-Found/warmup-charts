import { AXIS_RANGES } from './config.js';

/** Map numeric coordinates to CSS pixels; Canvas y increases downwards. */
export function mapPoint(point, plotArea) {
  const xFraction = (point.x - AXIS_RANGES.x.min) / (AXIS_RANGES.x.max - AXIS_RANGES.x.min);
  const yFraction = (point.y - AXIS_RANGES.y.min) / (AXIS_RANGES.y.max - AXIS_RANGES.y.min);
  return {
    x: plotArea.left + xFraction * plotArea.width,
    y: plotArea.top + (1 - yFraction) * plotArea.height,
  };
}
