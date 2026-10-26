import { expect, test } from "./coverage.js";
import { COLORS, hideLegend, openDemo, uploadCSV, waitForColor } from "./helpers.js";

// story 3: see a point's exact value (docs/user-stories.md)
// tooltip text is "<series name>: (x, y)", from demo/main.js

test.beforeEach(async ({ page }) => {
    await openDemo(page);
});

// criteria 1: hovering a point shows series name, x and y
test("hovering a point shows its series and values", async ({ page }) => {
    await uploadCSV(page, "two-series.csv");
    await expect(page.locator("#dataset-name")).toHaveText("two-series.csv");
    await hideLegend(page);

    const tooltip = page.locator("#tooltip");
    const height = await waitForColor(page, COLORS[0]);
    const weight = await waitForColor(page, COLORS[1]);

    await page.mouse.move(height.x, height.y);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("Height: (10, 10)");

    // Halfway between the two points is far from both so no tooltip.
    await page.mouse.move((height.x + weight.x) / 2, (height.y + weight.y) / 2);
    await expect(tooltip).toBeHidden();
});

// Criteria 1 again: the "within 7 pixels" part.
// 5px away should still show it, 10px away shouldnt
test("the tooltip shows within 7 pixels of a point", async ({ page }) => {
    await uploadCSV(page, "two-series.csv");
    await expect(page.locator("#dataset-name")).toHaveText("two-series.csv");
    await hideLegend(page);

    const tooltip = page.locator("#tooltip");
    const height = await waitForColor(page, COLORS[0]);

    await page.mouse.move(height.x + 5, height.y);
    await expect(tooltip).toHaveText("Height: (10, 10)");

    await page.mouse.move(height.x + 10, height.y);
    await expect(tooltip).toBeHidden();
});

// criteria 2: closest point wins, tooltip hides when the mouse leaves the chart
// close-points.csv has Left at (50, 50) and Right at (52, 50), about 14px apart.
// Edges is only there so the axes go 0 to 100
test("the closest point wins, and the tooltip hides off the chart", async ({ page }) => {
    await uploadCSV(page, "close-points.csv");
    await expect(page.locator("#dataset-name")).toHaveText("close-points.csv");
    await hideLegend(page);

    const tooltip = page.locator("#tooltip");
    const left = await waitForColor(page, COLORS[0]);
    const right = await waitForColor(page, COLORS[1]);
    const gap = right.x - left.x;

    // a quarter of the way from Left, closer to Left
    await page.mouse.move(left.x + gap * 0.25, left.y);
    await expect(tooltip).toHaveText("Left: (50, 50)");

    // three quarters of the way, closer to Right
    await page.mouse.move(left.x + gap * 0.75, left.y);
    await expect(tooltip).toHaveText("Right: (52, 50)");

    // top left corner of the page, off the chart
    await page.mouse.move(1, 1);
    await expect(tooltip).toBeHidden();
});
