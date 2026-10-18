/**
 * Tests for parseCSV and randomData.
 *
 * Owned by the backend team.
 *
 * Checks the CSV format in ADR-0010, malformed-input handling, the sample
 * files in data/, and random test data, through the public API.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCSV, randomData, Series, PointSet } from "../src/index.js";

function points(series) {
    return Array.from(series.points.xs, (x, i) => [x, series.points.ys[i]]);
}

function sorted(series) {
    series.points.sort();
    return points(series);
}

test("public API returns Series and PointSet in row order, sorting with pairs intact", () => {
    const [series] = parseCSV("x,Distance\n2,4\n0,1\n1,3");
    assert.ok(series instanceof Series);
    assert.ok(series.points instanceof PointSet);
    assert.equal(series.name, "Distance");
    assert.equal(series.points.sorted, false);
    assert.deepEqual(points(series), [[2, 4], [0, 1], [1, 3]]);
    assert.deepEqual(sorted(series), [[0, 1], [1, 3], [2, 4]]);
});
test("wide CSV groups columns, preserves header order, and supports gaps", () => {
    const series = parseCSV("x,Trial B,Trial A\n2,4,3\n0,,1\n1,2,");
    assert.deepEqual(series.map((s) => s.name), ["Trial B", "Trial A"]);
    assert.deepEqual(sorted(series[0]), [[1, 2], [2, 4]]);
    assert.deepEqual(sorted(series[1]), [[0, 1], [2, 3]]);
});
test("BOM, CRLF, whitespace, blank lines and scientific notation", () => {
    const [s] = parseCSV("\uFEFF time , value \r\n\r\n -1.5 , 2e1 \r\n");
    assert.equal(s.name, "value");
    assert.deepEqual(points(s), [[-1.5, 20]]);
});
test("header only and empty columns retain named empty series", () => {
    assert.deepEqual(points(parseCSV("x,y\n")[0]), []);
    const series = parseCSV("x,A,B\n0,,\n");
    assert.deepEqual(series.map((s) => s.points.length), [0, 0]);
});
test("bad headers fail and quoted format is unsupported", () => {
    for (const input of ["", "  \n", "x", "0,1\n2,3", "x,A,A", "x,A,", 'x,"A"']) {
        assert.throws(() => parseCSV(input), Error);
    }

    assert.throws(() => parseCSV(null), TypeError);
});
test("invalid cells skip only their series and invalid x skips the row; counts reported", () => {
    let warning;
    const series = parseCSV("x,A,B\n0,1,2\n1,no,3\ninvalid,4,5\n2,6,7", {
        onWarning: (value) => {
            warning = value;
        },
    });
    assert.deepEqual(points(series[0]), [[0, 1], [2, 6]]);
    assert.deepEqual(points(series[1]), [[0, 2], [1, 3], [2, 7]]);
    assert.deepEqual(warning, { skippedRows: 1, skippedCells: 1 });
});
test("missing/extra columns skip entire row and never shift values into wrong series", () => {
    let warning;
    const series = parseCSV("x,A,B\n0,1\n1,2,3,4\n2,4,5", {
        onWarning: (value) => {
            warning = value;
        },
    });
    assert.deepEqual(points(series[0]), [[2, 4]]);
    assert.deepEqual(warning, { skippedRows: 2, skippedCells: 0 });
});
test("nonfinite, hex and Float32-overflow coordinates never enter PointSet", () => {
    for (const value of ["NaN", "Infinity", "1e999", "1e39", "0x10", '"2"']) {
        assert.equal(parseCSV(`x,y\n0,${value}`)[0].points.length, 0);
        assert.equal(parseCSV(`x,y\n${value},2`)[0].points.length, 0);
    }
});
test("equal x coordinates sort by y", () => {
    assert.deepEqual(sorted(parseCSV("x,y\n2,9\n1,4\n1,3")[0]), [[1, 3], [1, 4], [2, 9]]);
});
test("valid CSV does not warn; warning callback validated", () => {
    parseCSV("x,y\n0,1", { onWarning: () => assert.fail("Unexpected warning") });
    assert.throws(() => parseCSV("x,y", { onWarning: true }), TypeError);
});
test("sample files follow the public contract and malformed sample counts skips", async () => {
    for (const [file, count, lengths] of [["single-series", 1, [6]],
        ["multi-series", 2, [4, 4]], ["empty", 1, [0]]]) {
        const csv = await readFile(new URL(`../data/${file}.csv`, import.meta.url), "utf8");
        const series = parseCSV(csv);
        assert.equal(series.length, count);
        assert.deepEqual(series.map((s) => s.points.length), lengths);
    }
    let warning;
    const bad = await readFile(new URL("../data/malformed.csv", import.meta.url), "utf8");
    const series = parseCSV(bad, {
        onWarning: (value) => {
            warning = value;
        },
    });
    assert.deepEqual(warning, { skippedRows: 2, skippedCells: 2 });
    assert.deepEqual(series.map((s) => s.points.length), [1, 4]);
});
test("random data returns Series[] with paired points and requested dimensions", () => {
    const values = [0.75, 0.25, 0.25, 0.75];
    let index = 0;
    const [series] = randomData({ pointCount: 2, xMin: -2, xMax: 2,
        yMin: 10, yMax: 20, random: () => values[index++] });
    assert.ok(series instanceof Series);
    assert.deepEqual(points(series), [[1, 12.5], [-1, 17.5]]);
    const data = randomData({ seriesCount: 2, pointCount: 3, random: () => 0.5 });
    assert.deepEqual(data.map((s) => s.name), ["Series 1", "Series 2"]);
    assert.deepEqual(data.map((s) => s.points.length), [3, 3]);
    assert.notEqual(data[0].points, data[1].points);
    assert.deepEqual(randomData({ seriesCount: 0 }), []);
    assert.equal(randomData({ pointCount: 0 })[0].points.length, 0);
    assert.equal(randomData()[0].points.length, 10);
});
test("large random data stays finite, sorts, and stays within default bounds", () => {
    const [series] = randomData({ pointCount: 10000 });
    assert.equal(series.points.length, 10000);
    let previous = -Infinity;
    for (const [x, y] of sorted(series)) {
        assert.ok(x >= previous && x >= 0 && x <= 10);
        assert.ok(y >= 0 && y <= 10);
        previous = x;
    }
});
test("invalid random options fail explicitly and equal bounds work", () => {
    for (const options of [{ seriesCount: -1 }, { pointCount: 1.5 },
        { xMin: 2, xMax: 1 }, { yMax: Infinity }, { xMax: 1e39 },
        { random: null }, { random: () => 1 }, { random: () => NaN },
        { xMin: "5" }, { random: () => "0.5" }]) {
        assert.throws(() => randomData(options), Error);
    }

    assert.deepEqual(points(randomData({ pointCount: 1,
        xMin: 2, xMax: 2, yMin: 3, yMax: 3 })[0]), [[2, 3]]);
});

test("header errors describe the problem", () => {
    const cases = [
        ["x\tA\n1\t2", /separated by commas/],
        ["x;A\n1;2", /separated by commas/],
        ['x,"A"\n1,2', /quoted/],
        ["x,A,\n1,2,3", /cannot be empty/],
        ["0,1\n1,2", /all numbers/],
        ["x,A,A\n1,2,3", /unique/],
    ];
    for (const [input, message] of cases) {
        assert.throws(() => parseCSV(input), message, input);
    }
});

test("numeric series names are allowed when x is named", () => {
    const series = parseCSV("year,2019,2020\n1,5,6");
    assert.deepEqual(series.map((s) => s.name), ["2019", "2020"]);
});

test("whitespace-only cells are handled correctly", () => {
    const [series] = parseCSV("x,A\n0, \n1,2", {
        onWarning: () => assert.fail("blank cells should not warn"),
    });
    assert.deepEqual(points(series), [[1, 2]]);
});

test("old Mac (CR-only) line endings", () => {
    assert.deepEqual(points(parseCSV("x,A\r0,1\r1,2")[0]), [[0, 1], [1, 2]]);
});

test("duplicate x values are all kept", () => {
    const [a, b] = parseCSV("x,A,B\n1,1,5\n1,2,\n0,3,6");
    assert.deepEqual(sorted(a), [[0, 3], [1, 1], [1, 2]]);
    assert.deepEqual(sorted(b), [[0, 6], [1, 5]]);
});

test("large unsorted input sorts with every x/y pair intact", () => {
    const n = 100000;
    const rows = ["x,Double,Negative"];
    // Deterministic shuffle of 0..n-1
    for (let i = 0; i < n; i++) {
        const x = (i * 7919) % n;
        rows.push(`${x},${x * 2},${-x}`);
    }
    const [double, negative] = parseCSV(rows.join("\n"));
    double.points.sort();
    negative.points.sort();
    assert.equal(double.points.length, n);
    assert.equal(negative.points.length, n);
    const { xs, ys } = double.points;
    for (let i = 0; i < n; i++) {
        assert.equal(xs[i], i);
        assert.equal(ys[i], i * 2);
        assert.equal(negative.points.ys[i], -i || 0);
    }
});

test("sparse columns do not leak points between series", () => {
    const rows = ["x,A,B"];
    for (let i = 0; i < 1000; i++) {
        rows.push(i % 2 ? `${i},${i},` : `${i},,${i}`);
    }
    const [a, b] = parseCSV(rows.join("\n"));
    assert.equal(a.points.length, 500);
    assert.equal(b.points.length, 500);
    assert.ok(Array.from(a.points.xs).every((x) => x % 2 === 1));
    assert.ok(Array.from(b.points.xs).every((x) => x % 2 === 0));
});

test("timestamps as x collapse under float32 storage, as documented", async () => {
    const csv = await readFile(new URL("../data/timestamps.csv", import.meta.url), "utf8");
    const [series] = parseCSV(csv, {
        onWarning: () => assert.fail("Rounding is not reported"),
    });
    assert.deepEqual(Array.from(series.points.xs), Array(4).fill(Math.fround(1700000000000)));
});
