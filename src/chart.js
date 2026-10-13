/**
 * A chart drawn on one canvas.
 *
 * Owned by the frontend team.
 *
 * Each Chart keeps its own series, colors, and options, and redraws itself
 * when any of them or its size changes.
 */

import { Series } from "./series.js";

export class Chart {
    #canvas;
    #ctx;
    #series = [];
    #colors = [];
    #options;
    #observer;
    #frame = 0;

    /**
     * @param {HTMLCanvasElement} canvas  The canvas this chart draws on.
     * @param {Object} [options]
     * @param {boolean} [options.showLine]  Connect points with lines.
     * @param {[number, number]} [options.xRange]  Fixed x axis start and end.
     * @param {[number, number]} [options.yRange]  Fixed y axis start and end.
     */
    constructor(canvas, options = {}) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new TypeError("Chart needs a <canvas> element");
        }

        this.#canvas = canvas;
        this.#ctx = canvas.getContext("2d");
        this.#options = { showLine: false, xRange: null, yRange: null, ...options };

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
        const transform = this.#makeTransform();

        ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        this.#drawAxes(transform);
        this.#series.forEach((s, i) => this.#drawSeries(transform, s, this.#colors[i]));
        this.#drawLegend();
    }

    /** Stop observing the canvas and cancel any pending draw. */
    destroy() {
        this.#observer.disconnect();
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
    }

    /**
     * Called when the canvas's displayed size changes.
     * TODO(frontend): size the backing store (canvas.width/height) to the
     * displayed size, accounting for devicePixelRatio.
     */
    #resize() {
        this.requestDraw();
    }

    /**
     * Data-to-pixel transform, using options.xRange / yRange.
     * TODO(frontend): implement.
     * @returns {{ toPx: (x: number) => number, toPy: (y: number) => number }}
     */
    #makeTransform() {
        return { toPx: (x) => x, toPy: (y) => y };
    }

    /** TODO(frontend): axes and axis labels. */
    #drawAxes(transform) {
        void transform;
    }

    /** TODO(frontend): points, plus lines when options.showLine is set. */
    #drawSeries(transform, series, color) {
        void transform;
        void series;
        void color;
    }

    /** TODO(frontend): legend, using each series' name and color. */
    #drawLegend() {}
}
