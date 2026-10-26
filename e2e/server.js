import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// tiny file server for the e2e tests so they only need node (no python).
// playwright.config.js starts it, or run it yourself: node e2e/server.js 4173

// project folder, one up from e2e/
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 4173;

// browsers wont load module scripts unless .js comes back as javascript
const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".csv": "text/csv",
    ".png": "image/png",
    ".json": "application/json",
};

createServer(async (request, response) => {
    // "/" means index.html, e.g. "/" -> "/index.html", "/demo/" -> "/demo/index.html"
    let page = new URL(request.url, "http://localhost").pathname;
    if (page.endsWith("/")) {
        page += "index.html";
    }
    const file = path.join(ROOT, decodeURIComponent(page));

    try {
        // dont hand out anything outside the project (like "/../../secret")
        if (!file.startsWith(ROOT + path.sep)) {
            throw new Error("outside the project");
        }
        const body = await readFile(file);
        const type = TYPES[path.extname(file)] ?? "application/octet-stream";
        response.writeHead(200, { "Content-Type": type });
        response.end(body);
    } catch {
        // missing file or not allowed, either way 404
        response.writeHead(404);
        response.end("Not found");
    }
}).listen(PORT);
