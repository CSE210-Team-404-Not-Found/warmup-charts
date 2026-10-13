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

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

// PointSet uses Float32Array, so coordinates must remain finite after storage.
function coordinate(text) {
    if (!DECIMAL.test(text)) {
        return null;
    }
    const value = Number(text);
    return Number.isFinite(value) && Number.isFinite(Math.fround(value)) ? value : null;
}

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
 * @param {string} text Raw CSV file contents.
 * @param {Object} [options]
 * @param {(skipped: { skippedRows: number, skippedCells: number }) => void} [options.onWarning]
 *     Called once, after parsing, if any rows or cells were skipped.
 * @returns {Series[]}
 */
export function parseCSV(text, { onWarning } = {}) {
    if (typeof text !== "string") {
        throw new TypeError("CSV input must be a string.");
    }
    if (onWarning !== undefined && typeof onWarning !== "function") {
        throw new TypeError("onWarning must be a function.");
    }

    const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
    const headerLine = lines.findIndex((line) => line.trim() !== "");
    if (headerLine < 0) {
        throw new Error("CSV header is missing.");
    }
    const header = lines[headerLine].split(",").map((cell) => cell.trim());
    const names = header.slice(1);
    if (header.length < 2) {
        throw new Error("CSV header needs an x column and at least one series, "
            + "separated by commas.");
    }
    if (header.some((cell) => cell.includes('"'))) {
        throw new Error("CSV fields cannot be quoted.");
    }
    if (names.some((name) => name === "")) {
        throw new Error("CSV series names cannot be empty.");
    }
    if (header.every((cell) => coordinate(cell) !== null)) {
        throw new Error("CSV header is missing: the first row is all numbers.");
    }
    if (new Set(names).size !== names.length) {
        throw new Error("CSV series names must be unique.");
    }
    // Fixed-size storage: no series can have more points than there are rows.
    const columns = names.map(() => new PointSet(lines.length - headerLine - 1));
    const warnings = { skippedRows: 0, skippedCells: 0 };
    for (let i = headerLine + 1; i < lines.length; i++) {
        if (lines[i].trim() === "") {
            continue;
        }
        const cells = lines[i].split(",").map((cell) => cell.trim());
        const x = coordinate(cells[0]);
        if (cells.length !== header.length || x === null) {
            warnings.skippedRows++;
            continue;
        }
        for (let j = 0; j < names.length; j++) {
            const cell = cells[j + 1];
            if (cell === "") {
                continue;
            }
            const y = coordinate(cell);
            if (y === null) {
                warnings.skippedCells++;
                continue;
            }
            columns[j].push(x, y);
        }
    }
    if ((warnings.skippedRows || warnings.skippedCells) && onWarning) {
        onWarning(warnings);
    }
    for (const column of columns) {
        column.sort();
    }
    return names.map((name, i) => new Series(name, columns[i]));
}

/**
 * Generate random series for development and testing.
 *
 * Use PointSet.fromArrays for large counts.
 *
 * @param {Object} [options]
 * @param {number} [options.seriesCount]  Number of series to generate.
 * @param {number} [options.pointCount]   Points per series.
 * @param {number} [options.xMin]  Smallest x value (default 0).
 * @param {number} [options.xMax]  Largest x value (default 10).
 * @param {number} [options.yMin]  Smallest y value (default 0).
 * @param {number} [options.yMax]  Largest y value (default 10).
 * @param {() => number} [options.random]  Source of values in [0, 1).
 *     Defaults to Math.random; pass a fixed sequence for repeatable tests.
 * @returns {Series[]}
 */
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
        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max
            || !Number.isFinite(Math.fround(min)) || !Number.isFinite(Math.fround(max))) {
            throw new Error(`${name} bounds must be finite, ordered, and fit Float32 storage.`);
        }
    }
    if (typeof random !== "function") {
        throw new TypeError("random must be a function.");
    }
    const sample = (min, max) => {
        const value = random();
        if (!Number.isFinite(value) || value < 0 || value >= 1) {
            throw new Error("random must return a finite number in [0, 1).");
        }

        return (1 - value) * min + value * max;
    };
    return Array.from({ length: seriesCount }, (_, index) => {
        const xs = new Float32Array(pointCount);
        const ys = new Float32Array(pointCount);
        for (let i = 0; i < pointCount; i++) {
            xs[i] = sample(xMin, xMax);
            ys[i] = sample(yMin, yMax);
        }
        return new Series(`Series ${index + 1}`, PointSet.fromArrays(xs, ys));
    });
}
