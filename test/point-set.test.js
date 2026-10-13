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
    set.sort();
    assert.deepEqual(pairs(set), [[1, 10], [2, 20], [3, 30], [4, 40]]);
    assert.deepEqual(set.start, [1, 10]);
    assert.deepEqual(set.end, [4, 40]);
});

test("sort is stable for equal x", () => {
    const set = PointSet.fromArrays([2, 1, 2, 1], [1, 2, 3, 4]);
    assert.deepEqual(pairs(set), [[1, 2], [1, 4], [2, 1], [2, 3]]);
});

test("sort does no work on data pushed in order", () => {
    const set = new PointSet(3);
    set.push(1, 1);
    set.push(1, 2);
    set.push(5, 3);
    const before = set.xs.buffer;
    set.sort();
    assert.equal(set.xs.buffer, before);
});

test("fromArrays checks lengths and copies its input", () => {
    assert.throws(() => PointSet.fromArrays([1, 2], [1]), RangeError);
    const xs = [2, 1];
    const set = PointSet.fromArrays(xs, [20, 10]);
    xs[0] = 99;
    assert.deepEqual(pairs(set), [[1, 10], [2, 20]]);
});

test("xs and ys views only cover stored points", () => {
    const set = new PointSet(10);
    set.push(1, 2);
    assert.equal(set.xs.length, 1);
    assert.equal(set.ys.length, 1);
});
