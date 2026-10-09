/*
 * Regression runner.
 *
 * Starts the API server on PORT (default 4319) if one is not already listening,
 * runs the selected regression suites as child processes, then stops the server
 * it started. Any externally-running server on PORT is reused and left running.
 *
 * Usage:
 *   node tests/regression/run.js            # all suites
 *   node tests/regression/run.js h10        # only H10
 *   node tests/regression/run.js day4       # only Day 4
 *   node tests/regression/run.js h10 day4
 *
 * npm:
 *   npm run test:regression
 *   npm run test:h10
 *   npm run test:day4
 */

const { spawn } = require("child_process");
const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");

const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const PORT = process.env.PORT || "4319";
const BASE = `http://localhost:${PORT}`;
const LOG_PATH = path.join(os.tmpdir(), `acem-test-server-${PORT}.log`);

const SUITES = {
    h10: { file: "h10.probe.js", assertions: 28, label: "H10 - Lesson List Access" },
    day4: { file: "day4.probe.js", assertions: 83, label: "Day 4 - Teacher Core Flows" },
};

let server = null;
let logFd = null;

const VALID = Object.keys(SUITES);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const httpStatus = (pathname) =>
    new Promise((resolve) => {
        const req = http.get(`${BASE}${pathname}`, (res) => {
            res.resume();
            resolve(res.statusCode);
        });
        req.on("error", () => resolve(0));
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(0);
        });
    });

const serverLog = () => (fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, "utf8") : "");

async function waitReady(timeoutMs, spawned) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if ((await httpStatus("/api/v1/lessons")) === 401) {
            if (!spawned) return true;
            if (serverLog().includes("MongoDB Connected")) return true;
        }
        await sleep(500);
    }
    return false;
}

function runSuite(key) {
    const suite = SUITES[key];
    return new Promise((resolve) => {
        console.log(`\n########## ${suite.label} (${suite.file}) ##########`);
        const child = spawn(process.execPath, [path.join(__dirname, suite.file)], {
            cwd: SERVER_ROOT,
            env: { ...process.env, PROBE_BASE: BASE, NO_COLOR: "1" },
            stdio: "inherit",
        });
        child.on("exit", (code) => resolve({ key, code: code === null ? 1 : code }));
    });
}

async function main() {
    const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
    const suites = requested.length ? requested : VALID;
    const bad = suites.filter((s) => !VALID.includes(s));
    if (bad.length) {
        console.error(`Unknown suite(s): ${bad.join(", ")}. Valid: ${VALID.join(", ")}`);
        process.exit(2);
    }

    const external = (await httpStatus("/api/v1/lessons")) === 401;

    if (external) {
        console.log(`[runner] reusing existing server at ${BASE}`);
    } else {
        console.log(`[runner] starting server on ${BASE} (log: ${LOG_PATH})`);
        logFd = fs.openSync(LOG_PATH, "w");
        server = spawn(process.execPath, ["src/server.js"], {
            cwd: SERVER_ROOT,
            env: { ...process.env, PORT: String(PORT) },
            stdio: ["ignore", logFd, logFd],
        });
        server.on("error", (e) => console.error("[runner] server spawn error:", e.message));

        const ready = await waitReady(30000, true);
        if (!ready) {
            console.error("[runner] server did not become ready in time:");
            console.error(serverLog().split("\n").slice(-15).join("\n"));
            stopServer();
            process.exit(2);
        }
    }

    const results = [];
    for (const key of suites) {
        results.push(await runSuite(key));
    }

    stopServer();

    console.log("\n==================== REGRESSION SUMMARY ====================");
    let failed = 0;
    for (const { key, code } of results) {
        const s = SUITES[key];
        const ok = code === 0;
        if (!ok) failed++;
        console.log(`${ok ? "PASS" : "FAIL"} | ${s.label} (${s.assertions} assertions) exit=${code}`);
    }
    console.log(`===========================================================`);
    console.log(`${results.length - failed}/${results.length} suites passed`);
    process.exit(failed === 0 ? 0 : 1);
}

function stopServer() {
    if (logFd !== null) {
        try { fs.closeSync(logFd); } catch { /* ignore */ }
        logFd = null;
    }
    if (server && !server.killed) {
        server.kill();
        setTimeout(() => {
            try { server.kill("SIGKILL"); } catch { /* ignore */ }
        }, 3000).unref();
    }
}

process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });

main().catch((e) => {
    console.error("[runner] fatal:", e && e.stack ? e.stack : e);
    stopServer();
    process.exit(2);
});
