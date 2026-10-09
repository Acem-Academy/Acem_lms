const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {

    console.error("========== ERROR ==========");
    console.error(err);
    console.error(err.stack);
    console.error("===========================");

    let error = err;

    if (
        error &&
        error.code === 11000
    ) {
        error = new ApiError(
            409,
            "Duplicate value. The resource already exists."
        );
    } else if (!(error instanceof ApiError)) {
        error = new ApiError(
            error.statusCode || 500,
            error.message || "Internal Server Error"
        );
    }

    return res.status(error.statusCode).json({
        success: error.success,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors || [],
    });

};

module.exports = errorHandler;