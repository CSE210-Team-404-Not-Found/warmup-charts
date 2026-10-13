/**
 * Tests for Series.
 *
 * Owned by the backend and frontend teams.
 *
 * Checks that Series rejects bad input at construction, since it is the
 * interface between data loading and Chart.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PointSet, Series } from "../src/index.js";

test("holds a name and a PointSet", () => {
    const points = new PointSet(0);
    const series = new Series("A", points);
    assert.equal(series.name, "A");
    assert.equal(series.points, points);
});

test("rejects a non-string name", () => {
    assert.throws(() => new Series(1, new PointSet(0)), TypeError);
});

test("rejects points that are not a PointSet", () => {
    assert.throws(() => new Series("A", [[1, 2]]), TypeError);
    assert.throws(() => new Series("A", { xs: [], ys: [] }), TypeError);
});
