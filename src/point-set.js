/**
 * A set of (x, y) points kept sorted by x.
 *
 * Owned by the backend team.
 *
 * Stores each series' points compactly for fast load, sort and draw.
 */

export class PointSet {
    #xs;
    #ys;
    length = 0;
    #sorted = true;

    /** @param {number} capacity Number of points to allocate space for. */
    constructor(capacity = 32) {
        this.#xs = new Float32Array(capacity);
        this.#ys = new Float32Array(capacity);
    }

    /**
     * Build a sorted PointSet from parallel coordinate arrays.
     * @param {ArrayLike<number>} xs
     * @param {ArrayLike<number>} ys
     */
    static fromArrays(xs, ys) {
        if (xs.length !== ys.length)
            throw new RangeError("xs and ys must have the same length");

        const set = new PointSet(xs.length);
        set.#xs.set(xs);
        set.#ys.set(ys);
        set.length = xs.length;
        set.#sorted = false;
        set.sort();
        return set;
    }

    get capacity() {
        return this.#xs.length;
    }

    /** Sorted x coordinates (a view; do not write to it). */
    get xs() {
        return this.#xs.subarray(0, this.length);
    }

    /** y coordinates matching `xs` (a view; do not write to it). */
    get ys() {
        return this.#ys.subarray(0, this.length);
    }

    get start() {
        return this.length ? [this.#xs[0], this.#ys[0]] : null;
    }

    get end() {
        const i = this.length - 1;
        return this.length ? [this.#xs[i], this.#ys[i]] : null;
    }

    /**
     * Append a point without keeping order. Call `sort()` when done.
     * Fixed capacity: throws if the set is full.
     */
    push(x, y) {
        const i = this.length;
        if (i === this.#xs.length)
            throw new RangeError(`PointSet is full (capacity ${i})`);

        this.#xs[i] = x;
        this.#ys[i] = y;
        if (i > 0 && this.#xs[i] < this.#xs[i - 1])
            this.#sorted = false;
        this.length++;
    }

    /** Sort points by x. Stable, and a no-op if already sorted. */
    sort() {
        if (this.#sorted) return;

        const n = this.length;
        const xs = this.#xs;
        const ys = this.#ys;

        // Argsort: sort indices by x, then permute both columns once.
        const order = new Uint32Array(n);
        for (let i = 0; i < n; i++) order[i] = i;
        order.sort((a, b) => xs[a] - xs[b]);

        const nextXs = new Float32Array(xs.length);
        const nextYs = new Float32Array(ys.length);
        for (let i = 0; i < n; i++) {
            nextXs[i] = xs[order[i]];
            nextYs[i] = ys[order[i]];
        }

        this.#xs = nextXs;
        this.#ys = nextYs;
        this.#sorted = true;
    }
}
