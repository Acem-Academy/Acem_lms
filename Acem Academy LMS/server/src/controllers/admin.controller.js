const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const {
    getDashboardStats,
    getAllUsers,
    updateUser,
    getAllCourses,
} = require("../services/admin.service");

/*
|--------------------------------------------------------------------------
| Admin Controller - HTTP handlers for admin endpoints
|--------------------------------------------------------------------------
*/

const dashboardStats = asyncHandler(async (req, res) => {
    const stats = await getDashboardStats();
    return res.status(200).json(
        new ApiResponse(200, stats, "Dashboard stats retrieved successfully")
    );
});

const listUsers = asyncHandler(async (req, res) => {
    const usersData = await getAllUsers(req.query);
    return res.status(200).json(
        new ApiResponse(200, usersData, "Users retrieved successfully")
    );
});

const handleUpdateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, status } = req.body;

    if (!role && !status) {
        throw new ApiError(400, "Either role or status must be provided");
    }

    const updatedUser = await updateUser(id, { role, status }, req.user);
    return res.status(200).json(
        new ApiResponse(200, updatedUser, "User updated successfully")
    );
});

const listCourses = asyncHandler(async (req, res) => {
    const coursesData = await getAllCourses(req.query);
    return res.status(200).json(
        new ApiResponse(200, coursesData, "Courses retrieved successfully")
    );
});

module.exports = {
    dashboardStats,
    listUsers,
    updateUser: handleUpdateUser,
    listCourses,
};
