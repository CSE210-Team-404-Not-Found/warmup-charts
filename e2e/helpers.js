import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";

// the chart is a canvas so the page cant tell us where the points are.
// so we look for the series color in the canvas pixels instead.
// legend gets turned off first because its swatches are the same colors as the points

// same order as COLORS in demo/main.js (series 1, series 2, series 3)
export const COLORS = ["#0072b2", "#d55e00", "#009e73"];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures");
const DATA = path.join(HERE, "..", "data");

// open the demo and wait till the first chart (Random) is up
export async function openDemo(page) {
    await page.goto("/");
    await expect(page.locator("#dataset-name")).toHaveText("Random");
}

// pick a csv with the CSV Input button. our small test files are in e2e/fixtures,
// the sample files the site uses are in data/
// reference: https://playwright.dev/docs/api/class-locator#locator-set-input-files
export async function uploadCSV(page, name, { fromData = false } = {}) {
    let folder = FIXTURES;
    if (fromData) {
        folder = DATA;
    }
    await page.locator("#csv-input").setInputFiles(path.join(folder, name));
}

// click Apply Changes and wait for the success message, that means it redrew
export async function applyChanges(page) {
    await page.locator("#apply-changes").click();
    await expect(page.locator("#chart-status")).toHaveText("Plot changes applied successfully.");
}

// uncheck Legend and apply so only the data points have color
export async function hideLegend(page) {
    await page.locator("#show-legend").uncheck();
    await applyChanges(page);
}

// look for a color on the chart. gives back how many pixels matched and the
// middle of them in page coordinates (thats where the mouse should go).
// with near and radius it only looks in a small box around that spot
// tolerance is how far off each of r, g, b can be and still count
export function findColor(page, color, { tolerance = 0, near = null, radius = 0 } = {}) {
    return page.locator("#chart").evaluate(searchCanvas, { color, tolerance, near, radius });
}

// keep checking till the color shows up, the chart draws on the next frame
// (and for big files the workers finish later) so it wont be there right away
// reference: https://playwright.dev/docs/test-assertions#expectpoll
export async function waitForColor(page, color, { timeout = 30_000 } = {}) {
    await expect.poll(async () => {
        const found = await findColor(page, color);
        return found.count;
    }, { message: `waiting for ${color} on the chart`, timeout }).toBeGreaterThan(0);

    return findColor(page, color);
}

// this one runs inside the browser not in node. playwright sends it over as
// text so it cant use anything from outside this function
function searchCanvas(canvas, { color, tolerance, near, radius }) {
    // hex to rgb, e.g. "#0072b2" -> 0, 114, 178
    const target = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
    ];

    // the canvas bitmap can be bigger than it looks on screen (pixel ratio)
    // so css pixels get multiplied by ratio to get bitmap pixels
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;

    // which part of the canvas to look at, whole thing unless near is given
    let left = 0;
    let top = 0;
    let right = canvas.width;
    let bottom = canvas.height;
    if (near) {
        left = Math.max(0, Math.floor((near.x - rect.left - radius) * ratio));
        top = Math.max(0, Math.floor((near.y - rect.top - radius) * ratio));
        right = Math.min(canvas.width, Math.ceil((near.x - rect.left + radius) * ratio));
        bottom = Math.min(canvas.height, Math.ceil((near.y - rect.top + radius) * ratio));
    }
    const width = right - left;
    const height = bottom - top;

    // every pixel is 4 numbers in a row: r, g, b, a
    // reference: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData
    const pixels = canvas.getContext("2d").getImageData(left, top, width, height).data;

    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const closeR = Math.abs(pixels[i] - target[0]) <= tolerance;
        const closeG = Math.abs(pixels[i + 1] - target[1]) <= tolerance;
        const closeB = Math.abs(pixels[i + 2] - target[2]) <= tolerance;

        if (closeR && closeG && closeB) {
            // pixel number i / 4, then row and column from that
            const pixel = i / 4;
            count++;
            sumX += pixel % width;
            sumY += Math.floor(pixel / width);
        }
    }

    if (count === 0) {
        return { count };
    }

    // average spot of the matches, back to css pixels and moved onto the page
    // +0.5 so its the middle of the pixel and not its corner
    return {
        count,
        x: rect.left + (left + sumX / count + 0.5) / ratio,
        y: rect.top + (top + sumY / count + 0.5) / ratio,
    };
}
