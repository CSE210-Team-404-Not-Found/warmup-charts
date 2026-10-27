import { access, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import v8toIstanbul from "v8-to-istanbul";
import { COVERAGE_DIR } from "./coverage.js";

// turns the V8 coverage that e2e/coverage.js saved for each test into one lcov
// file, test-results/e2e-lcov.info. Sonar reads it next to the Node tests'
// lcov.info (see sonar-project.properties). playwright.config.js runs this as
// globalTeardown, once, after every test has finished.
// reference: https://playwright.dev/docs/test-global-setup-teardown

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LCOV = "e2e-lcov.info";

export default async function writeLcov(config) {
    const outputDirs = new Set(config.projects.map((project) => project.outputDir));
    for (const outputDir of outputDirs) {
        const rawDir = path.join(outputDir, COVERAGE_DIR);
        const hits = await collect(rawDir);
        const target = path.join(outputDir, LCOV);
        await writeFile(target, lcov(hits));
        await rm(rawDir, { recursive: true, force: true });
        console.log(`e2e coverage: ${hits.size} scripts in ${path.relative(ROOT, target)}`);
    }
}

// read every test's file and add up the counts per script and line
async function collect(rawDir) {
    const hits = new Map();
    for (const name of await readdir(rawDir).catch(() => [])) {
        const entries = JSON.parse(await readFile(path.join(rawDir, name), "utf8"));
        for (const entry of entries) {
            const script = await linesOf(entry);
            if (script) {
                const lines = hits.get(script.file) ?? new Map();
                for (const [line, count] of script.lines) {
                    lines.set(line, (lines.get(line) ?? 0) + count);
                }
                hits.set(script.file, lines);
            }
        }
    }
    return hits;
}

// line counts for one script the page loaded from e2e/server.js, such as
// http://localhost:4173/src/chart.js. anything else (inline scripts,
// Playwright's own) gives null
async function linesOf(entry) {
    if (!entry.url.startsWith("http")) {
        return null;
    }
    const file = path.join(ROOT, decodeURIComponent(new URL(entry.url).pathname));
    const inProject = file.startsWith(ROOT + path.sep) && file.endsWith(".js");
    if (!inProject || !await exists(file)) {
        return null;
    }
    // the byte ranges refer to the text the browser got, so convert against
    // that and not against the file on disk
    const source = entry.source ?? await readFile(file, "utf8");
    const converter = v8toIstanbul(file, 0, { source });
    await converter.load();
    converter.applyCoverage(entry.functions);
    const [data] = Object.values(converter.toIstanbul());
    converter.destroy();
    const lines = new Map();
    for (const [key, statement] of Object.entries(data.statementMap)) {
        lines.set(statement.start.line, data.s[key]);
    }
    return { file: path.relative(ROOT, file).split(path.sep).join("/"), lines };
}

function exists(file) {
    return access(file).then(() => true, () => false);
}

// the lcov text format: one record per file, DA:<line>,<count> per line
// reference: https://github.com/linux-test-project/lcov/blob/master/man/geninfo.1
function lcov(hits) {
    const out = [];
    const files = [...hits.keys()].sort((a, b) => a.localeCompare(b));
    for (const file of files) {
        const lines = [...hits.get(file)].sort((a, b) => a[0] - b[0]);
        out.push("TN:", `SF:${file}`);
        for (const [line, count] of lines) {
            out.push(`DA:${line},${count}`);
        }
        const covered = lines.filter(([, count]) => count > 0).length;
        out.push(`LF:${lines.length}`, `LH:${covered}`, "end_of_record");
    }
    return `${out.join("\n")}\n`;
}
