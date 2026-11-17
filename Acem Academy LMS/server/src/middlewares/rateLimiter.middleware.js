const ApiError = require("../utils/ApiError");

/**
 * In-memory IP rate limiter middleware factory.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max permitted hits per IP in window
 * @param {string} options.message - Error message returned on 429
 */
function createRateLimiter({
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests. Please try again later.",
} = {}) {
    const hits = new Map();

    // Clean up expired records every 5 minutes
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of hits.entries()) {
            if (now > entry.resetTime) {
                hits.delete(ip);
            }
        }
    }, 5 * 60 * 1000);
    timer.unref();

    return (req, res, next) => {
        // Bypass rate limiting if explicitly disabled (e.g. during regression test runs)
        if (
            process.env.DISABLE_RATE_LIMIT === "true" ||
            process.env.NODE_ENV === "test"
        ) {
            return next();
        }

        const ip =
            req.ip ||
            (req.headers["x-forwarded-for"]
                ? req.headers["x-forwarded-for"].split(",")[0].trim()
                : null) ||
            req.socket?.remoteAddress ||
            "unknown-client";

        const now = Date.now();
        let record = hits.get(ip);

        if (!record || now > record.resetTime) {
            record = { count: 1, resetTime: now + windowMs };
            hits.set(ip, record);
        } else {
            record.count += 1;
        }

        const remaining = Math.max(0, max - record.count);
        const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", resetSeconds);

        if (record.count > max) {
            res.setHeader("Retry-After", resetSeconds);
            return next(new ApiError(429, message));
        }

        next();
    };
}

// Targeted limiter for login, registration, and password recovery
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 minutes per IP
    message: "Too many authentication attempts. Please try again after 15 minutes.",
});

// Targeted limiter for OTP verification and resend
const otpLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 OTP attempts per 15 minutes per IP
    message: "Too many OTP verification attempts. Please wait before requesting another code.",
});

module.exports = {
    createRateLimiter,
    authLimiter,
    otpLimiter,
};
