import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test as base } from "@playwright/test";

// records which lines of the page's scripts each test ran, so Sonar can count
// the browser tests towards coverage next to the Node tests (ADR-0014).
// Chromium reports it per script as byte ranges. each test writes its own file
// under test-results/coverage/ and e2e/coverage-to-lcov.js merges them into
// one lcov file once the whole run is over.
// reference: https://playwright.dev/docs/api/class-coverage

export const COVERAGE_DIR = "coverage";

export const test = base.extend({
    page: async ({ page, browserName }, use, testInfo) => {
        // only Chromium has the V8 coverage API
        const record = browserName === "chromium";
        if (record) {
            // keep counting across page.goto calls inside one test
            await page.coverage.startJSCoverage({ resetOnNavigation: false });
        }
        await use(page);
        if (record) {
            const entries = await page.coverage.stopJSCoverage();
            const dir = path.join(testInfo.project.outputDir, COVERAGE_DIR);
            await mkdir(dir, { recursive: true });
            const file = `${testInfo.testId}-${testInfo.retry}.json`;
            await writeFile(path.join(dir, file), JSON.stringify(entries));
        }
    },
});

export { expect } from "@playwright/test";
