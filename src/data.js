/**
 * Data loading for the graph: parseCSV and randomData.
 *
 * Owned by the backend team.
 *
 * Turns a user's CSV file, or generated test data, into the Series the
 * renderer draws.
 */

import { PointSet } from "./point-set.js";
import { Series } from "./series.js";

/**
 * Parse CSV text into series.
 *
 * Format (wide layout, plain commas with no quoting; see
 * docs/decisions/0010-csv-input-format.md):
 *
 *     x,Revenue,Cost
 *     0,1.2,0.8
 *     1,1.5,
 * 
 * The header row is comprised of `x`, followed by each series in the file in
 * order.
 * 
 * An empty data column means a series has no point at that x.
 * 
 * Non-numeric cells must be skipped. If `x` is non-numeric, the entire row must be skipped.
 * 
 * If the header is missing, there are fewer than two columns, or duplicate names
 * exist, the function must throw.
 *
 * TODO(backend): implement.
 *
 * @param {string} text Raw CSV file contents.
 * @returns {Series[]}
 */
export function parseCSV(text) {
    // TODO(backend): implement.
    void text;
    return [];
}

/**
 * Generate random series for development and testing.
 *
 * TODO(backend): implement. Use PointSet.fromArrays for large counts.
 *
 * @param {Object} [options]
 * @param {number} [options.seriesCount]  Number of series to generate.
 * @param {number} [options.pointCount]   Points per series.
 * @returns {Series[]}
 */
export function randomData(options = {}) {
    // TODO(backend): implement.
    void options;
    void PointSet;
    void Series;
    return [];
}
