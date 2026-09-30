const express = require("express");

const courseController = require("../controllers/course.controller");

const {
    createCourseValidator,
    updateCourseValidator,
    courseIdValidator,
    publishCourseValidator,
} = require("../validators/course.validation");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");
const upload = require("../middlewares/upload.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Create Course
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    upload.single("thumbnail"),
    createCourseValidator,
    validate,
    courseController.createCourse
);

/*
|--------------------------------------------------------------------------
| Get Courses
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    courseController.getCourses
);

/*
|--------------------------------------------------------------------------
| Get My Courses - Teacher
|--------------------------------------------------------------------------
*/

router.get(
    "/my-courses",
    authenticate,
    authorize(ROLES.TEACHER),
    courseController.getMyCourses
);

/*
|--------------------------------------------------------------------------
| Get Course By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:courseId",
    authenticate,
    courseIdValidator,
    validate,
    courseController.getCourseById
);

/*
|--------------------------------------------------------------------------
| Update Course
|--------------------------------------------------------------------------
*/

router.patch(
    "/:courseId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    courseIdValidator,
    upload.single("thumbnail"),
    updateCourseValidator,
    validate,
    courseController.updateCourse
);

/*
|--------------------------------------------------------------------------
| Delete Course
|--------------------------------------------------------------------------
*/

router.delete(
    "/:courseId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    courseIdValidator,
    validate,
    courseController.deleteCourse
);

/*
|--------------------------------------------------------------------------
| Publish Course
|--------------------------------------------------------------------------
*/

router.patch(
    "/:courseId/publish",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    courseIdValidator,
    publishCourseValidator,
    validate,
    courseController.publishCourse
);


module.exports = router;