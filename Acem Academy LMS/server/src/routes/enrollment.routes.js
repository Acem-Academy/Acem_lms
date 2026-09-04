const express = require("express");

const enrollmentController = require("../controllers/enrollment.controller");

const {
    enrollStudentValidator,
    enrollmentIdValidator,
} = require("../validators/enrollment.validator");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Enroll Student
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.STUDENT),
    enrollStudentValidator,
    validate,
    enrollmentController.enrollStudent
);

/*
|--------------------------------------------------------------------------
| Get My Courses
|--------------------------------------------------------------------------
*/

router.get(
    "/my-courses",
    authenticate,
    authorize(ROLES.STUDENT),
    enrollmentController.getMyCourses
);

/*
|--------------------------------------------------------------------------
| Get Enrollment By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:enrollmentId",
    authenticate,
    enrollmentIdValidator,
    validate,
    enrollmentController.getEnrollmentById
);

/*
|--------------------------------------------------------------------------
| Get All Enrollments
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    authorize(ROLES.ADMIN),
    enrollmentController.getAllEnrollments
);

/*
|--------------------------------------------------------------------------
| Cancel Enrollment
|--------------------------------------------------------------------------
*/

router.patch(
    "/:enrollmentId/cancel",
    authenticate,
    authorize(ROLES.STUDENT),
    enrollmentIdValidator,
    validate,
    enrollmentController.cancelEnrollment
);


/*
|--------------------------------------------------------------------------
| Start Lesson
|--------------------------------------------------------------------------
*/

router.post(
    "/:enrollmentId/lessons/:lessonId/start",
    authenticate,
    enrollmentController.startLesson
);

/*
|--------------------------------------------------------------------------
| Complete Lesson
|--------------------------------------------------------------------------
*/

router.post(
    "/:enrollmentId/lessons/:lessonId/complete",
    authenticate,
    enrollmentController.completeLesson
);

module.exports = router;