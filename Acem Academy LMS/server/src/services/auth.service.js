const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const STATUS = require("../constants/status");
const { OTP_PURPOSES } = require("../constants/otp");
const {
    issueOtp,
    validateOtp,
    consumeOtp,
    deleteOtp,
} = require("./otp.service");

/* -------------------------------------------------------------------------- */
/*                           Private Helper Functions                          */
/* -------------------------------------------------------------------------- */

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const generateAccessToken = (userId, role) => {
    return jwt.sign(
        {
            id: userId,
            role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
        }
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        {
            id: userId,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
        }
    );
};

/* -------------------------------------------------------------------------- */
/*                               Register User                                */
/* -------------------------------------------------------------------------- */

const PUBLIC_REGISTRATION_FIELDS = ["fullName", "email", "password"];

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const registerUser = async (userData) => {
    const { password } = userData;
    const email = normalizeEmail(userData.email);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, "Email already registered");
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {};

    for (const field of PUBLIC_REGISTRATION_FIELDS) {
        newUser[field] = userData[field];
    }

    newUser.email = email;
    newUser.password = hashedPassword;
    newUser.isEmailVerified = false;

    const user = await User.create(newUser);

    try {
        await issueOtp(
            email,
            OTP_PURPOSES.EMAIL_VERIFICATION
        );
    } catch (error) {
        console.error(
            "Unable to issue email verification code:",
            error && error.message
        );
    }

    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken");

    return createdUser;
};

/* -------------------------------------------------------------------------- */
/*                                 Login User                                 */
/* -------------------------------------------------------------------------- */

const loginUser = async (loginData) => {
    const { password } = loginData;
    const email = normalizeEmail(loginData.email);

    const user = await User.findOne({
        email,
        isDeleted: false,
    }).select("+password +refreshToken");

    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    if (user.status !== STATUS.ACTIVE) {
        throw new ApiError(
            403,
            "Your account is inactive. Please contact the administrator."
        );
    }

    const isPasswordCorrect = await comparePassword(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid email or password");
    }

    if (user.isEmailVerified === false) {
        throw new ApiError(
            403,
            "Please verify your email address before signing in.",
            ["EMAIL_NOT_VERIFIED"]
        );
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken");

    return {
        user: loggedInUser,
        accessToken,
        refreshToken,
    };
};

/* -------------------------------------------------------------------------- */
/*                                 Logout User                                */
/* -------------------------------------------------------------------------- */

const logoutUser = async (userId) => {

    await User.findByIdAndUpdate(userId, {
        refreshToken: null,
    });

};

/* -------------------------------------------------------------------------- */
/*                           Refresh Access Token                             */
/* -------------------------------------------------------------------------- */

const refreshUserAccessToken = async (cookies) => {

    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
        throw new ApiError(401, "Refresh token not found");
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findOne({
        _id: decodedToken.id,
        isDeleted: false,
    }).select("+refreshToken");

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    if (user.refreshToken !== refreshToken) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (user.status !== STATUS.ACTIVE) {
        throw new ApiError(
            403,
            "Your account is inactive. Please contact the administrator."
        );
    }

    if (user.isEmailVerified === false) {
        throw new ApiError(
            403,
            "Please verify your email address before signing in."
        );
    }

    const accessToken = generateAccessToken(
        user._id,
        user.role
    );

    return {
        accessToken,
    };

};


/* -------------------------------------------------------------------------- */
/*                              Get User Profile                              */
/* -------------------------------------------------------------------------- */

const getUserProfile = async (user) => {
    return user;
};

/* -------------------------------------------------------------------------- */
/*                            Update User Profile                             */
/* -------------------------------------------------------------------------- */

const updateUserProfile = async (userId, body) => {

    const updates = {};

    if (body.fullName !== undefined) {
        updates.fullName = body.fullName;
    }

    if (body.email !== undefined) {
        const email = normalizeEmail(body.email);

        const existingUser = await User.findOne({
            email,
            _id: { $ne: userId },
        });

        if (existingUser) {
            throw new ApiError(409, "Email already registered");
        }

        updates.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updates,
        {
            new: true,
            runValidators: true,
        }
    ).select("-password -refreshToken");

    return updatedUser;

};


/* -------------------------------------------------------------------------- */
/*                           Change User Password                             */
/* -------------------------------------------------------------------------- */


const changeUserPassword = async (userId, body) => {

    const { oldPassword, newPassword } = body;

    const user = await User.findById(userId)
        .select("+password");

    const isPasswordCorrect = await comparePassword(
        oldPassword,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    if (oldPassword === newPassword) {
    throw new ApiError(
        400,
        "New password must be different from the old password"
    );
}

    const hashedPassword = await hashPassword(newPassword);

    await User.findByIdAndUpdate(userId, {
        password: hashedPassword,
        refreshToken: null,
    });

};


/* -------------------------------------------------------------------------- */
/*                            Verify Email Address                            */
/* -------------------------------------------------------------------------- */

const verifyEmail = async (body) => {
    const email = normalizeEmail(body.email);

    const user = await User.findOne({
        email,
        isDeleted: false,
    });

    if (!user) {
        throw new ApiError(
            400,
            "Invalid or expired verification code"
        );
    }

    await consumeOtp(
        email,
        OTP_PURPOSES.EMAIL_VERIFICATION,
        body.otp
    );

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            isEmailVerified: true,
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    await deleteOtp(
        email,
        OTP_PURPOSES.EMAIL_VERIFICATION
    );

    return updatedUser;
};

/* -------------------------------------------------------------------------- */
/*                        Resend Email Verification                           */
/* -------------------------------------------------------------------------- */

const resendVerificationEmail = async (body) => {
    const email = normalizeEmail(body.email);

    const user = await User.findOne({
        email,
        isDeleted: false,
    });

    if (user && user.isEmailVerified === false) {
        await issueOtp(
            email,
            OTP_PURPOSES.EMAIL_VERIFICATION
        );
    }

    return true;
};

/* -------------------------------------------------------------------------- */
/*                          Request Password Reset                            */
/* -------------------------------------------------------------------------- */

const requestPasswordReset = async (body) => {
    const email = normalizeEmail(body.email);

    const user = await User.findOne({
        email,
        isDeleted: false,
        status: STATUS.ACTIVE,
    });

    if (user && user.isEmailVerified !== false) {
        try {
            await issueOtp(
                email,
                OTP_PURPOSES.PASSWORD_RESET
            );
        } catch (error) {
            if (
                !error ||
                error.statusCode !== 429
            ) {
                throw error;
            }
        }
    }

    return true;
};

/* -------------------------------------------------------------------------- */
/*                            Reset User Password                             */
/* -------------------------------------------------------------------------- */

const resetUserPassword = async (body) => {
    const email = normalizeEmail(body.email);

    const user = await User.findOne({
        email,
        isDeleted: false,
        status: STATUS.ACTIVE,
    }).select("+password");

    if (!user || user.isEmailVerified === false) {
        throw new ApiError(
            400,
            "Invalid or expired reset code"
        );
    }

    await validateOtp(
        email,
        OTP_PURPOSES.PASSWORD_RESET,
        body.otp
    );

    const isSamePassword = await comparePassword(
        body.newPassword,
        user.password
    );

    if (isSamePassword) {
        throw new ApiError(
            400,
            "New password must be different from the old password"
        );
    }

    const hashedPassword = await hashPassword(
        body.newPassword
    );

    await consumeOtp(
        email,
        OTP_PURPOSES.PASSWORD_RESET,
        body.otp
    );

    await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        refreshToken: null,
    });

    await deleteOtp(
        email,
        OTP_PURPOSES.PASSWORD_RESET
    );
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshUserAccessToken,
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetUserPassword,
};