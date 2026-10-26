/*
 * Regression suite: Day 9 - Authentication & Profile Management (45 assertions).
 *
 * Covers authentication and account-management behavior fixed on Day 9:
 * - expired/invalid access tokens return 401 (previously 500)
 * - self-registration cannot set role, emails are normalized and duplicates
 *   are detected case-insensitively
 * - login is case-insensitive and rejects bad credentials
 * - profile read/update: field validation, duplicate email, role immutability
 * - password change: old-password contract, same-password rejection, length,
 *   refresh-token revocation, and old-password invalidation
 * - refresh/logout token lifecycle
 * - RBAC for a teacher-only route
 *
 * Mutation-testing: creates two temporary users, then purges them and asserts
 * user/quizattempt counts return to the pre-run baseline. Requires a running
 * API server; PROBE_BASE overrides the URL.
 *   node tests/regression/run.js auth
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const TAG = "AUTH9 ";
const TS = Date.now();

const emailA = `authprobe.${TS}.a@example.com`;
const emailARaw = `AuthProbe.${TS}.A@Example.COM`;
const emailB = `authprobe.${TS}.b@example.com`;
const emailC = `authprobe.${TS}.c@example.com`;

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tokenFor = (id, { secret, expiresIn } = {}) =>
    jwt.sign({ id, role: "student" }, secret || process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: expiresIn || "5m",
    });

const accessCookie = (id, opts) => `accessToken=${tokenFor(id, opts)}`;

const req = async (method, path, { cookie, json } = {}) => {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    let body;
    if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    }
    const res = await fetch(`${BASE}/api/v1${path}`, { method, headers, body });
    let parsed = null;
    try { parsed = await res.json(); } catch { /* none */ }
    const rawCookies = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [res.headers.get("set-cookie") || ""];
    const cookies = {};
    for (const raw of rawCookies) {
        for (const m of String(raw).matchAll(/(accessToken|refreshToken)=([^;,\s]+)/g)) {
            cookies[m[1]] = m[2];
        }
    }
    return {
        status: res.status,
        data: parsed ? parsed.data : null,
        msg: parsed ? parsed.message : null,
        errors: parsed && Array.isArray(parsed.errors) ? parsed.errors : null,
        cookies,
    };
};

const errText = (r) => JSON.stringify(r.errors || r.msg);
const hasErr = (r, needle) =>
    Array.isArray(r.errors) && r.errors.some((m) => String(m).includes(needle));

const login = (email, password) =>
    req("POST", "/auth/login", { json: { email, password } });

const createdIds = [];
const track = (r) => {
    const id = r && r.data && (r.data._id || r.data.id);
    if (id) createdIds.push(String(id));
    return id;
};

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const baselineUsers = await db.collection("users").countDocuments();
    const baselineAttempts = await db.collection("quizattempts").countDocuments();

    const markVerified = async (id) => {
        if (!id) return;
        await db.collection("users").updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $set: { isEmailVerified: true } }
        );
    };

    let alphaId = null;
    let preChangeRefresh = null;
    let newRefresh = null;
    let newAccess = null;

    try {
        /* ------------------------------------------------------------------ */
        /* A. Registration                                                    */
        /* ------------------------------------------------------------------ */

        const r1 = await req("POST", "/auth/register", {
            json: { fullName: `${TAG}Alpha`, email: emailARaw, password: "Password123" },
        });
        alphaId = track(r1);
        check("1. register returns 201", r1.status === 201, `status=${r1.status}`);
        check(
            "2. register returns id and hides password",
            !!alphaId && !!r1.data && r1.data.password === undefined
        );
        check(
            "3. self-registration role defaults to student",
            !!r1.data && r1.data.role === "student",
            r1.data ? r1.data.role : "no data"
        );
        check(
            "4. email is normalized to lowercase",
            !!r1.data && r1.data.email === emailA,
            r1.data ? r1.data.email : "no data"
        );

        const r2 = await req("POST", "/auth/register", {
            json: { fullName: `${TAG}Beta`, email: emailB, password: "Password123", role: "admin" },
        });
        const betaId = track(r2);
        await markVerified(alphaId);
        await markVerified(betaId);
        check("5. register with role field returns 201", r2.status === 201, `status=${r2.status}`);
        check(
            "6. role mass assignment blocked",
            !!r2.data && r2.data.role === "student",
            r2.data ? r2.data.role : "no data"
        );

        const dup = await req("POST", "/auth/register", {
            json: { fullName: `${TAG}Dup`, email: emailARaw.toUpperCase(), password: "Password123" },
        });
        check("7. duplicate email is case-insensitive", dup.status === 409, `status=${dup.status}`);

        const short = await req("POST", "/auth/register", {
            json: { fullName: `${TAG}Short`, email: emailC, password: "short" },
        });
        check(
            "8. short password rejected",
            short.status === 400 && hasErr(short, "at least 8"),
            errText(short)
        );

        /* ------------------------------------------------------------------ */
        /* B. Login                                                           */
        /* ------------------------------------------------------------------ */

        const bad = await login(emailA, "WrongPassword123");
        check("9. wrong password rejected", bad.status === 401, `status=${bad.status}`);

        const upper = await login(emailA.toUpperCase(), "Password123");
        check("10. login email is case-insensitive", upper.status === 200, `status=${upper.status}`);
        check(
            "11. login returns normalized email",
            upper.status === 200 && !!upper.data && !!upper.data.user && upper.data.user.email === emailA
        );

        const good = await login(emailA, "Password123");
        check("12. correct login returns 200", good.status === 200, `status=${good.status}`);
        check(
            "13. login sets access and refresh cookies",
            !!good.cookies.accessToken && !!good.cookies.refreshToken
        );
        check(
            "14. login response hides password",
            good.status === 200 && !!good.data && !!good.data.user && good.data.user.password === undefined
        );
        preChangeRefresh = good.cookies.refreshToken;

        const unknown = await login(`nobody.${TS}@example.com`, "Password123");
        check("15. unknown email rejected", unknown.status === 401, `status=${unknown.status}`);

        /* ------------------------------------------------------------------ */
        /* C. Profile access                                                  */
        /* ------------------------------------------------------------------ */

        const noAuth = await req("GET", "/auth/profile");
        check("16. profile without token is 401", noAuth.status === 401, `status=${noAuth.status}`);

        const expired = await req("GET", "/auth/profile", {
            cookie: accessCookie(alphaId, { expiresIn: "-1s" }),
        });
        check("17. expired access token is 401 (not 500)", expired.status === 401, `status=${expired.status}`);

        const invalid = await req("GET", "/auth/profile", {
            cookie: accessCookie(alphaId, { secret: "wrong-secret" }),
        });
        check("18. invalid access token is 401", invalid.status === 401, `status=${invalid.status}`);

        const ghostId = new mongoose.Types.ObjectId().toString();
        const ghost = await req("GET", "/auth/profile", {
            cookie: accessCookie(ghostId),
        });
        check("19. token for missing user is 401", ghost.status === 401, `status=${ghost.status}`);

        const profile = await req("GET", "/auth/profile", {
            cookie: `accessToken=${good.cookies.accessToken}`,
        });
        check(
            "20. profile returns current user",
            profile.status === 200 && !!profile.data && profile.data.email === emailA,
            `status=${profile.status}`
        );
        check(
            "21. profile hides password and refresh token",
            !!profile.data && profile.data.password === undefined && profile.data.refreshToken === undefined
        );

        /* ------------------------------------------------------------------ */
        /* D. Profile update                                                  */
        /* ------------------------------------------------------------------ */

        const up = await req("PATCH", "/auth/profile", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { fullName: `${TAG}Alpha Updated`, email: emailA },
        });
        check(
            "22. profile fullName updates",
            up.status === 200 && !!up.data && up.data.fullName === `${TAG}Alpha Updated`,
            `status=${up.status}`
        );

        const upShort = await req("PATCH", "/auth/profile", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { fullName: "ab", email: emailA },
        });
        check(
            "23. short fullName rejected",
            upShort.status === 400 && hasErr(upShort, "at least 3"),
            errText(upShort)
        );

        const upBadEmail = await req("PATCH", "/auth/profile", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { fullName: `${TAG}Alpha Updated`, email: "not-an-email" },
        });
        check(
            "24. invalid email rejected",
            upBadEmail.status === 400 && hasErr(upBadEmail, "valid email"),
            errText(upBadEmail)
        );

        const upDup = await req("PATCH", "/auth/profile", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { fullName: `${TAG}Alpha Updated`, email: emailB },
        });
        check("25. duplicate email rejected", upDup.status === 409, `status=${upDup.status}`);

        const upRole = await req("PATCH", "/auth/profile", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { fullName: `${TAG}Alpha Updated`, email: emailA, role: "admin" },
        });
        check(
            "26. role cannot be changed via profile",
            upRole.status === 200 && !!upRole.data && upRole.data.role === "student",
            upRole.status === 200 && upRole.data ? upRole.data.role : `status=${upRole.status}`
        );

        /* ------------------------------------------------------------------ */
        /* E. Password change                                                 */
        /* ------------------------------------------------------------------ */

        const cpWrong = await req("PATCH", "/auth/change-password", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { oldPassword: "NopePassword123", newPassword: "NewPassword123" },
        });
        check("27. wrong old password rejected", cpWrong.status === 400, `status=${cpWrong.status}`);

        const cpSame = await req("PATCH", "/auth/change-password", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { oldPassword: "Password123", newPassword: "Password123" },
        });
        check("28. same old/new password rejected", cpSame.status === 400, `status=${cpSame.status}`);

        const cpShort = await req("PATCH", "/auth/change-password", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { oldPassword: "Password123", newPassword: "short" },
        });
        check(
            "29. short new password rejected",
            cpShort.status === 400 && hasErr(cpShort, "at least 8"),
            errText(cpShort)
        );

        const cpLegacy = await req("PATCH", "/auth/change-password", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { currentPassword: "Password123", newPassword: "NewPassword123" },
        });
        check(
            "30. currentPassword field is not accepted",
            cpLegacy.status === 400 && hasErr(cpLegacy, "Old password is required"),
            errText(cpLegacy)
        );

        const cpOk = await req("PATCH", "/auth/change-password", {
            cookie: `accessToken=${good.cookies.accessToken}`,
            json: { oldPassword: "Password123", newPassword: "NewPassword123" },
        });
        check("31. password change succeeds", cpOk.status === 200, `status=${cpOk.status}`);

        const oldLogin = await login(emailA, "Password123");
        check("32. old password no longer works", oldLogin.status === 401, `status=${oldLogin.status}`);

        const newLogin = await login(emailA, "NewPassword123");
        check("33. new password works", newLogin.status === 200, `status=${newLogin.status}`);
        newRefresh = newLogin.cookies.refreshToken;
        newAccess = newLogin.cookies.accessToken;

        /* ------------------------------------------------------------------ */
        /* F. Refresh & logout                                                */
        /* ------------------------------------------------------------------ */

        const refreshOld = await req("POST", "/auth/refresh-token", {
            cookie: `refreshToken=${preChangeRefresh}`,
        });
        check("34. pre-change refresh token revoked", refreshOld.status === 401, `status=${refreshOld.status}`);

        const refreshNew = await req("POST", "/auth/refresh-token", {
            cookie: `refreshToken=${newRefresh}`,
        });
        check("35. current refresh token works", refreshNew.status === 200, `status=${refreshNew.status}`);
        check("36. refresh sets a new access token", !!refreshNew.cookies.accessToken);

        const refreshNone = await req("POST", "/auth/refresh-token");
        check("37. refresh without cookie is 401", refreshNone.status === 401, `status=${refreshNone.status}`);

        const logout = await req("POST", "/auth/logout", {
            cookie: `accessToken=${newAccess}; refreshToken=${newRefresh}`,
        });
        check("38. logout succeeds", logout.status === 200, `status=${logout.status}`);

        const refreshAfterLogout = await req("POST", "/auth/refresh-token", {
            cookie: `refreshToken=${newRefresh}`,
        });
        check("39. refresh after logout is 401", refreshAfterLogout.status === 401, `status=${refreshAfterLogout.status}`);

        /* ------------------------------------------------------------------ */
        /* G. RBAC                                                            */
        /* ------------------------------------------------------------------ */

        const myNoAuth = await req("GET", "/courses/my-courses");
        check("40. teacher route without token is 401", myNoAuth.status === 401, `status=${myNoAuth.status}`);

        const myStudent = await req("GET", "/courses/my-courses", {
            cookie: `accessToken=${newAccess}`,
        });
        check("41. student blocked from teacher route", myStudent.status === 403, `status=${myStudent.status}`);

        const myTeacher = await req("GET", "/courses/my-courses", {
            cookie: accessCookie(TEACHER),
        });
        check("42. teacher allowed on teacher route", myTeacher.status === 200, `status=${myTeacher.status}`);
    } catch (error) {
        console.error("probe error:", error && error.stack ? error.stack : error);
        check("probe completed without exception", false);
    } finally {
        const ids = createdIds
            .filter(Boolean)
            .map((id) => new mongoose.Types.ObjectId(id));
        if (ids.length) {
            await db.collection("users").deleteMany({ _id: { $in: ids } });
        }

        await db.collection("otps").deleteMany({
            email: new RegExp(`^authprobe\\.${TS}\\.`),
        });

        const leftover = await db.collection("users").countDocuments({
            email: new RegExp(`^authprobe\\.${TS}\\.`),
        });
        check("43. temp users removed", leftover === 0, `leftover=${leftover}`);

        const usersNow = await db.collection("users").countDocuments();
        check("44. user count restored", usersNow === baselineUsers, `${baselineUsers} -> ${usersNow}`);

        const attemptsNow = await db.collection("quizattempts").countDocuments();
        check("45. quiz attempts untouched", attemptsNow === baselineAttempts, `${baselineAttempts} -> ${attemptsNow}`);

        await mongoose.disconnect();

        const passed = results.filter((r) => r.ok).length;
        console.log(`\n${passed}/${results.length} assertions passed`);
        process.exit(passed === results.length ? 0 : 1);
    }
})();
