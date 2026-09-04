const express = require("express");

const subCourseController = require("../controllers/subCourse.controller");

const {
    createSubCourseValidator,
    updateSubCourseValidator,
    subCourseIdValidator,
    publishSubCourseValidator,
} = require("../validators/subCourse.validator");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Create Sub Course
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    createSubCourseValidator,
    validate,
    subCourseController.createSubCourse
);

/*
|--------------------------------------------------------------------------
| Get Sub Courses
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    subCourseController.getSubCourses
);

/*
|--------------------------------------------------------------------------
| Get Sub Course By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:subCourseId",
    authenticate,
    subCourseIdValidator,
    validate,
    subCourseController.getSubCourseById
);

/*
|--------------------------------------------------------------------------
| Update Sub Course
|--------------------------------------------------------------------------
*/

router.patch(
    "/:subCourseId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    subCourseIdValidator,
    updateSubCourseValidator,
    validate,
    subCourseController.updateSubCourse
);

/*
|--------------------------------------------------------------------------
| Delete Sub Course
|--------------------------------------------------------------------------
*/

router.delete(
    "/:subCourseId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    subCourseIdValidator,
    validate,
    subCourseController.deleteSubCourse
);

/*
|--------------------------------------------------------------------------
| Publish Sub Course
|--------------------------------------------------------------------------
*/

router.patch(
    "/:subCourseId/publish",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    subCourseIdValidator,
    publishSubCourseValidator,
    validate,
    subCourseController.publishSubCourse
);

module.exports = router;