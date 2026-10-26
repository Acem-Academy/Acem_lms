const express = require("express");

const {
    dashboardStatsValidator,
    listUsersValidator,
    updateUserValidator,
    listCoursesValidator,
} = require("../validators/admin.validator");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");
const adminController = require("../controllers/admin.controller");
const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Admin Dashboard
|--------------------------------------------------------------------------
*/

router.get(
    "/dashboard",
    authenticate,
    authorize(ROLES.ADMIN),
    dashboardStatsValidator,
    validate,
    adminController.dashboardStats
);

/*
|--------------------------------------------------------------------------
| Users Management
|--------------------------------------------------------------------------
*/

router.get(
    "/users",
    authenticate,
    authorize(ROLES.ADMIN),
    listUsersValidator,
    validate,
    adminController.listUsers
);

router.patch(
    "/users/:id",
    authenticate,
    authorize(ROLES.ADMIN),
    updateUserValidator,
    validate,
    adminController.updateUser
);

/*
|--------------------------------------------------------------------------
| Courses Management
|--------------------------------------------------------------------------
*/

router.get(
    "/courses",
    authenticate,
    authorize(ROLES.ADMIN),
    listCoursesValidator,
    validate,
    adminController.listCourses
);

module.exports = router;
