/**
 * A chart drawn on one canvas.
 *
 * Owned by the frontend team.
 *
 * Each Chart keeps its own series, colors, and options, and redraws itself
 * when any of them or its size changes.
 */

import { Series } from "./series.js";

const FONT = "13px sans-serif";
const LABEL_FONT = "14px sans-serif";
const TEXT_COLOR = "#222";
const AXIS_COLOR = "#666";

const MARGIN = { left: 72, right: 24, top: 16, bottom: 64 };
const LEGEND_ROW = 24;
const LEGEND_SWATCH = 10;
const POINT_RADIUS = 3;
const TICK_COUNT = 5;

export class Chart {
    #canvas;
    #ctx;
    #series = [];
    #colors = [];
    #options;
    #observer;
    #frame = 0;

    /**
     * @param {HTMLCanvasElement} canvas  The canvas this chart draws on. Sized by CSS.
     * @param {Object} [options]
     * @param {boolean} [options.showLine]  Connect points with lines.
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

        this.#canvas = canvas;
        this.#ctx = canvas.getContext("2d");
        this.#options = {
            showLine: false, xRange: null, yRange: null, xLabel: "", yLabel: "", ...options,
        };

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
        this.requestDraw();
    }

    get colors() {
        return [...this.#colors];
    }

    /** Merge new options in and redraw. */
    setOptions(options) {
        this.#options = { ...this.#options, ...options };
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

        const legend = this.#layoutLegend(width);
        const transform = this.#makeTransform(width, height, legend.height);
        this.#drawAxes(transform);

        const pad = POINT_RADIUS + 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(transform.left - pad, transform.top - pad,
            transform.right - transform.left + 2 * pad, transform.bottom - transform.top + 2 * pad);
        ctx.clip();
        this.#series.forEach((s, i) => this.#drawSeries(transform, s, this.#colors[i]));
        ctx.restore();

        this.#drawLegend(legend);
    }

    /** Stop observing the canvas and cancel any pending draw. */
    destroy() {
        this.#observer.disconnect();
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
    }

    /** Size the bitmap to the displayed size, accounting for devicePixelRatio. */
    #resize() {
        const canvas = this.#canvas;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);

        // Keep an attribute-sized canvas from growing with the bitmap.
        if (canvas.clientWidth !== width) {
            canvas.style.width = `${width}px`;
        }
        if (canvas.clientHeight !== height) {
            canvas.style.height = `${height}px`;
        }

        // Resizing clears the canvas, so draw now.
        this.draw();
    }

    /** Data-to-pixel transform, using options.xRange / yRange. */
    #makeTransform(width, height, legendHeight) {
        const left = MARGIN.left;
        const right = width - MARGIN.right;
        const top = MARGIN.top + legendHeight;
        const bottom = height - MARGIN.bottom;
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
    #drawAxes(transform) {
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
        for (const tick of ticks(transform.xRange)) {
            const px = transform.toPx(tick);
            ctx.beginPath();
            ctx.moveTo(px, bottom);
            ctx.lineTo(px, bottom + 5);
            ctx.stroke();
            ctx.fillText(formatTick(tick), px, bottom + 8);
        }

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (const tick of ticks(transform.yRange)) {
            const py = transform.toPy(tick);
            ctx.beginPath();
            ctx.moveTo(left - 5, py);
            ctx.lineTo(left, py);
            ctx.stroke();
            ctx.fillText(formatTick(tick), left - 8, py, MARGIN.left - 30);
        }

        const { xLabel, yLabel } = this.#options;
        ctx.font = LABEL_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(xLabel, (left + right) / 2, bottom + MARGIN.bottom - 8, right - left);
        ctx.save();
        ctx.translate(16, (top + bottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = "middle";
        ctx.fillText(yLabel, 0, 0, bottom - top);
        ctx.restore();
    }

    /** Points, plus lines when options.showLine is set. */
    #drawSeries(transform, series, color) {
        const ctx = this.#ctx;
        const { xs, ys, length } = series.points;
        if (!length) {
            return;
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        if (this.#options.showLine) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(transform.toPx(xs[0]), transform.toPy(ys[0]));
            for (let i = 1; i < length; i++) {
                ctx.lineTo(transform.toPx(xs[i]), transform.toPy(ys[i]));
            }
            ctx.stroke();
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
        const maxTextWidth = width - MARGIN.left - MARGIN.right - LEGEND_SWATCH - 8;
        let x = MARGIN.left;
        let y = MARGIN.top + LEGEND_ROW / 2;
        this.#series.forEach((s, i) => {
            const textWidth = Math.min(ctx.measureText(s.name).width, maxTextWidth);
            const entryWidth = LEGEND_SWATCH + 8 + textWidth + 24;
            if (x > MARGIN.left && x + entryWidth > width - MARGIN.right) {
                x = MARGIN.left;
                y += LEGEND_ROW;
            }
            entries.push({ name: s.name, color: this.#colors[i], x, y, textWidth });
            x += entryWidth;
        });

        const height = entries.length ? y - MARGIN.top + LEGEND_ROW / 2 : 0;
        return { entries, height };
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

/** Tick spacing: 1, 2 or 5 times a power of ten. */
function tickStep(span) {
    const raw = span / TICK_COUNT;
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
function ticks([start, end]) {
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    if (!(high > low) || !Number.isFinite(high - low)) {
        return [];
    }

    const step = tickStep(high - low);
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
