const express = require("express");

const lessonController = require("../controllers/lesson.controller");

const {
    createLessonValidator,
    updateLessonValidator,
    lessonIdValidator,
    publishLessonValidator,
} = require("../validators/lesson.validator");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    createLessonValidator,
    validate,
    lessonController.createLesson
);

/*
|--------------------------------------------------------------------------
| Get Lessons
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    lessonController.getLessons
);

/*
|--------------------------------------------------------------------------
| Get Lesson By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:lessonId",
    authenticate,
    lessonIdValidator,
    validate,
    lessonController.getLessonById
);

/*
|--------------------------------------------------------------------------
| Update Lesson
|--------------------------------------------------------------------------
*/

router.patch(
    "/:lessonId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    lessonIdValidator,
    updateLessonValidator,
    validate,
    lessonController.updateLesson
);

/*
|--------------------------------------------------------------------------
| Delete Lesson
|--------------------------------------------------------------------------
*/

router.delete(
    "/:lessonId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    lessonIdValidator,
    validate,
    lessonController.deleteLesson
);

/*
|--------------------------------------------------------------------------
| Publish Lesson
|--------------------------------------------------------------------------
*/

router.patch(
    "/:lessonId/publish",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    lessonIdValidator,
    publishLessonValidator,
    validate,
    lessonController.publishLesson
);

module.exports = router;