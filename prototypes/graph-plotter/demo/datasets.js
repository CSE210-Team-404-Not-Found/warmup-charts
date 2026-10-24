const datasets = {
  motion: {
    title: 'Motion comparison',
    description: 'Two synthetic trials track distance over five seconds. Trial A accelerates; Trial B moves at a constant rate.',
    xLabel: 'Time (s)', yLabel: 'Distance (m)',
    series: [
      { name: 'Trial A', points: [{ x: 0, y: 0 }, { x: 1, y: 0.4 }, { x: 2, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 3.5 }, { x: 5, y: 5 }] },
      { name: 'Trial B', points: [{ x: 0, y: 0 }, { x: 1, y: 0.7 }, { x: 2, y: 1.4 }, { x: 3, y: 2.1 }, { x: 4, y: 2.8 }, { x: 5, y: 3.5 }] },
    ],
  },
  cooling: {
    title: 'Cooling comparison',
    description: 'Synthetic temperature differences above ambient for two cooling samples. The points are observations; lines simply connect them.',
    xLabel: 'Time (min)', yLabel: 'Temperature difference (°C)',
    series: [
      { name: 'Sample A', points: [{ x: 0, y: 5 }, { x: 1, y: 3.7 }, { x: 2.5, y: 2.4 }, { x: 4, y: 1.2 }, { x: 5, y: 0.6 }] },
      { name: 'Sample B', points: [{ x: 0, y: 4.6 }, { x: 1, y: 4 }, { x: 2.5, y: 3.1 }, { x: 4, y: 2.4 }, { x: 5, y: 2 }] },
    ],
  },
  ranges: {
    title: 'Range endpoints', description: 'Synthetic points at each range endpoint and the midpoint. Both series meet at (2.5, 2.5).',
    xLabel: 'Input (units)', yLabel: 'Output (units)',
    series: [
      { name: 'Increasing', points: [{ x: 0, y: 0 }, { x: 2.5, y: 2.5 }, { x: 5, y: 5 }] },
      { name: 'Decreasing', points: [{ x: 0, y: 5 }, { x: 2.5, y: 2.5 }, { x: 5, y: 0 }] },
    ],
  },
  empty: {
    title: 'Empty dataset', description: 'There are no measurements. The axes remain visible.',
    xLabel: 'Time (s)', yLabel: 'Distance (m)', series: [],
  },
  single: {
    title: 'One measurement', description: 'One synthetic observation at (2.5, 2.5). A line chart shows the point without a segment.',
    xLabel: 'Time (s)', yLabel: 'Distance (m)',
    series: [{ name: 'Trial A', points: [{ x: 2.5, y: 2.5 }] }],
  },
  two: {
    title: 'Two measurements', description: 'Two synthetic observations. Line mode joins the two points with one straight segment.',
    xLabel: 'Time (s)', yLabel: 'Distance (m)',
    series: [{ name: 'Trial A', points: [{ x: 1, y: 1 }, { x: 4, y: 4 }] }],
  },
  invalid: {
    title: 'Out-of-range example', description: 'An intentionally invalid synthetic point demonstrates error handling.',
    xLabel: 'Time (s)', yLabel: 'Distance (m)',
    series: [{ name: 'Invalid trial', points: [{ x: 6, y: 2 }] }],
  },
};

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return value;
}

export const DATASETS = deepFreeze(datasets);
