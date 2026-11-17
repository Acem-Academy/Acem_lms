const express = require("express");
const {
    registerValidator,
    loginValidator,
    verifyEmailValidator,
    resendVerificationValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changePasswordValidator,
    updateProfileValidator
} = require("../validators/auth.validator");
const authenticate = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate.middleware");
const { authLimiter, otpLimiter } = require("../middlewares/rateLimiter.middleware");

const router = express.Router();

// Public Routes
router.post(
    "/register",
    authLimiter,
    registerValidator,
    validate,
    authController.register
);
router.post(
    "/login",
    authLimiter,
    loginValidator,
    validate,
    authController.login
);
router.post(
    "/refresh-token",
    authController.refreshAccessToken
);
router.post(
    "/verify-email",
    otpLimiter,
    verifyEmailValidator,
    validate,
    authController.verifyEmail
);
router.post(
    "/resend-verification",
    otpLimiter,
    resendVerificationValidator,
    validate,
    authController.resendVerification
);
router.post(
    "/forgot-password",
    authLimiter,
    forgotPasswordValidator,
    validate,
    authController.forgotPassword
);
router.post(
    "/reset-password",
    authLimiter,
    resetPasswordValidator,
    validate,
    authController.resetPassword
);

// Protected Routes
router.post(
    "/logout",
    authenticate,
    authController.logout
);
router.get(
    "/profile",
    authenticate,
    authController.getProfile
);
router.patch(
    "/profile",
    authenticate,
    updateProfileValidator,
    validate,
    authController.updateProfile
);
router.patch(
    "/change-password",
    authenticate,
    changePasswordValidator,
    validate,
    authController.changePassword
);

module.exports = router;
