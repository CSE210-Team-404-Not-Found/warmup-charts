import { expect, test } from "@playwright/test";
import { COLORS, hideLegend, openDemo, waitForColor } from "./helpers.js";

// story 5: chart a million points without freezing the page (docs/user-stories.md)
// "draws all of its points" cant be counted on a canvas, so these check it loads,
// draws both series and doesnt error. the point counts are in test/capacity.test.js

// Million Rows is a 25 MB file with 2,000,000 points so give it more time.
// also run these 3 one after another, all at once they fight over the cpu and time out
test.setTimeout(150_000);
test.describe.configure({ mode: "default" });

const BIG_FILE_WAIT = 60_000;

// load Million Rows from the Dataset dropdown and wait till both series show up
async function showMillionRows(page) {
    await hideLegend(page);
    await page.locator("#test-sets").selectOption("million-rows");
    await expect(page.locator("#dataset-name")).toHaveText("Million Rows", {
        timeout: BIG_FILE_WAIT,
    });
    await waitForColor(page, COLORS[0], { timeout: BIG_FILE_WAIT });
    await waitForColor(page, COLORS[1], { timeout: BIG_FILE_WAIT });
}

// save every console error so a test can check there were none
function collectErrors(page) {
    const errors = [];
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(message.text());
        }
    });
    return errors;
}

// criteria 1: 18,000+ points in a scatter plot -> web workers, smaller -> main thread
// reference: https://playwright.dev/docs/api/class-page#page-workers
test("only big scatter plots are drawn by web workers", async ({ page }) => {
    await openDemo(page);

    // Random is 2 series of 10 points, way under 18,000, so no workers
    expect(page.workers()).toHaveLength(0);

    await showMillionRows(page);
    expect(page.workers().length).toBeGreaterThan(0);
});

// criteria 2: Million Rows draws with no errors
test("the Million Rows sample draws without errors", async ({ page }) => {
    const errors = collectErrors(page);
    page.on("pageerror", (error) => errors.push(error.message));

    await openDemo(page);
    await showMillionRows(page);

    // no warning (nothing skipped or rounded) and nothing in the console
    await expect(page.locator("#message")).toBeHidden();
    expect(errors).toEqual([]);
});

// criteria 3: no web workers in the browser -> still draws, just on the main thread.
// we delete Worker before the page loads to fake an old browser
// reference: https://playwright.dev/docs/api/class-page#page-add-init-script
test("without web workers the chart still draws", async ({ page }) => {
    await page.addInitScript(() => {
        delete window.Worker;
    });
    const errors = collectErrors(page);

    await openDemo(page);
    await showMillionRows(page);

    expect(page.workers()).toHaveLength(0);
    // chart.js logs this once when it falls back, thats the only error we expect
    expect(errors).toEqual([expect.stringContaining("Worker rendering could not start")]);
});
