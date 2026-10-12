/**
 * A data series to be displayed on the graph.
 * 
 * Owned by the backend and frontend teams.
 * 
 * This object serves as an interface between the backend (parseCSV,
 * randomData) and the frontend (Chart).
 */

import { PointSet } from "./point-set.js";

export class Series {
    /**
     * @param {string} name     Label for the legend.
     * @param {PointSet} points Points sorted by x.
     */
    constructor(name, points) {
        if (typeof name !== "string")
            throw new TypeError("Series name must be a string");
        if (!(points instanceof PointSet))
            throw new TypeError("Series points must be a PointSet");

        this.name = name;
        this.points = points;
    }
}
