import { defineConfig, devices } from "@playwright/test";

// settings for the e2e tests in e2e/, see the README "E2E tests" part
// reference: https://playwright.dev/docs/test-configuration

const PORT = 4173;

// CircleCI sets CI=true. there we also write a junit file so CircleCI can show results
let reporter = "list";
if (process.env.CI) {
    reporter = [["list"], ["junit", { outputFile: "test-results/e2e.xml" }]];
}

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    // CircleCI's machine has 2 cpus, more browsers than that just slows everything down
    workers: process.env.CI ? 2 : undefined,
    // a test.only left in by mistake would skip everything else, so fail on CI
    forbidOnly: Boolean(process.env.CI),
    reporter,
    use: {
        baseURL: `http://localhost:${PORT}`,
        // keep a trace (steps + screenshots) only when a test fails
        trace: "retain-on-failure",
    },
    // only chrome for now
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    // starts our server before the tests, reuses one thats already running locally
    webServer: {
        command: `node e2e/server.js ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
    },
});
