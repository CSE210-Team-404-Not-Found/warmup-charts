import { readFile } from "node:fs/promises";
import { expect, test } from "./coverage.js";
import { applyChanges, openDemo } from "./helpers.js";

// story 4: customize the chart and save it (docs/user-stories.md)

// every png file starts with these 8 bytes
// reference: https://www.w3.org/TR/png/#5PNG-file-signature
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

test.beforeEach(async ({ page }) => {
    await openDemo(page);
});

// criteria 1: nothing changes till Apply Changes, then the success message shows.
// labels and the Axes checkbox are drawn on the canvas so we cant read them,
// the size we can check (offsetWidth includes the 1px border, so it matches the box)
test("options take effect only when Apply Changes is clicked", async ({ page }) => {
    const chart = page.locator("#chart");
    const status = page.locator("#chart-status");

    await page.locator("#chart-width").fill("500");
    await page.locator("#chart-height").fill("300");
    await page.locator("#x-axis").fill("Time");
    await page.locator("#show-axes").uncheck();

    // not applied yet, still the default 800 wide
    await expect(chart).toHaveJSProperty("offsetWidth", 800);
    await expect(status).toBeEmpty();

    await applyChanges(page);
    await expect(chart).toHaveJSProperty("offsetWidth", 500);
    await expect(chart).toHaveJSProperty("offsetHeight", 300);

    // editing again clears the message till the next Apply
    await page.locator("#y-axis").fill("Temperature");
    await expect(status).toBeEmpty();
});

// criteria 2: empty, zero or negative width isnt applied and the browser points to the box.
// one test per value so if one breaks you see which
for (const value of ["", "0", "-5"]) {
    test(`a width of "${value}" isn't applied`, async ({ page }) => {
        const width = page.locator("#chart-width");
        await width.fill(value);
        await page.locator("#apply-changes").click();

        // browser focuses the bad box and marks it invalid
        await expect(width).toBeFocused();
        const valid = await width.evaluate((input) => input.validity.valid);
        expect(valid).toBe(false);

        // and nothing got applied
        await expect(page.locator("#chart-status")).toBeEmpty();
        await expect(page.locator("#chart")).toHaveJSProperty("offsetWidth", 800);
    });
}

// criteria 3: Download PNG saves the chart named after the dataset, e.g. Multi-series.png
// reference: https://playwright.dev/docs/downloads
test("Download PNG saves the chart named after the dataset", async ({ page }) => {
    await page.locator("#test-sets").selectOption("multi-series");
    await expect(page.locator("#dataset-name")).toHaveText("Multi-series");

    // start waiting for the download before clicking so we dont miss it
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#download-png").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Multi-series.png");

    // check its really a png and not some empty file
    const file = await readFile(await download.path());
    const firstBytes = [];
    for (let i = 0; i < 8; i++) {
        firstBytes.push(file[i]);
    }
    expect(firstBytes).toEqual(PNG_SIGNATURE);
});
