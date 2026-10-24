/**
 * Tests for PointSet.
 *
 * Owned by the backend team.
 *
 * Checks fixed-size loading, sorting, and pair integrity, which every series
 * depends on.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PointSet } from "../src/index.js";

const pairs = (set) => Array.from(set.xs, (x, i) => [x, set.ys[i]]);

test("empty set", () => {
    const set = new PointSet(0);
    assert.equal(set.length, 0);
    assert.equal(set.capacity, 0);
    assert.equal(set.start, null);
    assert.equal(set.end, null);
    set.sort();
    assert.deepEqual(pairs(set), []);
});

test("push is fixed-size", () => {
    const set = new PointSet(2);
    set.push(1, 1);
    set.push(2, 2);
    assert.throws(() => set.push(3, 3), RangeError);
    assert.equal(set.length, 2);
});

test("sort keeps x/y pairs together", () => {
    const set = new PointSet(4);
    for (const [x, y] of [[3, 30], [1, 10], [4, 40], [2, 20]]) {
        set.push(x, y);
    }
    assert.deepEqual(set.start, [1, 10]);
    assert.deepEqual(set.end, [4, 40]);
    set.sort();
    assert.deepEqual(pairs(set), [[1, 10], [2, 20], [3, 30], [4, 40]]);
    assert.deepEqual(set.start, [1, 10]);
    assert.deepEqual(set.end, [4, 40]);
});

test("sort orders equal x by y", () => {
    const set = PointSet.fromArrays([2, 1, 2, 1], [3, 4, 1, 2]);
    set.sort();
    assert.deepEqual(pairs(set), [[1, 2], [1, 4], [2, 1], [2, 3]]);
});

test("sort is in place", () => {
    const set = PointSet.fromArrays([3, 1, 2], [0, 0, 0]);
    const before = set.xs.buffer;
    set.sort();
    assert.equal(set.xs.buffer, before);
});

test("sorted tracks whether points are in order", () => {
    const set = new PointSet(4);
    set.push(1, 1);
    set.push(1, 2);
    set.push(5, 3);
    assert.equal(set.sorted, true);
    set.push(5, 0);
    assert.equal(set.sorted, false);
    set.sort();
    assert.equal(set.sorted, true);
});

test("fromArrays checks lengths, copies its input and keeps its order", () => {
    assert.throws(() => PointSet.fromArrays([1, 2], [1]), RangeError);
    const xs = [2, 1];
    const set = PointSet.fromArrays(xs, [20, 10]);
    xs[0] = 99;
    assert.deepEqual(pairs(set), [[2, 20], [1, 10]]);
    assert.equal(set.sorted, false);
    assert.equal(PointSet.fromArrays([1, 2], [0, 0]).sorted, true);
});

test("sort matches a reference sort on large inputs", () => {
    // Deterministic pseudo-random values in [0, 1).
    let seed = 1;
    const random = () => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return seed / 2 ** 31;
    };
    const n = 100000;
    const inputs = {
        "random": Array.from({ length: n }, () => [random() * 1000, random() * 1000]),
        "many equal x": Array.from({ length: n }, () => [Math.floor(random() * 50), random()]),
        "all equal": Array.from({ length: n }, () => [7, 7]),
        "reversed": Array.from({ length: n }, (_, i) => [n - i, i]),
        "sorted, then one out of place": Array.from({ length: n }, (_, i) => [i ? i : n, 0]),
    };
    const fromPairs = (points) => PointSet.fromArrays(
        points.map((p) => p[0]), points.map((p) => p[1]));
    for (const [name, points] of Object.entries(inputs)) {
        const set = fromPairs(points);
        set.sort();
        // Compare after Float32 rounding, which fromPairs applies.
        const expected = pairs(fromPairs(points)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        assert.deepEqual(pairs(set), expected, name);
    }
});

test("xs and ys views only cover stored points", () => {
    const set = new PointSet(10);
    set.push(1, 2);
    assert.equal(set.xs.length, 1);
    assert.equal(set.ys.length, 1);
});
