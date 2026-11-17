const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
    // Server-side diagnostic logging (omits client secrets/tokens)
    console.error("========== SERVER ERROR ==========");
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);
    console.error(err);
    if (err && err.stack) {
        console.error(err.stack);
    }
    console.error("=================================");

    let error = err;

    if (error && error.code === 11000) {
        error = new ApiError(
            409,
            "Duplicate value. The resource already exists."
        );
    } else if (error && error.name === "MulterError") {
        error = new ApiError(
            400,
            error.code === "LIMIT_FILE_SIZE"
                ? "File is too large. The maximum upload size is 100 MB."
                : "Invalid file upload."
        );
    } else if (error && error.name === "CastError") {
        error = new ApiError(
            400,
            `Invalid ${error.path || "ID"} format.`
        );
    } else if (error && error.name === "ValidationError") {
        const messages = Object.values(error.errors || {}).map((val) => val.message);
        error = new ApiError(
            400,
            messages.length ? messages.join(". ") : "Validation failed."
        );
    } else if (!(error instanceof ApiError)) {
        const isProduction = process.env.NODE_ENV === "production";
        const statusCode = error?.statusCode || 500;
        // In production, mask unhandled 500 internal error details to prevent information leakage
        const message =
            isProduction && statusCode === 500
                ? "An unexpected internal server error occurred. Please try again later."
                : (error?.message || "Internal Server Error");

        error = new ApiError(statusCode, message);
    }

    return res.status(error.statusCode).json({
        success: error.success,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors || [],
    });
};

module.exports = errorHandler;
