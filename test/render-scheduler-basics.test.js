/**
 * Tests for the worker renderer's chunk splitting, and its fallback when
 * workers aren't available.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createChunkIndices, RenderScheduler } from "../src/render-scheduler.js";

const CHUNK_SIZE = 8192;

test("chunks cover every point exactly once with no gaps or overlaps", () => {
    const cases = [
        { length: 1_000_000, chunks: 123 },
        { length: 16_384, chunks: 2 },
        { length: 8_191, chunks: 1 },
        { length: 1, chunks: 1 },
    ];
    for (const { length, chunks: expected } of cases) {
        const chunks = createChunkIndices(length, CHUNK_SIZE);
        assert.equal(chunks.length, expected, `${length} points`);
        assert.equal(chunks[0].start, 0);
        assert.equal(chunks.at(-1).end, length);
        chunks.forEach((chunk, i) => {
            assert.ok(chunk.end > chunk.start, "no empty chunks");
            assert.ok(chunk.end - chunk.start <= CHUNK_SIZE, "no chunk over the limit");
            if (i > 0) {
                assert.equal(chunk.start, chunks[i - 1].end, "starts where the last ended");
            }
        });
    }
});

test("a chunk size of 1 gives one chunk per point", () => {
    assert.deepEqual(createChunkIndices(5, 1), [
        { start: 0, end: 1 },
        { start: 1, end: 2 },
        { start: 2, end: 3 },
        { start: 3, end: 4 },
        { start: 4, end: 5 },
    ]);
});

test("every chunk is full except the last", () => {
    const sizes = createChunkIndices(20_000, CHUNK_SIZE).map((chunk) => chunk.end - chunk.start);
    assert.deepEqual(sizes, [8192, 8192, 3616]);
});

test("zero points give no chunks, and invalid sizes throw", () => {
    assert.deepEqual(createChunkIndices(0, CHUNK_SIZE), []);
    for (const [length, size] of [[-1, CHUNK_SIZE], [1.5, CHUNK_SIZE], [10, 0], [10, 2.5]]) {
        assert.throws(() => createChunkIndices(length, size), RangeError);
    }
});

test("without Worker or OffscreenCanvas the scheduler refuses to start", () => {
    // Node has neither, like a browser without worker rendering support.
    // The chart catches this error and draws on the main thread instead.
    assert.equal(typeof globalThis.Worker, "undefined");
    assert.equal(typeof globalThis.OffscreenCanvas, "undefined");
    assert.throws(() => new RenderScheduler(), /not supported/);
});
