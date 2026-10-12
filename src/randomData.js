/** Generate synthetic series in the same format as parseCSV. */
export function randomData({
  seriesCount = 1, pointCount = 10, xMin = 0, xMax = 10,
  yMin = 0, yMax = 10, random = Math.random,
} = {}) {
  for (const [name, value] of Object.entries({ seriesCount, pointCount })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${name} must be a nonnegative safe integer.`);
    }
  }
  for (const [name, min, max] of [["x", xMin, xMax], ["y", yMin, yMax]]) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new Error(`${name} bounds must be finite and ordered.`);
    }
  }
  if (typeof random !== "function") throw new TypeError("random must be a function.");
  const sample = (min, max) => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error("random must return a finite number in [0, 1).");
    }
    return (1 - value) * min + value * max;
  };
  return Array.from({ length: seriesCount }, (_, index) => ({
    name: `Series ${index + 1}`,
    points: Array.from({ length: pointCount }, () => ({
      x: sample(xMin, xMax), y: sample(yMin, yMax),
    })),
  }));
}
