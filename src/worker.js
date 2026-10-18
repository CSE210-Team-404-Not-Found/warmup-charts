/**
 * Worker-owned point chunks and reusable OffscreenCanvas for scatter rendering.
 */
const data = new Map();
let canvas;
let ctx;

// Keep data in the worker between draws so resize and option changes send only render settings.
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

/** Draw one chunk as an opaque mask and return it for main-thread tinting. */
function render(message) {
    try {
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

        const points = data.get(message.key);
        if (!points) {
            throw new Error(`Worker data is missing for chunk ${message.key}.`);
        }
        const { xs, ys } = points;
        ctx.setTransform(message.ratio, 0, 0, message.ratio, 0, 0);
        ctx.clearRect(0, 0, message.width, message.height);
        ctx.save();
        ctx.beginPath();
        // Match the chart's clipping margin so edge points remain visible.
        const pad = message.pointRadius + 1;
        ctx.rect(message.left - pad, message.top - pad,
            message.right - message.left + 2 * pad, message.bottom - message.top + 2 * pad);
        ctx.clip();
        // A white mask preserves coverage and antialiasing before the chart applies its color.
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

        // Transfer the rendered layer instead of copying its pixel data through a message.
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
