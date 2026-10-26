const ApiError = require("../utils/ApiError");
const User = require("../models/User");
const Course = require("../models/course.model");
const Enrollment = require("../models/enrollment.model");
const ROLES = require("../constants/roles");
const STATUS = require("../constants/status");

/*
|--------------------------------------------------------------------------
| Admin Service - backend admin functions
|--------------------------------------------------------------------------
*/

const getDashboardStats = async () => {
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const totalCourses = await Course.countDocuments({ isDeleted: false });
    const totalEnrollments = await Enrollment.countDocuments();
    const activeUsers = await User.countDocuments({
        isDeleted: false,
        status: STATUS.ACTIVE,
    });

    const usersByRole = await User.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $project: { role: "$_id", count: 1, _id: 0 } },
    ]);

    const coursesByStatus = await Course.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
    ]);

    const enrollmentsByCourse = await Enrollment.aggregate([
        { $group: { _id: "$course", count: { $sum: 1 } } },
        {
            $lookup: {
                from: "courses",
                localField: "_id",
                foreignField: "_id",
                as: "courseInfo",
            },
        },
        { $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                courseId: "$_id",
                title: { $ifNull: ["$courseInfo.title", "Unknown Course"] },
                courseCode: { $ifNull: ["$courseInfo.courseCode", ""] },
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    return {
        totalUsers,
        totalCourses,
        totalEnrollments,
        activeUsers,
        usersByRole,
        coursesByStatus,
        enrollmentsByCourse,
    };
};

const getAllUsers = async (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (query.role) {
        filter.role = query.role;
    }
    if (query.status) {
        filter.status = query.status;
    }
    if (query.isEmailVerified !== undefined) {
        filter.isEmailVerified = query.isEmailVerified === "true" || query.isEmailVerified === true;
    }
    if (query.search && query.search.trim()) {
        const regex = new RegExp(query.search.trim(), "i");
        filter.$or = [{ fullName: regex }, { email: regex }];
    }

    const users = await User.find(filter)
        .select("-password -refreshToken")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return {
        users,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        total,
    };
};

const updateUser = async (userId, { role, status }, requestingUser) => {
    if (requestingUser._id.toString() === userId.toString()) {
        if (role && role !== requestingUser.role) {
            throw new ApiError(400, "Cannot change your own role.");
        }
        if (status && status !== STATUS.ACTIVE) {
            throw new ApiError(400, "Cannot deactivate your own account.");
        }
    }

    const targetUser = await User.findOne({ _id: userId, isDeleted: false });
    if (!targetUser) {
        throw new ApiError(404, "User not found.");
    }

    // Role guard: prevent removing/demoting the last active administrator
    if (role && role !== ROLES.ADMIN && targetUser.role === ROLES.ADMIN) {
        const activeAdminCount = await User.countDocuments({
            role: ROLES.ADMIN,
            status: STATUS.ACTIVE,
            isDeleted: false,
        });
        if (activeAdminCount <= 1) {
            throw new ApiError(
                400,
                "Cannot demote the last active administrator. There must be at least one active admin."
            );
        }
    }

    // Status guard: prevent deactivating the last active administrator
    if (
        status &&
        status === STATUS.INACTIVE &&
        targetUser.role === ROLES.ADMIN &&
        targetUser.status === STATUS.ACTIVE
    ) {
        const activeAdminCount = await User.countDocuments({
            role: ROLES.ADMIN,
            status: STATUS.ACTIVE,
            isDeleted: false,
        });
        if (activeAdminCount <= 1) {
            throw new ApiError(
                400,
                "Cannot deactivate the last active administrator. There must be at least one active admin."
            );
        }
    }

    if (role) {
        targetUser.role = role;
    }
    if (status) {
        targetUser.status = status;
    }

    targetUser.updatedBy = requestingUser._id;
    await targetUser.save();

    const sanitizedUser = targetUser.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;

    return sanitizedUser;
};

const getAllCourses = async (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (query.status) {
        filter.status = query.status;
    }
    if (query.visibility) {
        filter.visibility = query.visibility;
    }
    if (query.teacher) {
        filter.teacher = query.teacher;
    }
    if (query.search && query.search.trim()) {
        const regex = new RegExp(query.search.trim(), "i");
        filter.$or = [{ title: regex }, { courseCode: regex }];
    }

    const courses = await Course.find(filter)
        .populate("teacher", "fullName email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    return {
        courses,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        total,
    };
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    updateUser,
    getAllCourses,
};
