import { PointSet } from "./point-set.js";
import { Series } from "./series.js";

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

// PointSet uses Float32Array, so coordinates must remain finite after storage.
function coordinate(text) {
    if (!DECIMAL.test(text)) return null;
    const value = Number(text);
    return Number.isFinite(value) && Number.isFinite(Math.fround(value)) ? value : null;
}

/**
 * Read wide CSV (x,Series A,Series B) into x-sorted Series[].
 * Blank y cells are gaps. Invalid cells/rows are skipped as specified in ADR-0010.
 * Optional onWarning receives { skippedRows, skippedCells } when data is skipped.
 */
export function parseCSV(text, { onWarning } = {}) {
    if (typeof text !== "string") throw new TypeError("CSV input must be a string.");
    if (onWarning !== undefined && typeof onWarning !== "function") {
        throw new TypeError("onWarning must be a function.");
    }
    const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
    const headerLine = lines.findIndex(line => line.trim() !== "");
    if (headerLine < 0) throw new Error("CSV header is missing.");
    const header = lines[headerLine].split(",").map(cell => cell.trim());
    const names = header.slice(1);
    if (header.length < 2 || header.some(cell => cell.includes('"')) ||
        names.some(name => name === "") || header.every(cell => coordinate(cell) !== null)) {
        throw new Error("CSV needs an unquoted header and at least one nonempty series name.");
    }
    if (new Set(names).size !== names.length) throw new Error("CSV series names must be unique.");
    const columns = names.map(() => ({ xs: [], ys: [] }));
    const warnings = { skippedRows: 0, skippedCells: 0 };
    for (let i = headerLine + 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        const cells = lines[i].split(",").map(cell => cell.trim());
        const x = coordinate(cells[0]);
        if (cells.length !== header.length || x === null) {
            warnings.skippedRows++;
            continue;
        }
        for (let j = 0; j < names.length; j++) {
            const cell = cells[j + 1];
            if (cell === "") continue;
            const y = coordinate(cell);
            if (y === null) { warnings.skippedCells++; continue; }
            columns[j].xs.push(x);
            columns[j].ys.push(y);
        }
    }
    if ((warnings.skippedRows || warnings.skippedCells) && onWarning) onWarning(warnings);
    return names.map((name, i) => new Series(name,
        PointSet.fromArrays(columns[i].xs, columns[i].ys)));
}

/** Generate x-sorted Series[] for testing; random can be injected for repeatability. */
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
        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max ||
            !Number.isFinite(Math.fround(min)) || !Number.isFinite(Math.fround(max))) {
            throw new Error(`${name} bounds must be finite, ordered, and fit Float32 storage.`);
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
