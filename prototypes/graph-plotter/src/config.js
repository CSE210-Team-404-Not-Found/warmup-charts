export const AXIS_RANGES = Object.freeze({
  x: Object.freeze({ min: 0, max: 5 }),
  y: Object.freeze({ min: 0, max: 5 }),
});

export const TICK_VALUES = Object.freeze([0, 1, 2, 3, 4, 5]);

const SERIES_COLORS = ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#8c564b', '#6a51a3'];

export function colorForSeries(index) {
  return SERIES_COLORS[index] ?? `hsl(${(index * 137.508).toFixed(3)} 65% 35%)`;
}
