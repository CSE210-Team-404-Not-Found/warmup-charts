import { expect, test } from "@playwright/test";
import { COLORS, hideLegend, openDemo, uploadCSV, waitForColor } from "./helpers.js";

// story 1: load my own CSV file (docs/user-stories.md)

test.beforeEach(async ({ page }) => {
    await openDemo(page);
});

// criteria 1: chosen file gets drawn and its name becomes the title
test("a chosen CSV is drawn with its file name as the title", async ({ page }) => {
    await uploadCSV(page, "single-series.csv", { fromData: true });

    await expect(page.locator("#dataset-name")).toHaveText("single-series.csv");
    // no warning, file is clean
    await expect(page.locator("#message")).toBeHidden();
    await hideLegend(page);
    // first series color on the canvas means the points got drawn
    await waitForColor(page, COLORS[0]);
});

// criteria 2: header names the series and every column after x is its own series
// two-series.csv has Height at (10, 10) and Weight at (90, 90), hover each one
// and the tooltip should say the header name
test("each column after x becomes a series named by the header", async ({ page }) => {
    await uploadCSV(page, "two-series.csv");
    await expect(page.locator("#dataset-name")).toHaveText("two-series.csv");
    await hideLegend(page);

    const tooltip = page.locator("#tooltip");

    const height = await waitForColor(page, COLORS[0]);
    await page.mouse.move(height.x, height.y);
    await expect(tooltip).toHaveText("Height: (10, 10)");

    const weight = await waitForColor(page, COLORS[1]);
    await page.mouse.move(weight.x, weight.y);
    await expect(tooltip).toHaveText("Weight: (90, 90)");
});

// criteria 3: bad file shows an error and the old chart stays.
// no-header.csv starts with numbers so parseCSV throws "header is missing"
test("a file without a header shows why and keeps the previous chart", async ({ page }) => {
    // load a good one first so there is a chart to keep
    await uploadCSV(page, "single-series.csv", { fromData: true });
    await expect(page.locator("#dataset-name")).toHaveText("single-series.csv");
    await hideLegend(page);
    await waitForColor(page, COLORS[0]);

    await uploadCSV(page, "no-header.csv");

    await expect(page.locator("#message")).toHaveText(
        "Could not load no-header.csv: CSV header is missing: the first row is all numbers.");
    // title and points are still from single-series.csv
    await expect(page.locator("#dataset-name")).toHaveText("single-series.csv");
    await waitForColor(page, COLORS[0]);
});
