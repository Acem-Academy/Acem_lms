/**
 * Environment Variable Validator
 * Validates critical environment variables required for server operation.
 * Fails fast on startup if mandatory variables are missing.
 * Never logs secret values.
 */

function validateEnv() {
    const isProduction = process.env.NODE_ENV === "production";
    const missing = [];
    const advisories = [];

    // Mandatory variables across all environments
    if (!process.env.MONGODB_URI) {
        missing.push("MONGODB_URI");
    }
    if (!process.env.ACCESS_TOKEN_SECRET) {
        missing.push("ACCESS_TOKEN_SECRET");
    }
    if (!process.env.REFRESH_TOKEN_SECRET) {
        missing.push("REFRESH_TOKEN_SECRET");
    }

    // Production advisories and sanity checks
    if (isProduction) {
        if (!process.env.CLIENT_URL && !process.env.CORS_ORIGIN) {
            advisories.push(
                "CLIENT_URL or CORS_ORIGIN is not set; defaulting to localhost which will reject production web traffic."
            );
        }

        const emailDisabled = process.env.DISABLE_EMAIL === "true";
        if (!emailDisabled) {
            if (!process.env.SMTP_HOST) advisories.push("SMTP_HOST is not set; email verification will fail.");
            if (!process.env.SMTP_USER) advisories.push("SMTP_USER is not set.");
            if (!process.env.SMTP_PASS) advisories.push("SMTP_PASS is not set.");
        }

        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            advisories.push("Cloudinary credentials are not fully configured; uploads will fail.");
        }
    }

    if (missing.length > 0) {
        console.error("=================================================");
        console.error("FATAL: Missing mandatory environment variable(s):");
        missing.forEach((v) => console.error(`  - ${v}`));
        console.error("Server startup aborted to prevent undefined behavior.");
        console.error("=================================================");
        process.exit(1);
    }

    if (advisories.length > 0 && isProduction) {
        console.warn("=================================================");
        console.warn("PRODUCTION CONFIGURATION ADVISORIES:");
        advisories.forEach((a) => console.warn(`  - ${a}`));
        console.warn("=================================================");
    }
}

module.exports = validateEnv;
