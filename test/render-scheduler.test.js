/**
 * Tests for scatter point partitioning used by the worker renderer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createChunkIndices } from "../src/render-scheduler.js";

test("partitions large point sets into contiguous ranges with exact coverage", () => {
    const chunks = createChunkIndices(50001, 25000);

    assert.equal(chunks.length, 3);
    assert.deepEqual(chunks[0], { start: 0, end: 25000 });
    assert.deepEqual(chunks[1], { start: 25000, end: 50000 });
    assert.deepEqual(chunks[2], { start: 50000, end: 50001 });
    assert.equal(chunks.reduce((sum, chunk) => sum + chunk.end - chunk.start, 0), 50001);
});

test("does not create empty chunks and respects the maximum size", () => {
    assert.deepEqual(createChunkIndices(0, 4), []);
    assert.deepEqual(createChunkIndices(100, 100), [{ start: 0, end: 100 }]);
    assert.equal(createChunkIndices(1_000_000, 8192).length, 123);
});

test("rejects invalid lengths and maximum chunk sizes", () => {
    assert.throws(() => createChunkIndices(-1, 2), RangeError);
    assert.throws(() => createChunkIndices(10, 0), RangeError);
    assert.throws(() => createChunkIndices(1.5, 2), RangeError);
});
