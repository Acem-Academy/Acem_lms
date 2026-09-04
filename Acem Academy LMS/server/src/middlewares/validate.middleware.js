const { validationResult } = require("express-validator");

const ApiError = require("../utils/ApiError");

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError(
            400,
            "Validation failed",
            errors.array().map((error) => error.msg)
        );
    }

    next();
};

module.exports = validate;