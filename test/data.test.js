import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCSV } from "../src/parseCSV.js";
import { randomData } from "../src/randomData.js";

test("single series preserves decimal measurements and unsorted order", () => {
  assert.deepEqual(parseCSV("x,y\n2,-1.5\n0,2e1"), [{
    name: "Series 1", points: [{ x: 2, y: -1.5 }, { x: 0, y: 20 }],
  }]);
});
test("interleaved series keep first appearance and point order", () => {
  assert.deepEqual(parseCSV('series,x,y\nB,2,3\nA,0,1\nB,1,4'), [
    { name: "B", points: [{ x: 2, y: 3 }, { x: 1, y: 4 }] },
    { name: "A", points: [{ x: 0, y: 1 }] },
  ]);
});
test("BOM, CRLF, blank lines, quotes, commas and escaped quotes", () => {
  assert.deepEqual(parseCSV('\uFEFFseries,x,y\r\n\r\n"Trial, ""A""",1,2\r\n'), [
    { name: 'Trial, "A"', points: [{ x: 1, y: 2 }] },
  ]);
  assert.equal(parseCSV('series,x,y\n"two\nlines",1,2')[0].name, "two\nlines");
});
test("empty input and header-only input produce no series", () => {
  for (const input of ["", "  \n", "x,y\n", "series,x,y"]) {
    assert.deepEqual(parseCSV(input), []);
  }
});
test("malformed measurements fail with row and column instead of partial output", () => {
  for (const value of ["", "hello", "NaN", "Infinity", "1e999", "0x10"]) {
    assert.throws(() => parseCSV(`x,y\n0,1\n2,${value}`), /row 3, column y/);
  }
});
test("bad schema, column counts, series names and quote syntax fail", () => {
  for (const input of ["y,x\n1,2", "x,y\n1", "x,y\n1,2,3",
    "series,x,y\n,1,2", 'x,y\n"1,2', 'x,y\n1"2,3', 'x,y\n"1"oops,2']) {
    assert.throws(() => parseCSV(input), Error);
  }
  assert.throws(() => parseCSV(null), TypeError);
});
test("error line numbers account for multiline quoted fields", () => {
  assert.throws(() => parseCSV('series,x,y\n"two\nlines",1,2\nA,3,no'), /row 4, column y/);
});
test("sample files exercise success, empty input and failure", async () => {
  for (const [file, count] of [["single-series", 1], ["multi-series", 2], ["empty", 0]]) {
    const csv = await readFile(new URL(`../data/${file}.csv`, import.meta.url), "utf8");
    assert.equal(parseCSV(csv).length, count);
  }
  const bad = await readFile(new URL("../data/malformed.csv", import.meta.url), "utf8");
  assert.throws(() => parseCSV(bad), /row 3, column y/);
});
test("random data uses the parser contract and caller bounds", () => {
  const data = randomData({ seriesCount: 2, pointCount: 3,
    xMin: -2, xMax: 2, yMin: 10, yMax: 20, random: () => 0.25 });
  assert.deepEqual(data.map(s => s.name), ["Series 1", "Series 2"]);
  for (const series of data) {
    assert.equal(series.points.length, 3);
    assert.deepEqual(series.points[0], { x: -1, y: 12.5 });
    assert.notEqual(series.points[0], series.points[1]);
  }
  assert.deepEqual(randomData({ seriesCount: 0 }), []);
  assert.deepEqual(randomData({ pointCount: 0 })[0].points, []);
  assert.equal(randomData()[0].points.length, 10);
});
test("invalid random options fail explicitly", () => {
  for (const options of [{ seriesCount: -1 }, { pointCount: 1.5 },
    { xMin: 2, xMax: 1 }, { yMax: Infinity }, { random: null },
    { random: () => 1 }, { random: () => NaN }]) {
    assert.throws(() => randomData(options), Error);
  }
});
