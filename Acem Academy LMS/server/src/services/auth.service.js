const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const STATUS = require("../constants/status");

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

const registerUser = async (userData) => {
    const { email, password } = userData;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, "Email already registered");
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
        ...userData,
        password: hashedPassword,
    });

    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken");

    return createdUser;
};

/* -------------------------------------------------------------------------- */
/*                                 Login User                                 */
/* -------------------------------------------------------------------------- */

const loginUser = async (loginData) => {
    const { email, password } = loginData;

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

    const user = await User.findById(decodedToken.id)
        .select("+refreshToken");

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

    const { fullName } = body;

    await User.findByIdAndUpdate(
        userId,
        {
            fullName,
        }
    );

    const updatedUser = await User.findById(userId)
        .select("-password -refreshToken");

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
    });

};


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshUserAccessToken,
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
};