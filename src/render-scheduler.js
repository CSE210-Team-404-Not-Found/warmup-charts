const MAX_CHUNK_SIZE = 8192;
const MAX_WORKERS = 32;

/** Split a point array into contiguous ranges that cover every point once. */
export function createChunkIndices(length, maxChunkSize) {
    if (!Number.isSafeInteger(length) || length < 0
        || !Number.isSafeInteger(maxChunkSize) || maxChunkSize < 1) {
        throw new RangeError("Point length and maximum chunk size must be valid.");
    }
    if (!length) {
        return [];
    }

    const chunkCount = Math.ceil(length / maxChunkSize);
    return Array.from({ length: chunkCount }, (_, index) => ({
        start: index * maxChunkSize,
        end: Math.min((index + 1) * maxChunkSize, length),
    }));
}

/**
 * Manage the workers and data chunks for one chart's scatter renderer.
 *
 * Each worker keeps its own transferred point data and OffscreenCanvas, while
 * the chart controls when the resulting bitmap layers are composited.
 */
export class RenderScheduler {
    #workers;
    #pending = new Map();
    #series = null;
    #tasks = [];
    #nextRequestId = 0;
    #destroyed = false;

    static create() {
        if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined"
            || typeof OffscreenCanvas.prototype.transferToImageBitmap !== "function") {
            return null;
        }

        const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2;
        const count = Math.max(1, Math.min(MAX_WORKERS, cores - 1));
        return new RenderScheduler(count);
    }

    /** Start a bounded pool, leaving at least one reported core for the page. */
    constructor(count) {
        this.#workers = [];
        try {
            for (let i = 0; i < count; i++) {
                const worker = new Worker(new URL("./worker.js", import.meta.url), {
                    type: "module",
                });
                this.#workers.push(worker);
                worker.addEventListener("message", (event) => this.#onMessage(event.data));
                worker.addEventListener("error", (event) => {
                    this.#fail(new Error(event.message || "A rendering worker failed."));
                });
                worker.addEventListener("messageerror", () => {
                    this.#fail(new Error("A rendering worker returned an unreadable message."));
                });
            }
        } catch (error) {
            for (const worker of this.#workers) {
                worker.terminate();
            }
            throw error;
        }
    }

    /** Copy and distribute each series' points; transfers leave source arrays intact. */
    setSeries(series) {
        if (this.#destroyed) {
            throw new Error("The rendering worker pool has been destroyed.");
        }
        if (series === this.#series) {
            return;
        }

        for (const worker of this.#workers) {
            worker.postMessage({ type: "clear-data" });
        }
        this.#series = series;
        this.#tasks = [];

        let nextWorker = 0;
        // for each data series: 
        for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
            const { xs, ys, length } = series[seriesIndex].points;
            const chunk_indicies = createChunkIndices(length, MAX_CHUNK_SIZE);
            for (let chunkIndex = 0; chunkIndex < chunk_indicies.length; chunkIndex++) {
                const { start, end } = chunk_indicies[chunkIndex];
                const workerIndex = nextWorker++ % this.#workers.length;
                const key = `${seriesIndex}:${chunkIndex}`;
                const chunkXs = xs.slice(start, end);
                const chunkYs = ys.slice(start, end);
                // Transfer these chunk copies to avoid cloning them a second time.
                this.#workers[workerIndex].postMessage({
                    type: "set-data",
                    key,
                    xs: chunkXs.buffer,
                    ys: chunkYs.buffer,
                }, [chunkXs.buffer, chunkYs.buffer]);
                this.#tasks.push({
                    key,
                    workerIndex,
                    seriesIndex,
                    chunkIndex,
                    lastChunk: chunkIndex === chunk_indicies.length - 1,
                });
            }
        }
    }

    /** Render in bounded batches and release obsolete worker results promptly. */
    async render({ width, height, pixelWidth, pixelHeight, ratio, pointRadius, transform },
        onBitmap, isCurrent) {
        if (this.#destroyed) {
            throw new Error("The rendering worker pool has been destroyed.");
        }
        // Limit in-flight bitmaps to one batch so large datasets do not spike memory use.
        for (let start = 0; start < this.#tasks.length; start += this.#workers.length) {
            if (!isCurrent()) {
                return;
            }
            const tasks = this.#tasks.slice(start, start + this.#workers.length);
            const results = await Promise.allSettled(tasks.map((task) => this.#renderTask(
                task, { width, height, pixelWidth, pixelHeight, ratio, pointRadius, transform })));
                

            const bitmaps = [];
            let failure;
            for (const result of results) {
                if (result.status === "fulfilled") {
                    bitmaps.push(result.value);
                } else {
                    failure ??= result.reason;
                }
            }
            
            if (!isCurrent()) {
                for (const bitmap of bitmaps) {
                    bitmap.close();
                }
                return;
            }
            if (failure) {
                for (const bitmap of bitmaps) {
                    bitmap.close();
                }
                throw failure;
            }

            for (let i = 0; i < bitmaps.length; i++) {
                try {
                    onBitmap(bitmaps[i], tasks[i]);
                } catch (error) {
                    for (const bitmap of bitmaps.slice(i)) {
                        bitmap.close();
                    }
                    throw error;
                }
            }
        }
    }

    /** Terminate workers and reject any outstanding render requests. */
    destroy() {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;
        for (const worker of this.#workers) {
            worker.terminate();
        }
        this.#fail(new Error("The rendering worker pool was destroyed."));
    }

    /** Resolve the matching render request, or dispose of an obsolete bitmap. */
    #onMessage(message) {
        const pending = this.#pending.get(message.requestId);
        if (!pending) {
            message.bitmap?.close();
            return;
        }
        this.#pending.delete(message.requestId);
        if (message.error) {
            pending.reject(new Error(message.error));
        } else {
            pending.resolve(message.bitmap);
        }
    }

    /** Send one chunk's render parameters to its assigned worker. */
    #renderTask(task, {
        width, height, pixelWidth, pixelHeight, ratio, pointRadius, transform,
    }) {
        const requestId = this.#nextRequestId++;
        const promise = new Promise((resolve, reject) => {
            this.#pending.set(requestId, { resolve, reject });
        });
        this.#workers[task.workerIndex].postMessage({
            type: "render",
            requestId,
            key: task.key,
            width,
            height,
            pixelWidth,
            pixelHeight,
            ratio,
            pointRadius,
            left: transform.left,
            right: transform.right,
            top: transform.top,
            bottom: transform.bottom,
            x0: transform.xRange[0],
            x1: transform.xRange[1],
            y0: transform.yRange[0],
            y1: transform.yRange[1],
        });
        return promise;
    }

    /** Stop the pool and reject pending requests after a worker error. */
    #fail(error) {
        if (!this.#destroyed) {
            this.#destroyed = true;
            for (const worker of this.#workers) {
                worker.terminate();
            }
        }
        for (const pending of this.#pending.values()) {
            pending.reject(error);
        }
        this.#pending.clear();
    }
}
