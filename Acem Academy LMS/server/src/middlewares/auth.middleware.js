const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const STATUS = require("../constants/status");

const authenticate = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            throw new ApiError(401, "Authentication required");
        }

        const decodedToken = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );

        const user = await User.findOne({
            _id: decodedToken.id,
            isDeleted: false,
        }).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "User not found");
        }

        if (user.status !== STATUS.ACTIVE) {
            throw new ApiError(
                403,
                "Your account is inactive. Please contact the administrator."
            );
        }

        req.user = user;

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = authenticate;