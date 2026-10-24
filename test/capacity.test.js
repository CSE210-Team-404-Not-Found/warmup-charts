import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../src/index.js";

const MAX_ROWS = 500_000;
/** CSV with x as row number, one column per value function, null as empty cells,
 * and exact whole-number values. */
function makeCSV(rowCount, columns) {
    const names = columns.map((_, i) => `Series ${i + 1}`);
    const lines = [`x,${names.join(",")}`];
    for (let row = 0; row < rowCount; row++) {
        const cells = columns.map((valueAt) => valueAt(row) ?? "");
        lines.push(`${row},${cells.join(",")}`);
    }
    return lines.join("\n");
}

/** Index of the first point that doesn't match, or -1 if they all do. */
function firstMismatch(series, expectedX, expectedY) {
    const { xs, ys } = series.points;
    for (let i = 0; i < series.points.length; i++) {
        if (xs[i] !== expectedX(i) || ys[i] !== expectedY(i)) {
            return i;
        }
    }
    return -1;
}

test("500,000 rows with 1 series parse to 500,000 exact points", () => {
    const [series] = parseCSV(makeCSV(MAX_ROWS, [(row) => row * 2]));

    assert.equal(series.points.length, MAX_ROWS);
    assert.equal(firstMismatch(series, (i) => i, (i) => i * 2), -1);
    assert.deepEqual(series.points.start, [0, 0]);
    assert.deepEqual(series.points.end, [MAX_ROWS - 1, (MAX_ROWS - 1) * 2]);
});

test("500,000 rows with 2 series keep each value in its own series", () => {
    const [first, second] = parseCSV(makeCSV(MAX_ROWS, [(row) => row * 2, (row) => -row]));

    assert.equal(first.points.length, MAX_ROWS);
    assert.equal(second.points.length, MAX_ROWS);
    assert.equal(firstMismatch(first, (i) => i, (i) => i * 2), -1);
    assert.equal(firstMismatch(second, (i) => i, (i) => -i || 0), -1);
});

test("every benchmark size gives rows × series points", () => {
    for (const rowCount of [0, 5_000, 250_000, MAX_ROWS]) {
        for (const seriesCount of [1, 2]) {
            const columns = Array.from({ length: seriesCount }, (_, i) => (row) => row + i);
            const series = parseCSV(makeCSV(rowCount, columns));
            const total = series.reduce((sum, s) => sum + s.points.length, 0);
            assert.equal(series.length, seriesCount);
            assert.equal(total, rowCount * seriesCount, `${rowCount} rows × ${seriesCount} series`);
        }
    }
});

test("gaps in one series at 500,000 rows only affect that series", () => {
    // The second series is empty on every third row.
    const [full, gappy] = parseCSV(makeCSV(MAX_ROWS, [
        (row) => row,
        (row) => (row % 3 === 0 ? null : row),
    ]));

    assert.equal(full.points.length, MAX_ROWS);
    assert.equal(gappy.points.length, MAX_ROWS - Math.ceil(MAX_ROWS / 3));
    assert.ok(Array.from(gappy.points.xs).every((x) => x % 3 !== 0));
    assert.equal(firstMismatch(full, (i) => i, (i) => i), -1);
});

test("a valid 500,000-row file reports no skipped rows or cells", () => {
    let warning = null;
    parseCSV(makeCSV(MAX_ROWS, [(row) => row, (row) => row * 3]), {
        onWarning: (value) => {
            warning = value;
        },
    });
    assert.equal(warning, null);
});
