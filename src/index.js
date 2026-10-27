/**
 * The charting library's public API.
 *
 * Owned by the backend and frontend teams.
 *
 * Exported library functions for use by callers.
 * Anything not listed here is not to be accessed from the main page.
 */

/** The released version. The release tooling rewrites this line (ADR-0015). */
export const VERSION = "0.2.0"; // x-release-please-version

export { Chart } from "./chart.js";
export { Series } from "./series.js";
export { PointSet } from "./point-set.js";
export { parseCSV, randomData } from "./data.js";
