const { body } = require("express-validator");

const registerValidator = [
    body("fullName")
        .trim()
        .notEmpty()
        .withMessage("Full name is required")
        .bail(),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .bail()
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters"),
];

const loginValidator = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required"),
];

const verifyEmailValidator = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("otp")
        .trim()
        .notEmpty()
        .withMessage("Verification code is required")
        .bail()
        .matches(/^\d{6}$/)
        .withMessage("Verification code must be 6 digits"),
];

const resendVerificationValidator = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email"),
];

const forgotPasswordValidator = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email"),
];

const resetPasswordValidator = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("otp")
        .trim()
        .notEmpty()
        .withMessage("Reset code is required")
        .bail()
        .matches(/^\d{6}$/)
        .withMessage("Reset code must be 6 digits"),

    body("newPassword")
        .notEmpty()
        .withMessage("New password is required")
        .bail()
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters"),
];

const changePasswordValidator = [
    body("oldPassword")
        .notEmpty()
        .withMessage("Old password is required")
        .bail(),

    body("newPassword")
        .notEmpty()
        .withMessage("New password is required")
        .bail()
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters"),
];

const updateProfileValidator = [
    body("fullName")
        .trim()
        .notEmpty()
        .withMessage("Full name is required")
        .bail()
        .isLength({ min: 3 })
        .withMessage("Full name must be at least 3 characters"),

    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email"),
];

module.exports = {
    registerValidator,
    loginValidator,
    verifyEmailValidator,
    resendVerificationValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changePasswordValidator,
    updateProfileValidator,
};