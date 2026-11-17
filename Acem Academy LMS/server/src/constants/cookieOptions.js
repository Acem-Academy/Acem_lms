/**
 * Production Cookie Configuration
 *
 * Supports dynamic environment configuration while enforcing critical browser security rules:
 * - SameSite=None is automatically paired with Secure=true (required by all modern browsers).
 * - Defaults to SameSite=lax for safe local development and standard single/shared-domain hosting.
 * - Supports COOKIE_DOMAIN if set, without guessing domains.
 */

function getCookieBaseOptions() {
    const rawSameSite = (process.env.COOKIE_SAME_SITE || "").toLowerCase().trim();
    const isProduction = process.env.NODE_ENV === "production";

    // Valid SameSite values: "lax", "strict", "none"
    const validSameSiteValues = ["lax", "strict", "none"];
    let sameSite = validSameSiteValues.includes(rawSameSite)
        ? rawSameSite
        : "lax";

    let secure;
    if (sameSite === "none") {
        // Enforce browser standard: SameSite=None MUST be Secure=true
        secure = true;
    } else if (process.env.COOKIE_SECURE !== undefined) {
        secure = process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === true;
    } else {
        secure = isProduction;
    }

    const base = {
        httpOnly: true,
        secure,
        sameSite,
        path: "/",
    };

    if (process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.trim()) {
        base.domain = process.env.COOKIE_DOMAIN.trim();
    }

    return base;
}

const cookieOptions = {
    get accessTokenCookieOptions() {
        return {
            ...getCookieBaseOptions(),
            maxAge: 24 * 60 * 60 * 1000, // 1 Day
        };
    },
    get refreshTokenCookieOptions() {
        return {
            ...getCookieBaseOptions(),
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
        };
    },
    getCookieBaseOptions,
};

module.exports = cookieOptions;
