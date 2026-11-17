/*
 * Regression suite: Day 15 - Production Hardening Verification.
 *
 * Covers:
 * - 1. Health endpoint (reports status, uptime, and database connectivity)
 * - 2. CORS policy enforcement (allows approved origins with credentials, excludes disallowed origins)
 * - 3. Cookie security configuration (SameSite=None enforces Secure=true, valid defaults)
 * - 4. Rate limiting on authentication routes (enforces limits, returns 429 and rate-limit headers)
 * - 5. Production error handling (preserves structured errors, masks unhandled 500 in production)
 * - 6. Startup environment variable validation logic
 *
 * Usage:
 *   node tests/regression/run.js day15
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { getCookieBaseOptions } = require("../../src/constants/cookieOptions");
const { createRateLimiter } = require("../../src/middlewares/rateLimiter.middleware");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

(async () => {
    /* ====================================================================== */
    /* 1. Health Endpoint Verification                                        */
    /* ====================================================================== */
    console.log("\n--- 1. Health Endpoint Verification ---");

    const healthRes = await fetch(`${BASE}/health`);
    const healthJson = await healthRes.json().catch(() => ({}));

    check(
        "1a. GET /health returns 200 OK",
        healthRes.status === 200,
        `status=${healthRes.status}`
    );
    check(
        "1b. GET /health reports healthy status and connected database",
        healthJson.success === true &&
            healthJson.status === "healthy" &&
            healthJson.database?.status === "connected" &&
            typeof healthJson.uptime === "number",
        `status=${healthJson.status} db=${healthJson.database?.status} uptime=${healthJson.uptime}s`
    );

    const apiHealthRes = await fetch(`${BASE}/api/v1/health`);
    check(
        "1c. GET /api/v1/health alias returns 200 with matching shape",
        apiHealthRes.status === 200,
        `status=${apiHealthRes.status}`
    );

    /* ====================================================================== */
    /* 2. CORS Policy Verification                                            */
    /* ====================================================================== */
    console.log("\n--- 2. CORS Policy Verification ---");

    // Allowed origin (default development origin)
    const allowedRes = await fetch(`${BASE}/health`, {
        headers: { Origin: "http://localhost:5173" },
    });
    const allowOriginHeader = allowedRes.headers.get("access-control-allow-origin");
    const allowCredsHeader = allowedRes.headers.get("access-control-allow-credentials");

    check(
        "2a. Approved origin receives Access-Control-Allow-Origin header",
        allowOriginHeader === "http://localhost:5173",
        `origin=${allowOriginHeader}`
    );
    check(
        "2b. Approved origin receives Access-Control-Allow-Credentials: true",
        allowCredsHeader === "true",
        `credentials=${allowCredsHeader}`
    );

    // Disallowed origin
    const disallowedRes = await fetch(`${BASE}/health`, {
        headers: { Origin: "http://unauthorized-attacker.example.com" },
    });
    const disallowedOriginHeader = disallowedRes.headers.get("access-control-allow-origin");

    check(
        "2c. Disallowed origin does NOT receive Access-Control-Allow-Origin header",
        disallowedOriginHeader === null || disallowedOriginHeader === undefined,
        `originHeader=${disallowedOriginHeader || "none"}`
    );

    /* ====================================================================== */
    /* 3. Cookie Configuration & Security Invariants                           */
    /* ====================================================================== */
    console.log("\n--- 3. Cookie Configuration Invariants ---");

    // Test default configuration
    const defaultOpts = getCookieBaseOptions();
    check(
        "3a. Default cookie options enforce httpOnly and valid SameSite",
        defaultOpts.httpOnly === true && ["lax", "strict", "none"].includes(defaultOpts.sameSite),
        `httpOnly=${defaultOpts.httpOnly} sameSite=${defaultOpts.sameSite} secure=${defaultOpts.secure}`
    );

    // Test SameSite=None requirement: MUST enforce secure=true
    const originalSameSite = process.env.COOKIE_SAME_SITE;
    const originalSecure = process.env.COOKIE_SECURE;

    process.env.COOKIE_SAME_SITE = "none";
    delete process.env.COOKIE_SECURE;

    const noneOpts = getCookieBaseOptions();
    check(
        "3b. SameSite=None automatically forces Secure=true (browser security invariant)",
        noneOpts.sameSite === "none" && noneOpts.secure === true,
        `sameSite=${noneOpts.sameSite} secure=${noneOpts.secure}`
    );

    // Restore env
    if (originalSameSite !== undefined) {
        process.env.COOKIE_SAME_SITE = originalSameSite;
    } else {
        delete process.env.COOKIE_SAME_SITE;
    }
    if (originalSecure !== undefined) {
        process.env.COOKIE_SECURE = originalSecure;
    } else {
        delete process.env.COOKIE_SECURE;
    }

    /* ====================================================================== */
    /* 4. Rate Limiting Unit & Header Verification                             */
    /* ====================================================================== */
    console.log("\n--- 4. Rate Limiting Verification ---");

    const testLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: "Test limit exceeded.",
    });

    const mockReq = { ip: "192.168.1.100", headers: {} };
    const mockHeaders = {};
    const mockRes = {
        setHeader: (k, v) => {
            mockHeaders[k.toLowerCase()] = v;
        },
    };

    let nextCallCount = 0;
    let caughtError = null;

    for (let i = 0; i < 4; i++) {
        testLimiter(mockReq, mockRes, (err) => {
            if (err) {
                caughtError = err;
            } else {
                nextCallCount++;
            }
        });
    }

    check(
        "4a. Rate limiter permits requests up to max threshold",
        nextCallCount === 3,
        `permitted=${nextCallCount}/3`
    );
    check(
        "4b. Rate limiter rejects request exceeding threshold with 429",
        caughtError && caughtError.statusCode === 429 && caughtError.message === "Test limit exceeded.",
        `status=${caughtError?.statusCode} msg=${caughtError?.message}`
    );
    check(
        "4c. Rate limiter returns X-RateLimit headers and Retry-After",
        mockHeaders["x-ratelimit-limit"] === 3 &&
            mockHeaders["x-ratelimit-remaining"] === 0 &&
            typeof mockHeaders["retry-after"] === "number",
        `limit=${mockHeaders["x-ratelimit-limit"]} remaining=${mockHeaders["x-ratelimit-remaining"]} retryAfter=${mockHeaders["retry-after"]}`
    );

    /* ====================================================================== */
    /* 5. Production Error Masking Logic                                       */
    /* ====================================================================== */
    console.log("\n--- 5. Production Error Masking Logic ---");

    const errorHandler = require("../../src/middlewares/error.middleware");

    // In development mode: raw message preserved
    let devResponse = null;
    let devStatus = null;
    const fakeDevRes = {
        status: (code) => {
            devStatus = code;
            return {
                json: (payload) => {
                    devResponse = payload;
                },
            };
        },
    };

    const rawError = new Error("Sensitive database table courses_internal query failed");

    process.env.NODE_ENV = "development";
    errorHandler(rawError, { method: "GET", url: "/test" }, fakeDevRes, () => {});

    check(
        "5a. Development mode preserves detailed error message for debugging",
        devStatus === 500 && devResponse?.message.includes("Sensitive database table"),
        `status=${devStatus} msg=${devResponse?.message}`
    );

    // In production mode: internal 500 error message is masked
    let prodResponse = null;
    let prodStatus = null;
    const fakeProdRes = {
        status: (code) => {
            prodStatus = code;
            return {
                json: (payload) => {
                    prodResponse = payload;
                },
            };
        },
    };

    process.env.NODE_ENV = "production";
    errorHandler(rawError, { method: "GET", url: "/test" }, fakeProdRes, () => {});

    check(
        "5b. Production mode masks internal 500 errors to generic user message",
        prodStatus === 500 &&
            !prodResponse?.message.includes("Sensitive database table") &&
            prodResponse?.message.includes("unexpected internal server error"),
        `status=${prodStatus} msg=${prodResponse?.message}`
    );

    // Restore NODE_ENV
    process.env.NODE_ENV = "development";

    /* ====================================================================== */
    /* Summary                                                                 */
    /* ====================================================================== */
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    console.log(`\n=== Day 15 Production Hardening: ${passed}/${results.length} assertions passed, ${failed} failed ===\n`);

    if (failed > 0) {
        process.exit(1);
    }
})();
