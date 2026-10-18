/**
 * A chart drawn on one canvas.
 *
 * Owned by the frontend team.
 *
 * Each Chart keeps its own series, colors, and options, and redraws itself
 * when any of them or its size changes.
 */

import { Series } from "./series.js";
import { RenderScheduler } from "./render-scheduler.js";

const WORKER_MIN_POINTS = 50000;

const FONT = "13px sans-serif";
const LABEL_FONT = "14px sans-serif";
const TEXT_COLOR = "#222";
const AXIS_COLOR = "#666";
const BACKGROUND = "#fff";

const EDGE = 4;
const TICK_SPACE = { left: 40, bottom: 24, right: 24, top: 16 };
const TITLE_SPACE = { left: 20, bottom: 36 };
const TICK_LABEL_GAP = 10;
const X_TITLE_OFFSET = 46;
const Y_TITLE_X = 18;
const LEGEND_INSET = 24;
const LEGEND_GAP = 20;

const TITLES_MIN = { width: 240, height: 200 };
const LEGEND_MIN = { width: 160, height: 120 };
const TICKS_MIN = { width: 120, height: 100 };
const LEGEND_ROW = 24;
const LEGEND_SWATCH = 10;
const POINT_RADIUS = 4;
const TICK_COUNT = 5;
const TICK_GAP = { x: 50, y: 30 };

export class Chart {
    #canvas;
    #ctx;
    #series = [];
    #colors = [];
    #options;
    #observer;
    #frame = 0;
    #renderScheduler;
    #schedulerInitAttempted = false;
    #stagingCanvas;
    #stagingCanvasContext;
    #currDrawGeneration = 0;

    /**
     * @param {HTMLCanvasElement} canvas  The canvas this chart draws on.
     * @param {Object} [options]
     * @param {number} [options.width]  Width in CSS pixels (default 800).
     * @param {number} [options.height]  Height in CSS pixels (default 450).
     * @param {boolean} [options.showLine]  Connect points with lines.
     * @param {boolean} [options.showAxes]  Axis lines and ticks (default true).
     * @param {boolean} [options.showAxisLabels]  Axis labels (default true).
     * @param {boolean} [options.showLegend]  Legend (default true).
     * @param {[number, number]} [options.xRange]  Fixed x axis start and end
     *     (default: fit the data).
     * @param {[number, number]} [options.yRange]  Fixed y axis start and end
     *     (default: fit the data).
     * @param {string} [options.xLabel]  x axis label.
     * @param {string} [options.yLabel]  y axis label.
     */
    constructor(canvas, options = {}) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new TypeError("Chart needs a <canvas> element");
        }

        checkSize(options);
        this.#canvas = canvas;
        this.#ctx = canvas.getContext("2d");
        this.#options = {
            width: 800, height: 450, showLine: false,
            showAxes: true, showAxisLabels: true, showLegend: true,
            xRange: null, yRange: null, xLabel: "", yLabel: "", ...options,
        };
        this.#applySize();

        // Fires once immediately, which gives the first draw.
        this.#observer = new ResizeObserver(() => this.#resize());
        this.#observer.observe(canvas);
    }

    get canvas() {
        return this.#canvas;
    }

    get series() {
        return this.#series;
    }

    get options() {
        return { ...this.#options };
    }

    /**
     * Replace the chart's data, with a color for each series chosen by the
     * caller.
     * @param {Series[]} series
     * @param {string[]} colors  CSS colors, one per series, in the same order.
     */
    setSeries(series, colors) {
        for (const s of series) {
            if (!(s instanceof Series)) {
                throw new TypeError("setSeries takes an array of Series");
            }
        }
        if (!Array.isArray(colors) || colors.length !== series.length) {
            throw new RangeError("setSeries needs one color per series");
        }

        this.#series = [...series];
        this.#colors = [...colors];
        this.#currDrawGeneration++;
        this.requestDraw();
    }

    get colors() {
        return [...this.#colors];
    }

    /** Merge new options in and redraw. */
    setOptions(options) {
        checkSize(options);
        this.#options = { ...this.#options, ...options };
        this.#applySize();
        this.#currDrawGeneration++;
        this.requestDraw();
    }

    /** Schedule a redraw on the next frame. Repeated calls share one draw. */
    requestDraw() {
        if (this.#frame) {
            return;
        }
        this.#frame = requestAnimationFrame(() => {
            this.#frame = 0;
            this.draw();
        });
    }

    /** Redraw everything now from the chart's stored state. */
    draw() {
        const ctx = this.#ctx;
        const width = this.#canvas.clientWidth;
        const height = this.#canvas.clientHeight;
        if (!width || !height) {
            return;
        }

        const ratio = this.#canvas.width / width;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = BACKGROUND;
        ctx.fillRect(0, 0, width, height);

        const layout = this.#layout(width, height);
        const transform = this.#makeTransform(width, height, layout);
        this.#drawAxes(transform, layout);

        const totalPoints = this.#series.reduce((sum, series) => sum + series.points.length, 0);
        // Keep ordinary plots and line charts on the existing synchronous path.
        const recordedGeneration = ++this.#currDrawGeneration;
        // MAPREDUCE RENDER only if >= WORKER_MIN_POINTS and no lines, because lines are drawn in order.
        if (!this.#options.showLine && totalPoints >= WORKER_MIN_POINTS) {
            try {
                if (!this.#schedulerInitAttempted) {
                    this.#schedulerInitAttempted = true;
                    this.#renderScheduler = RenderScheduler.create();
                }
                if (!this.#renderScheduler) {
                    this.#drawSeriesOnMain(transform);
                } else {
                    this.#renderScheduler.setSeries(this.#series);
                    this.#renderScheduler.render({
                        width,
                        height,
                        pixelWidth: this.#canvas.width,
                        pixelHeight: this.#canvas.height,
                        ratio,
                        pointRadius: POINT_RADIUS,
                        transform,
                    }, (bitmap, task) => {
                        if (recordedGeneration === this.#currDrawGeneration) {
                            this.#compositeBitmaps(
                                bitmap, task, this.#colors[task.seriesIndex], width, height, ratio);
                        }
                        // A stale result is ignored above, but its bitmap still needs releasing.
                        bitmap.close();
                    }, () => recordedGeneration === this.#currDrawGeneration).catch((error) => {
                        if (recordedGeneration !== this.#currDrawGeneration) {
                            return;
                        }
                        console.error("Worker rendering failed; using the main thread renderer.",
                            error);
                        this.#renderScheduler?.destroy();
                        this.#renderScheduler = null;
                        this.draw();
                    });
                }
            } catch (error) {
                console.error("Worker rendering could not start; using the main thread renderer.",
                    error);
                this.#renderScheduler?.destroy();
                this.#renderScheduler = null;
                this.#drawSeriesOnMain(transform);
            }
        } else {
            this.#drawSeriesOnMain(transform);
        }

        if (layout.legend) {
            this.#drawLegend(layout.legend);
        }
        if (this.#series.every((s) => !s.points.length)) {
            this.#drawNoData(transform);
        }
    }

    #drawSeriesOnMain(transform) {
        const ctx = this.#ctx;
        const pad = POINT_RADIUS + 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(transform.left - pad, transform.top - pad,
            transform.right - transform.left + 2 * pad, transform.bottom - transform.top + 2 * pad);
        ctx.clip();
        this.#series.forEach((s, i) => this.#drawSeries(transform, s, this.#colors[i]));
        ctx.restore();
    }

    /**
 * Accumulates a worker-rendered series mask, colors it, and draws it onto
 * the visible chart once all chunks for that series have arrived.
 *
 * The worker renders the series as a white mask on a transparent background.
 * Chunks are combined on a separate offscreen canvas so they can be tinted
 * together without changing the visible chart until the series is complete.
 *
 * @param {ImageBitmap} bitmap Rendered mask for one chunk of a series.
 * @param {Object} task Chunk metadata, including its index and whether it is
 *     the final chunk for the series.
 * @param {string} color CSS color to apply to the completed mask.
 * @param {number} width Canvas width in CSS pixels.
 * @param {number} height Canvas height in CSS pixels.
 * @param {number} ratio Scale from CSS pixels to backing-bitmap pixels.
 */
#compositeBitmaps(bitmap, task, color, width, height, ratio) {
    // Create the offscreen canvas on demand; keep it for reuse between draws.
    if (!this.#stagingCanvas) {
        this.#stagingCanvas = this.#canvas.ownerDocument.createElement("canvas");
        this.#stagingCanvasContext = this.#stagingCanvas.getContext("2d");
        if (!this.#stagingCanvasContext) {
            throw new Error("Could not create a chart worker-composition context.");
        }
    }

    // Match the offscreen bitmap dimensions to the visible canvas, including
    // its device-pixel-ratio scaling.
    if (this.#stagingCanvas.width !== this.#canvas.width
        || this.#stagingCanvas.height !== this.#canvas.height) {
        this.#stagingCanvas.width = this.#canvas.width;
        this.#stagingCanvas.height = this.#canvas.height;
    }

    const ctx = this.#stagingCanvasContext;

    // Use CSS-pixel drawing coordinates while scaling them to backing pixels,
    // just as the visible chart context does.
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    if (task.chunkIndex === 0) {
        // Start a fresh mask for this series. source-over lets later chunks
        // accumulate on top of the earlier ones.
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, width, height);
    }

    // Add this chunk's mask to the offscreen canvas.
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Wait until every chunk for this series has been accumulated before
    // coloring or displaying it.
    if (!task.lastChunk) {
        return;
    }

    // console.log(`took ${(performance.now() - t0).toFixed(3)} ms`)

    // Keep the color only where the accumulated mask has opacity. This turns
    // the worker's white mask into a mask in the series' assigned color.
    // source-in makes the fillRect only fill the masked dots, therein coloring only the dots
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    // Restore normal compositing
    ctx.globalCompositeOperation = "source-over";

    // copy the completed colored series ontothe visible chart.
    this.#ctx.drawImage(this.#stagingCanvas, 0, 0, width, height);

    // Clear the offscreen mask so it cannot affect the next series.
    ctx.clearRect(0, 0, width, height);
}

    /** Stop observing the canvas and cancel any pending draw. */
    destroy() {
        this.#observer.disconnect();
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
        this.#currDrawGeneration++;
        this.#renderScheduler?.destroy();
        this.#renderScheduler = null;
    }

    /** Size the bitmap to the displayed size, accounting for devicePixelRatio. */
    #resize() {
        const canvas = this.#canvas;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);

        // Resizing clears the canvas, so draw now.
        this.draw();
    }

    /** Set the canvas's displayed size from options.width / height. */
    #applySize() {
        this.#canvas.style.width = `${this.#options.width}px`;
        this.#canvas.style.height = `${this.#options.height}px`;
    }

    /** Margins, and which of the titles, legend and ticks are on and fit at this size. */
    #layout(width, height) {
        const { showAxes, showAxisLabels, showLegend } = this.#options;
        const fits = (min) => width >= min.width && height >= min.height;
        const ticks = showAxes && fits(TICKS_MIN);
        const titles = showAxisLabels && fits(TITLES_MIN);
        const edge = Math.min(EDGE, Math.floor(Math.min(width, height) / 3));
        const margin = {
            left: edge + (ticks ? TICK_SPACE.left : 0) + (titles ? TITLE_SPACE.left : 0),
            right: ticks ? TICK_SPACE.right : edge,
            top: ticks ? TICK_SPACE.top : edge,
            bottom: edge + (ticks ? TICK_SPACE.bottom : 0) + (titles ? TITLE_SPACE.bottom : 0),
        };

        let legend = showLegend && fits(LEGEND_MIN) ? this.#layoutLegend(width) : null;
        if (legend && (!legend.entries.length
            || legend.bottom + LEGEND_GAP - margin.top > height / 4)) {
            legend = null;
        }
        return { edge, margin, ticks, titles, legend };
    }

    /** Data-to-pixel transform, using options.xRange / yRange. */
    #makeTransform(width, height, { margin, legend }) {
        const left = margin.left;
        const right = width - margin.right;
        const top = legend ? legend.bottom + LEGEND_GAP : margin.top;
        const bottom = height - margin.bottom;
        const xRange = this.#options.xRange ?? fitRange(this.#series, "xs");
        const yRange = this.#options.yRange ?? fitRange(this.#series, "ys");
        const [x0, x1] = xRange;
        const [y0, y1] = yRange;

        return {
            left, right, top, bottom, xRange, yRange,
            toPx: (x) => left + (x - x0) / (x1 - x0) * (right - left),
            // Canvas y increases downwards.
            toPy: (y) => bottom - (y - y0) / (y1 - y0) * (bottom - top),
        };
    }

    /** Axes and axis labels. */
    #drawAxes(transform, layout) {
        if (layout.ticks) {
            this.#drawTicks(transform);
        }
        if (layout.titles) {
            this.#drawTitles(transform);
        }
    }

    /** Axis lines, ticks and tick labels. */
    #drawTicks(transform) {
        const ctx = this.#ctx;
        const { left, right, top, bottom } = transform;

        ctx.lineWidth = 1;
        ctx.strokeStyle = AXIS_COLOR;
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(left, bottom);
        ctx.lineTo(right, bottom);
        ctx.stroke();

        ctx.font = FONT;
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (const tick of ticks(transform.xRange, tickCount(right - left, TICK_GAP.x))) {
            const px = transform.toPx(tick);
            ctx.beginPath();
            ctx.moveTo(px, bottom);
            ctx.lineTo(px, bottom + 5);
            ctx.stroke();
            ctx.fillText(formatTick(tick), px, bottom + TICK_LABEL_GAP);
        }

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (const tick of ticks(transform.yRange, tickCount(bottom - top, TICK_GAP.y))) {
            const py = transform.toPy(tick);
            ctx.beginPath();
            ctx.moveTo(left - 5, py);
            ctx.lineTo(left, py);
            ctx.stroke();
            ctx.fillText(formatTick(tick), left - TICK_LABEL_GAP, py,
                TICK_SPACE.left - TICK_LABEL_GAP);
        }
    }

    /** Axis labels. */
    #drawTitles(transform) {
        const ctx = this.#ctx;
        const { left, right, top, bottom } = transform;
        const { xLabel, yLabel } = this.#options;
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = LABEL_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(xLabel, (left + right) / 2, bottom + X_TITLE_OFFSET, right - left);
        ctx.save();
        ctx.translate(Y_TITLE_X, (top + bottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = "middle";
        ctx.fillText(yLabel, 0, 0, bottom - top);
        ctx.restore();
    }

    /** Points, or lines when options.showLine is set. */
    #drawSeries(transform, series, color) {
        const ctx = this.#ctx;
        const { xs, ys, length } = series.points;
        if (!length) {
            return;
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // A single point has no line, so it is drawn as a point.
        if (this.#options.showLine && length > 1) {
            series.points.sort();
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(transform.toPx(xs[0]), transform.toPy(ys[0]));
            for (let i = 1; i < length; i++) {
                ctx.lineTo(transform.toPx(xs[i]), transform.toPy(ys[i]));
            }
            ctx.stroke();
            return;
        }

        ctx.beginPath();
        for (let i = 0; i < length; i++) {
            const px = transform.toPx(xs[i]);
            const py = transform.toPy(ys[i]);
            ctx.moveTo(px + POINT_RADIUS, py);
            ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
        }
        ctx.fill();
    }

    /** Legend entry positions, wrapping into rows above the plot. */
    #layoutLegend(width) {
        const ctx = this.#ctx;
        ctx.font = FONT;

        const entries = [];
        const maxTextWidth = width - 2 * LEGEND_INSET - LEGEND_SWATCH - 18;
        let x = LEGEND_INSET;
        let y = LEGEND_INSET;
        this.#series.forEach((s, i) => {
            const textWidth = Math.min(ctx.measureText(s.name).width, maxTextWidth);
            const entryWidth = LEGEND_SWATCH + 8 + textWidth + 26;
            if (x > LEGEND_INSET && x + entryWidth > width - LEGEND_INSET) {
                x = LEGEND_INSET;
                y += LEGEND_ROW;
            }
            entries.push({ name: s.name, color: this.#colors[i], x, y, textWidth });
            x += entryWidth;
        });

        return { entries, bottom: y + LEGEND_ROW / 2 };
    }

    /** Legend, using each series' name and color. */
    #drawLegend(legend) {
        const ctx = this.#ctx;
        ctx.font = FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        for (const entry of legend.entries) {
            ctx.fillStyle = entry.color;
            ctx.fillRect(entry.x, entry.y - LEGEND_SWATCH / 2, LEGEND_SWATCH, LEGEND_SWATCH);
            ctx.fillStyle = TEXT_COLOR;
            ctx.fillText(entry.name, entry.x + LEGEND_SWATCH + 8, entry.y, entry.textWidth || 1);
        }
    }

    /** "No data", centered in the plot. */
    #drawNoData(transform) {
        const ctx = this.#ctx;
        ctx.font = FONT;
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No data", (transform.left + transform.right) / 2,
            (transform.top + transform.bottom) / 2);
    }
}

/** Throw if options.width or options.height is set but not a positive size. */
function checkSize(options) {
    for (const name of ["width", "height"]) {
        const value = options[name];
        if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
            throw new RangeError(`Chart ${name} must be a positive number of pixels`);
        }
    }
}

/** Axis range fitting every series, rounded out to tick values. */
function fitRange(series, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
        for (const value of s.points[axis]) {
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
    }

    if (min > max) {
        return [0, 1];
    }
    if (min === max) {
        return [min - 1, max + 1];
    }
    const step = tickStep(max - min);
    return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/** Number of ticks for an axis of this length, at most TICK_COUNT. */
function tickCount(length, gap) {
    return Math.max(1, Math.min(TICK_COUNT, Math.floor(length / gap)));
}

/** Tick spacing: 1, 2 or 5 times a power of ten. */
function tickStep(span, count = TICK_COUNT) {
    const raw = span / count;
    const power = 10 ** Math.floor(Math.log10(raw));
    const scaled = raw / power;
    if (scaled < 1.5) {
        return power;
    }
    if (scaled < 3) {
        return 2 * power;
    }
    if (scaled < 7) {
        return 5 * power;
    }
    return 10 * power;
}

/** Tick values within a range. */
function ticks([start, end], count) {
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    if (!(high > low) || !Number.isFinite(high - low)) {
        return [];
    }

    const step = tickStep(high - low, count);
    const first = Math.ceil(low / step);
    const last = Math.floor(high / step);
    const result = [];
    for (let i = first; i <= last; i++) {
        result.push(i * step);
    }
    return result;
}

/** Format a tick without floating-point noise. */
function formatTick(value) {
    return String(Number(value.toPrecision(12)));
}
