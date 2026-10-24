/**
 * A set of (x, y) points, sorted by x on request.
 *
 * Owned by the backend team.
 *
 * Stores each series' points compactly for fast load, sort and draw.
 */

const INSERTION_SORT_MAX = 16;

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
     * Build a PointSet from parallel coordinate arrays, in their order.
     * @param {ArrayLike<number>} xs
     * @param {ArrayLike<number>} ys
     */
    static fromArrays(xs, ys) {
        if (xs.length !== ys.length) {
            throw new RangeError("xs and ys must have the same length");
        }

        const set = new PointSet(xs.length);
        set.#xs.set(xs);
        set.#ys.set(ys);
        set.length = xs.length;
        for (let i = 1; i < set.length && set.#sorted; i++) {
            set.#sorted = !less(set.#xs, set.#ys, i, i - 1);
        }
        return set;
    }

    get capacity() {
        return this.#xs.length;
    }

    get sorted() {
        return this.#sorted;
    }

    /** x coordinates, in x order after `sort()` (a view; do not write to it). */
    get xs() {
        return this.#xs.subarray(0, this.length);
    }

    /** y coordinates matching `xs` (a view; do not write to it). */
    get ys() {
        return this.#ys.subarray(0, this.length);
    }

    /** First point in sort order, without sorting. */
    get start() {
        if (!this.length) {
            return null;
        }
        let first = 0;
        if (!this.#sorted) {
            for (let i = 1; i < this.length; i++) {
                if (less(this.#xs, this.#ys, i, first)) {
                    first = i;
                }
            }
        }
        return [this.#xs[first], this.#ys[first]];
    }

    /** Last point in sort order, without sorting. */
    get end() {
        if (!this.length) {
            return null;
        }
        let last = this.length - 1;
        if (!this.#sorted) {
            for (let i = 0; i < this.length; i++) {
                if (less(this.#xs, this.#ys, last, i)) {
                    last = i;
                }
            }
        }
        return [this.#xs[last], this.#ys[last]];
    }

    /**
     * Append a point without keeping order.
     * Fixed capacity: throws if the set is full.
     */
    push(x, y) {
        const i = this.length;
        if (i === this.#xs.length) {
            throw new RangeError(`PointSet is full (capacity ${i})`);
        }

        this.#xs[i] = x;
        this.#ys[i] = y;
        if (i > 0 && less(this.#xs, this.#ys, i, i - 1)) {
            this.#sorted = false;
        }
        this.length++;
    }

    /**
     * Sort points by x, then y, in place. A no-op if already sorted.
     * Introsort: quicksort, with heapsort past a depth limit.
     */
    sort() {
        if (this.#sorted) {
            return;
        }

        const depth = 2 * Math.floor(Math.log2(this.length));
        introsort(this.#xs, this.#ys, 0, this.length - 1, depth);
        this.#sorted = true;
    }
}

function less(xs, ys, i, j) {
    return xs[i] < xs[j] || (xs[i] === xs[j] && ys[i] < ys[j]);
}

function swap(xs, ys, i, j) {
    const x = xs[i];
    xs[i] = xs[j];
    xs[j] = x;
    const y = ys[i];
    ys[i] = ys[j];
    ys[j] = y;
}

/** Sort xs/ys[lo..hi] (inclusive). */
function introsort(xs, ys, lo, hi, depth) {
    while (hi - lo > INSERTION_SORT_MAX) {
        if (depth-- === 0) {
            heapsort(xs, ys, lo, hi);
            return;
        }
        const mid = partition(xs, ys, lo, hi);
        // Recurse into the smaller side, so the stack stays O(log n).
        if (mid - lo < hi - mid) {
            introsort(xs, ys, lo, mid, depth);
            lo = mid + 1;
        } else {
            introsort(xs, ys, mid + 1, hi, depth);
            hi = mid;
        }
    }
    insertionSort(xs, ys, lo, hi);
}

/** Hoare partition around a median of three. Returns the end of the low side. */
function partition(xs, ys, lo, hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (less(xs, ys, mid, lo)) {
        swap(xs, ys, mid, lo);
    }
    if (less(xs, ys, hi, lo)) {
        swap(xs, ys, hi, lo);
    }
    if (less(xs, ys, hi, mid)) {
        swap(xs, ys, hi, mid);
    }

    const px = xs[mid];
    const py = ys[mid];
    let i = lo - 1;
    let j = hi + 1;
    while (true) {
        do {
            i++;
        } while (xs[i] < px || (xs[i] === px && ys[i] < py));
        do {
            j--;
        } while (px < xs[j] || (px === xs[j] && py < ys[j]));
        if (i >= j) {
            return j;
        }
        swap(xs, ys, i, j);
    }
}

function heapsort(xs, ys, lo, hi) {
    const n = hi - lo + 1;
    for (let root = (n >> 1) - 1; root >= 0; root--) {
        siftDown(xs, ys, lo, root, n);
    }
    for (let end = n - 1; end > 0; end--) {
        swap(xs, ys, lo, lo + end);
        siftDown(xs, ys, lo, 0, end);
    }
}

function siftDown(xs, ys, lo, root, n) {
    while (true) {
        let child = 2 * root + 1;
        if (child >= n) {
            return;
        }
        if (child + 1 < n && less(xs, ys, lo + child, lo + child + 1)) {
            child++;
        }
        if (!less(xs, ys, lo + root, lo + child)) {
            return;
        }
        swap(xs, ys, lo + root, lo + child);
        root = child;
    }
}

function insertionSort(xs, ys, lo, hi) {
    for (let i = lo + 1; i <= hi; i++) {
        const x = xs[i];
        const y = ys[i];
        let j = i - 1;
        while (j >= lo && (xs[j] > x || (xs[j] === x && ys[j] > y))) {
            xs[j + 1] = xs[j];
            ys[j + 1] = ys[j];
            j--;
        }
        xs[j + 1] = x;
        ys[j + 1] = y;
    }
}
