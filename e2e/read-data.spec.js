import { expect, test } from "@playwright/test";
import {
    COLORS, applyChanges, findColor, hideLegend, openDemo, uploadCSV, waitForColor,
} from "./helpers.js";

// story 2: read my data clearly (docs/user-stories.md)
// "axes fit every point" isnt tested, you can only see that in the picture

test.beforeEach(async ({ page }) => {
    await openDemo(page);
});

// criteria 1: Chart Type switches between scatter and line
// diagonal.csv is just 2 points, (10, 10) and (90, 90)
// scatter: two dots, the middle between them is empty
// line: a line goes through that middle
test("Chart Type switches between a scatter plot and a line graph", async ({ page }) => {
    await uploadCSV(page, "diagonal.csv");
    await expect(page.locator("#dataset-name")).toHaveText("diagonal.csv");
    await hideLegend(page);

    // both dots are the same color so the middle of all of it is the middle between them
    const middle = await waitForColor(page, COLORS[0]);

    // how much series color is right around the middle.
    // tolerance 80 because the line edges are blended with the white background
    const colorAtMiddle = async () => {
        const found = await findColor(page, COLORS[0], { tolerance: 80, near: middle, radius: 3 });
        return found.count;
    };

    // scatter: nothing in the middle
    expect(await colorAtMiddle()).toBe(0);

    // line: something in the middle now
    await page.locator("#chart-type").selectOption("line");
    await applyChanges(page);
    await expect.poll(colorAtMiddle).toBeGreaterThan(0);

    // and back to scatter
    await page.locator("#chart-type").selectOption("scatter");
    await applyChanges(page);
    await expect.poll(colorAtMiddle).toBe(0);
});

// criteria 3: every series gets its own color
// (the legend part isnt checked, its drawn on the canvas too)
test("each series is drawn in its own color", async ({ page }) => {
    await uploadCSV(page, "two-series.csv");
    await expect(page.locator("#dataset-name")).toHaveText("two-series.csv");
    await hideLegend(page);

    // first series in the first color and second series in the second
    await waitForColor(page, COLORS[0]);
    await waitForColor(page, COLORS[1]);
});
