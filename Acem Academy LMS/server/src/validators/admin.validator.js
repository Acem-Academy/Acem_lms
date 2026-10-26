const { body, query, param } = require("express-validator");
const ROLES = require("../constants/roles");
const STATUS = require("../constants/status");
const { COURSE_STATUS, COURSE_VISIBILITY } = require("../constants/course.constants");

/*
|--------------------------------------------------------------------------
| Admin Validators
|--------------------------------------------------------------------------
*/

const dashboardStatsValidator = [
    query("range").optional().isString().trim(),
];

const listUsersValidator = [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("role").optional().isIn(Object.values(ROLES)).withMessage("Invalid role"),
    query("status").optional().isIn(Object.values(STATUS)).withMessage("Invalid status"),
    query("isEmailVerified").optional().isBoolean().withMessage("isEmailVerified must be a boolean"),
    query("search").optional().isString().trim(),
];

const updateUserValidator = [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("role").optional().isIn(Object.values(ROLES)).withMessage("Invalid role"),
    body("status").optional().isIn(Object.values(STATUS)).withMessage("Invalid status"),
    body().custom((value) => {
        if (!value.role && !value.status) {
            throw new Error("Either role or status must be provided");
        }
        return true;
    }),
];

const listCoursesValidator = [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("status").optional().isIn(Object.values(COURSE_STATUS)).withMessage("Invalid status"),
    query("visibility").optional().isIn(Object.values(COURSE_VISIBILITY)).withMessage("Invalid visibility"),
    query("teacher").optional().isMongoId().withMessage("Invalid teacher ID"),
    query("search").optional().isString().trim(),
];

module.exports = {
    dashboardStatsValidator,
    listUsersValidator,
    updateUserValidator,
    listCoursesValidator,
};
