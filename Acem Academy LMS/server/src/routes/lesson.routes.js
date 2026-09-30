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
const upload = require("../middlewares/upload.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

const parseLessonMultipart = (req, res, next) => {
    /*
    |--------------------------------------------------------------------------
    | Parse Video Data
    |--------------------------------------------------------------------------
    */

    const rawVideoData = req.body.videoData;

    if (typeof rawVideoData === "string") {
        try {
            req.body.video = JSON.parse(rawVideoData);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid video data.",
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Parse Existing Attachments
    |--------------------------------------------------------------------------
    */

    const rawExistingAttachments =
        req.body.existingAttachments;

    if (typeof rawExistingAttachments === "string") {
        try {
            req.body.existingAttachments =
                JSON.parse(rawExistingAttachments);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid existing attachments data.",
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Parse Quiz Data
    |--------------------------------------------------------------------------
    |
    | Quiz is sent as JSON string because the lesson request uses
    | multipart/form-data.
    |
    */

    const rawQuizData = req.body.quiz;

    if (typeof rawQuizData === "string") {
        try {
            req.body.quiz = JSON.parse(rawQuizData);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz data.",
            });
        }
    }

    next();
};
/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "attachments", maxCount: 10 },
    ]),
    parseLessonMultipart,
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
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "attachments", maxCount: 10 },
    ]),
    parseLessonMultipart,
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