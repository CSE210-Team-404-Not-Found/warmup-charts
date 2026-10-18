/**
 * Worker-owned point chunks and reusable OffscreenCanvas for scatter rendering.
 */
const data = new Map();
let canvas;
let ctx;

/**
 * Handles commands from the main thread to clear stored data, load point
 * chunks, or render a chunk and return its bitmap.
 */
self.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "clear-data") {
        data.clear();
        return;
    }
    if (message.type === "set-data") {
        data.set(message.key, {
            xs: new Float32Array(message.xs),
            ys: new Float32Array(message.ys),
        });
        return;
    }
    if (message.type === "render") {
        render(message);
    }
});

/**
 * Renders a stored chunk as a white mask and sends its bitmap to the scheduler.
 *
 * @param {{requestId: number, key: string, width: number, height: number,
 *     pixelWidth: number, pixelHeight: number, ratio: number, pointRadius: number,
 *     left: number, right: number, top: number, bottom: number,
 *     x0: number, x1: number, y0: number, y1: number}} message Render request
 *     containing the chunk key, canvas dimensions, scale, point radius, and plot bounds.
 * @returns {void}
 */
function render(message) {
    try {
        // create a reusable OffscreenCanvas and context if it doesn't exist
        if (!canvas) {
            canvas = new OffscreenCanvas(message.pixelWidth, message.pixelHeight);
            ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Could not create a worker canvas context.");
            }
        }
        if (canvas.width !== message.pixelWidth || canvas.height !== message.pixelHeight) {
            canvas.width = message.pixelWidth;
            canvas.height = message.pixelHeight;
        }
        // retrieve the chunk's point data from memory
        const points = data.get(message.key);
        if (!points) {
            throw new Error(`Worker data is missing for chunk ${message.key}.`);
        }
        const { xs, ys } = points;
        // draw chunk
        ctx.setTransform(message.ratio, 0, 0, message.ratio, 0, 0);
        ctx.clearRect(0, 0, message.width, message.height);
        ctx.save();
        ctx.beginPath();
        const pad = message.pointRadius + 1;
        ctx.rect(message.left - pad, message.top - pad,
            message.right - message.left + 2 * pad, message.bottom - message.top + 2 * pad);
        ctx.clip();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        for (let i = 0; i < xs.length; i++) {
            const px = message.left + (xs[i] - message.x0) / (message.x1 - message.x0)
                * (message.right - message.left);
            const py = message.bottom - (ys[i] - message.y0) / (message.y1 - message.y0)
                * (message.bottom - message.top);
            ctx.moveTo(px + message.pointRadius, py);
            ctx.arc(px, py, message.pointRadius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
        // Send the rendered layer as bitmap back to scheduler
        const bitmap = canvas.transferToImageBitmap();
        self.postMessage({
            requestId: message.requestId,
            bitmap,
        }, [bitmap]);
    } catch (error) {
        self.postMessage({
            requestId: message.requestId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
