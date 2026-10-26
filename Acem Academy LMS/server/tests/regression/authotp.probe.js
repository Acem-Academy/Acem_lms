/*
 * Regression suite: Day 10 - Email OTP & Password Recovery (65 assertions).
 *
 * Covers:
 * - public registration creates unverified accounts and a hashed OTP
 * - unverified accounts cannot log in or refresh tokens
 * - OTP verification, expiry, reuse, attempt limits, and resend cooldown
 * - resend behavior for verified/unknown accounts
 * - purpose separation between verification and password reset codes
 * - generic forgot-password responses, reset flow, same-password retry, and
 *   refresh-token revocation
 * - existing verified accounts are unaffected
 *
 * OTP hashes are seeded directly into the database with a known code so the
 * suite never needs the plaintext code to be returned by the API or logged.
 * Creates temporary users/OTPs, then purges them and restores the baselines.
 *   node tests/regression/run.js authotp
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TAG = "OTP10 ";
const TS = Date.now();

const emailVerify = `otp10.${TS}.verify@example.com`;
const emailRefresh = `otp10.${TS}.refresh@example.com`;
const emailResend = `otp10.${TS}.resend@example.com`;
const emailAttempts = `otp10.${TS}.attempts@example.com`;
const emailExisting = `otp10.${TS}.existing@example.com`;
const emailReset = `otp10.${TS}.reset@example.com`;
const emailPurpose = `otp10.${TS}.purpose@example.com`;
const emailUnknown = `otp10.${TS}.unknown@example.com`;

const PASSWORD = "Password123";
const NEW_PASSWORD = "NewPassword123";
const OTP = "123456";
const WRONG_OTP = "654321";

const PURPOSES = {
    VERIFY: "email_verification",
    RESET: "password_reset",
};

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const errText = (r) => JSON.stringify(r.errors || r.msg);

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

const register = (email) =>
    req("POST", "/auth/register", {
        json: { fullName: `${TAG}User`, email, password: PASSWORD },
    });
const login = (email, password) =>
    req("POST", "/auth/login", { json: { email, password } });
const verify = (email, otp) =>
    req("POST", "/auth/verify-email", { json: { email, otp } });
const resend = (email) =>
    req("POST", "/auth/resend-verification", { json: { email } });
const forgot = (email) =>
    req("POST", "/auth/forgot-password", { json: { email } });
const reset = (email, otp, newPassword) =>
    req("POST", "/auth/reset-password", { json: { email, otp, newPassword } });

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const users = db.collection("users");
    const otps = db.collection("otps");
    const attemptsCollection = db.collection("quizattempts");

    const baselineUsers = await users.countDocuments();
    const baselineOtps = await otps.countDocuments();
    const baselineAttempts = await attemptsCollection.countDocuments();

    const seedOtp = async (email, purpose, code, overrides = {}) => {
        const now = Date.now();
        const codeHash = await bcrypt.hash(code, 10);

        await otps.updateOne(
            { email, purpose },
            {
                $set: {
                    email,
                    purpose,
                    codeHash,
                    expiresAt: new Date(now + 10 * 60 * 1000),
                    attempts: 0,
                    maxAttempts: 5,
                    resendAvailableAt: new Date(now - 60 * 1000),
                    usedAt: null,
                    ...overrides,
                },
            },
            { upsert: true }
        );
    };

    const markVerified = async (email) => {
        await users.updateOne(
            { email },
            { $set: { isEmailVerified: true } }
        );
    };

    const getOtp = (email, purpose) =>
        otps.findOne({ email, purpose });

    try {
        /* ------------------------------------------------------------------ */
        /* A. Registration and email verification                             */
        /* ------------------------------------------------------------------ */

        const regVerify = await register(emailVerify);
        check("1. public registration succeeds", regVerify.status === 201, `status=${regVerify.status}`);
        check(
            "2. new account is unverified",
            !!regVerify.data && regVerify.data.isEmailVerified === false,
            regVerify.data ? String(regVerify.data.isEmailVerified) : "no data"
        );
        check(
            "3. registration response does not expose OTP fields",
            !/codeHash|"otp"/.test(JSON.stringify(regVerify.data || {}))
        );

        const verifyOtp = await getOtp(emailVerify, PURPOSES.VERIFY);
        check("4. verification OTP record was created", !!verifyOtp);
        check(
            "5. OTP is stored hashed, not in plaintext",
            !!verifyOtp &&
                /^\$2[aby]\$/.test(verifyOtp.codeHash) &&
                verifyOtp.codeHash.length > 20,
            verifyOtp ? verifyOtp.codeHash.slice(0, 7) : "no record"
        );
        check(
            "6. OTP metadata is set",
            !!verifyOtp &&
                verifyOtp.expiresAt.getTime() > Date.now() &&
                verifyOtp.resendAvailableAt.getTime() > Date.now() &&
                verifyOtp.attempts === 0 &&
                verifyOtp.maxAttempts === 5 &&
                verifyOtp.usedAt === null
        );

        const loginUnverified = await login(emailVerify, PASSWORD);
        check("7. unverified login is blocked", loginUnverified.status === 403, `status=${loginUnverified.status}`);
        check(
            "8. unverified login returns EMAIL_NOT_VERIFIED",
            Array.isArray(loginUnverified.errors) &&
                loginUnverified.errors.includes("EMAIL_NOT_VERIFIED"),
            errText(loginUnverified)
        );
        check(
            "9. unverified login does not set cookies",
            !loginUnverified.cookies.accessToken &&
                !loginUnverified.cookies.refreshToken
        );
        check(
            "10. wrong password is still 401",
            (await login(emailVerify, "WrongPassword123")).status === 401
        );

        const malformed = await verify(emailVerify, "abc");
        check("11. malformed OTP is rejected", malformed.status === 400, `status=${malformed.status}`);

        await seedOtp(emailVerify, PURPOSES.VERIFY, OTP);
        const wrongVerify = await verify(emailVerify, WRONG_OTP);
        check("12. wrong OTP is rejected", wrongVerify.status === 400, `status=${wrongVerify.status}`);
        const afterWrong = await getOtp(emailVerify, PURPOSES.VERIFY);
        check(
            "13. wrong OTP increments attempts",
            !!afterWrong && afterWrong.attempts === 1,
            afterWrong ? `attempts=${afterWrong.attempts}` : "no record"
        );

        const verified = await verify(emailVerify, OTP);
        check("14. correct OTP verifies email", verified.status === 200, `status=${verified.status}`);
        const verifiedUser = await users.findOne({ email: emailVerify });
        check("15. user is marked verified", !!verifiedUser && verifiedUser.isEmailVerified === true);
        check("16. verification OTP is single-use/deleted", !(await getOtp(emailVerify, PURPOSES.VERIFY)));
        check("17. reusing the consumed OTP fails", (await verify(emailVerify, OTP)).status === 400);

        const verifiedLogin = await login(emailVerify, PASSWORD);
        check("18. verified account can sign in", verifiedLogin.status === 200, `status=${verifiedLogin.status}`);
        check(
            "19. verified login returns marked account",
            !!verifiedLogin.data &&
                !!verifiedLogin.data.user &&
                verifiedLogin.data.user.isEmailVerified === true
        );
        check(
            "20. verified login sets tokens",
            !!verifiedLogin.cookies.accessToken &&
                !!verifiedLogin.cookies.refreshToken
        );

        /* ------------------------------------------------------------------ */
        /* B. Unverified accounts cannot refresh                              */
        /* ------------------------------------------------------------------ */

        const regRefresh = await register(emailRefresh);
        check("21. refresh fixture registered", regRefresh.status === 201, `status=${regRefresh.status}`);
        const refreshId = regRefresh.data && regRefresh.data._id;
        const forgedRefresh = jwt.sign(
            { id: refreshId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );
        await users.updateOne(
            { _id: new mongoose.Types.ObjectId(refreshId) },
            { $set: { refreshToken: forgedRefresh } }
        );
        const refreshUnverified = await req("POST", "/auth/refresh-token", {
            cookie: `refreshToken=${forgedRefresh}`,
        });
        check("22. unverified account cannot refresh", refreshUnverified.status === 403, `status=${refreshUnverified.status}`);

        /* ------------------------------------------------------------------ */
        /* C. Existing verified accounts                                      */
        /* ------------------------------------------------------------------ */

        await register(emailExisting);
        await markVerified(emailExisting);
        const existingLogin = await login(emailExisting, PASSWORD);
        check("23. existing verified account still signs in", existingLogin.status === 200, `status=${existingLogin.status}`);

        /* ------------------------------------------------------------------ */
        /* D. Resend verification                                             */
        /* ------------------------------------------------------------------ */

        await register(emailResend);
        const resendTooSoon = await resend(emailResend);
        check("24. resend enforces cooldown", resendTooSoon.status === 429, `status=${resendTooSoon.status}`);

        const resendRecordBefore = await getOtp(emailResend, PURPOSES.VERIFY);
        await otps.updateOne(
            { _id: resendRecordBefore._id },
            { $set: { resendAvailableAt: new Date(Date.now() - 1000) } }
        );
        const resendOk = await resend(emailResend);
        check("25. resend succeeds after cooldown", resendOk.status === 200, `status=${resendOk.status}`);
        check(
            "26. resend response is generic",
            typeof resendOk.msg === "string" &&
                /verification code/i.test(resendOk.msg),
            resendOk.msg
        );
        const resendRecordAfter = await getOtp(emailResend, PURPOSES.VERIFY);
        check(
            "27. resend replaces the OTP hash",
            !!resendRecordAfter &&
                resendRecordAfter.codeHash !== resendRecordBefore.codeHash
        );
        check(
            "28. resend resets attempts",
            !!resendRecordAfter && resendRecordAfter.attempts === 0
        );

        await otps.deleteMany({ email: emailExisting });
        const resendVerified = await resend(emailExisting);
        check("29. resend for verified account is generic success", resendVerified.status === 200, `status=${resendVerified.status}`);
        check("30. no OTP is sent to a verified account", !(await getOtp(emailExisting, PURPOSES.VERIFY)));

        const resendUnknown = await resend(emailUnknown);
        check("31. resend for unknown email is generic success", resendUnknown.status === 200, `status=${resendUnknown.status}`);
        check("32. no OTP is created for unknown email", !(await getOtp(emailUnknown, PURPOSES.VERIFY)));

        /* ------------------------------------------------------------------ */
        /* E. Attempt limits, expiry, and reuse                               */
        /* ------------------------------------------------------------------ */

        await register(emailAttempts);
        await seedOtp(emailAttempts, PURPOSES.VERIFY, OTP, { attempts: 4 });
        const lastAttempt = await verify(emailAttempts, WRONG_OTP);
        check("33. final wrong attempt is rate-limited", lastAttempt.status === 429, `status=${lastAttempt.status}`);
        const maxed = await getOtp(emailAttempts, PURPOSES.VERIFY);
        check(
            "34. attempt count reaches max",
            !!maxed && maxed.attempts === 5,
            maxed ? `attempts=${maxed.attempts}` : "no record"
        );
        const correctAfterMax = await verify(emailAttempts, OTP);
        check("35. correct OTP is blocked after max attempts", correctAfterMax.status === 429, `status=${correctAfterMax.status}`);

        await otps.updateOne(
            { email: emailAttempts, purpose: PURPOSES.VERIFY },
            { $set: { resendAvailableAt: new Date(Date.now() - 1000) } }
        );
        const resetAttempts = await resend(emailAttempts);
        check("36. resend after lockout succeeds", resetAttempts.status === 200, `status=${resetAttempts.status}`);
        const resetRecord = await getOtp(emailAttempts, PURPOSES.VERIFY);
        check("37. resend clears attempt counter", !!resetRecord && resetRecord.attempts === 0);

        await seedOtp(emailAttempts, PURPOSES.VERIFY, OTP, { expiresAt: new Date(Date.now() - 1000) });
        check("38. expired OTP is rejected", (await verify(emailAttempts, OTP)).status === 400);
        await seedOtp(emailAttempts, PURPOSES.VERIFY, OTP, { usedAt: new Date() });
        check("39. already-used OTP is rejected", (await verify(emailAttempts, OTP)).status === 400);

        /* ------------------------------------------------------------------ */
        /* F. Purpose separation                                              */
        /* ------------------------------------------------------------------ */

        await register(emailPurpose);
        await markVerified(emailPurpose);
        await otps.deleteMany({ email: emailPurpose });
        await seedOtp(emailPurpose, PURPOSES.VERIFY, OTP);
        check(
            "40. verification OTP cannot reset a password",
            (await reset(emailPurpose, OTP, NEW_PASSWORD)).status === 400
        );

        /* ------------------------------------------------------------------ */
        /* G. Forgot-password and reset                                       */
        /* ------------------------------------------------------------------ */

        const forgotUnknown = await forgot(emailUnknown);
        check("41. forgot unknown email is generic success", forgotUnknown.status === 200, `status=${forgotUnknown.status}`);

        await register(emailReset);
        await markVerified(emailReset);
        const resetLogin = await login(emailReset, PASSWORD);
        check("42. reset fixture signs in", resetLogin.status === 200, `status=${resetLogin.status}`);
        const resetRefresh = resetLogin.cookies.refreshToken;

        const forgotKnown = await forgot(emailReset);
        check("43. forgot known email is generic success", forgotKnown.status === 200, `status=${forgotKnown.status}`);
        check(
            "44. forgot response does not reveal account existence",
            forgotKnown.msg === forgotUnknown.msg,
            `${forgotUnknown.msg} vs ${forgotKnown.msg}`
        );
        const resetRecordBefore = await getOtp(emailReset, PURPOSES.RESET);
        check("45. reset OTP record was created", !!resetRecordBefore);

        const forgotAgain = await forgot(emailReset);
        const resetRecordAfter = await getOtp(emailReset, PURPOSES.RESET);
        check(
            "46. forgot cooldown is enforced without enumeration",
            forgotAgain.status === 200 &&
                !!resetRecordAfter &&
                resetRecordAfter.codeHash === resetRecordBefore.codeHash
        );

        const forgotUnverified = await forgot(emailResend);
        check(
            "47. forgot for unverified account is generic",
            forgotUnverified.status === 200 &&
                !(await getOtp(emailResend, PURPOSES.RESET))
        );

        await seedOtp(emailReset, PURPOSES.RESET, OTP);
        const resetWrong = await reset(emailReset, WRONG_OTP, NEW_PASSWORD);
        check("48. wrong reset code is rejected", resetWrong.status === 400, `status=${resetWrong.status}`);

        await seedOtp(emailReset, PURPOSES.RESET, OTP, { expiresAt: new Date(Date.now() - 1000) });
        check("49. expired reset code is rejected", (await reset(emailReset, OTP, NEW_PASSWORD)).status === 400);

        await seedOtp(emailReset, PURPOSES.RESET, OTP);
        const resetOk = await reset(emailReset, OTP, NEW_PASSWORD);
        check("50. valid reset code resets the password", resetOk.status === 200, `status=${resetOk.status}`);
        check("51. reset OTP is single-use/deleted", !(await getOtp(emailReset, PURPOSES.RESET)));
        check("52. old password no longer works", (await login(emailReset, PASSWORD)).status === 401);
        const newLogin = await login(emailReset, NEW_PASSWORD);
        check("53. new password works", newLogin.status === 200, `status=${newLogin.status}`);

        const refreshAfterReset = await req("POST", "/auth/refresh-token", {
            cookie: `refreshToken=${resetRefresh}`,
        });
        check(
            "54. refresh token is revoked after reset",
            refreshAfterReset.status === 401,
            `status=${refreshAfterReset.status}`
        );
        check(
            "55. reusing the reset code fails",
            (await reset(emailReset, OTP, "AnotherPassword123")).status === 400
        );

        await seedOtp(emailReset, PURPOSES.RESET, OTP);
        const sameReset = await reset(
            emailReset,
            OTP,
            NEW_PASSWORD
        );
        check(
            "56. same password is rejected",
            sameReset.status === 400,
            `status=${sameReset.status}`
        );
        const sameOtpRecord = await getOtp(
            emailReset,
            PURPOSES.RESET
        );
        check(
            "57. same-password rejection keeps the code usable",
            !!sameOtpRecord && !sameOtpRecord.usedAt
        );
        check(
            "58. code can be retried after same-password rejection",
            (await reset(
                emailReset,
                OTP,
                "AnotherPassword123"
            )).status === 200
        );

        check(
            "59. unknown email cannot reset",
            (await reset(emailUnknown, OTP, NEW_PASSWORD)).status === 400
        );
        check(
            "60. unverified account cannot reset",
            (await reset(emailResend, OTP, NEW_PASSWORD)).status === 400
        );
    } catch (error) {
        console.error("probe error:", error && error.stack ? error.stack : error);
        check("probe completed without exception", false);
    } finally {
        const pattern = new RegExp(`^otp10\\.${TS}\\.`);

        await users.deleteMany({ email: pattern });
        await otps.deleteMany({ email: pattern });

        const leftoverUsers = await users.countDocuments({ email: pattern });
        check("61. temp users removed", leftoverUsers === 0, `leftover=${leftoverUsers}`);

        const leftoverOtps = await otps.countDocuments({ email: pattern });
        check("62. temp OTPs removed", leftoverOtps === 0, `leftover=${leftoverOtps}`);

        const usersNow = await users.countDocuments();
        check("63. user count restored", usersNow === baselineUsers, `${baselineUsers} -> ${usersNow}`);

        const otpsNow = await otps.countDocuments();
        check("64. OTP count restored", otpsNow === baselineOtps, `${baselineOtps} -> ${otpsNow}`);

        const attemptsNow = await attemptsCollection.countDocuments();
        check("65. quiz attempts untouched", attemptsNow === baselineAttempts, `${baselineAttempts} -> ${attemptsNow}`);

        await mongoose.disconnect();

        const passed = results.filter((r) => r.ok).length;
        console.log(`\n${passed}/${results.length} assertions passed`);
        process.exit(passed === results.length ? 0 : 1);
    }
})();
