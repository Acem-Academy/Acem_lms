const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const {
    accessTokenCookieOptions,
    refreshTokenCookieOptions,
} = require("../constants/cookieOptions");
const authService = require("../services/auth.service");
const COOKIES = require("../constants/cookies");

const register = asyncHandler(async (req, res) => {
    const result = await authService.registerUser(req.body);

    return res
        .status(201)
        .json(new ApiResponse(201, result, "User registered successfully"));
});

const login = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } =
        await authService.loginUser(req.body);

    res
        .cookie(
            "accessToken",
            accessToken,
            accessTokenCookieOptions
        )
        .cookie(
            "refreshToken",
            refreshToken,
            refreshTokenCookieOptions
        )
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user,
                },
                "Login successful"
            )
        );
});

const logout = asyncHandler(async (req, res) => {

    await authService.logoutUser(req.user._id);

    res
        .clearCookie(
            COOKIES.ACCESS_TOKEN,
            accessTokenCookieOptions
        )
        .clearCookie(
            COOKIES.REFRESH_TOKEN,
            refreshTokenCookieOptions
        )
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Logout successful"
            )
        );

});

const refreshAccessToken = asyncHandler(async (req, res) => {

    const { accessToken } =
        await authService.refreshUserAccessToken(req.cookies);

    return res
        .cookie(
            COOKIES.ACCESS_TOKEN,
            accessToken,
            accessTokenCookieOptions
        )
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Access token refreshed successfully"
            )
        );

});

const verifyEmail = asyncHandler(async (req, res) => {

    await authService.verifyEmail(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Email verified successfully"
        )
    );

});

const resendVerification = asyncHandler(async (req, res) => {

    await authService.resendVerificationEmail(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "If an unverified account exists, a new verification code has been sent."
        )
    );

});

const forgotPassword = asyncHandler(async (req, res) => {

    await authService.requestPasswordReset(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "If an account exists with that email, a password reset code has been sent."
        )
    );

});

const resetPassword = asyncHandler(async (req, res) => {

    await authService.resetUserPassword(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Password reset successfully. Please sign in with your new password."
        )
    );

});

const getProfile = asyncHandler(async (req, res) => {

    const user = await authService.getUserProfile(req.user);

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Profile fetched successfully"
        )
    );

});

const updateProfile = asyncHandler(async (req, res) => {

    const user = await authService.updateUserProfile(
        req.user._id,
        req.body
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Profile updated successfully"
        )
    );

});

const changePassword = asyncHandler(async (req, res) => {

    await authService.changeUserPassword(
        req.user._id,
        req.body
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Password changed successfully"
        )
    );

});

module.exports = {
    register,
    login,
    logout,
    refreshAccessToken,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword,
};