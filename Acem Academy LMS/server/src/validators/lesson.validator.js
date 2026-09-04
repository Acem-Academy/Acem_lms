const { body, param } = require("express-validator");

const {
    LESSON_STATUS,
} = require("../constants/lesson.constants");

/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

const createLessonValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Lesson title is required.")
        .bail()
        .isLength({ min: 3, max: 200 })
        .withMessage(
            "Lesson title must be between 3 and 200 characters."
        ),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 3000 })
        .withMessage(
            "Description cannot exceed 3000 characters."
        ),

    body("topic")
        .notEmpty()
        .withMessage("Topic is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid topic id."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage(
            "Position must be greater than 0."
        ),

    body("isPreview")
        .optional()
        .isBoolean()
        .withMessage(
            "isPreview must be a boolean."
        ),

    body("video.url")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video URL."
        ),

    body("video.duration")
        .optional()
        .isInt({ min: 0 })
        .withMessage(
            "Video duration must be a positive number."
        ),

    body("video.thumbnail")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video thumbnail URL."
        ),

];

/*
|--------------------------------------------------------------------------
| Update Lesson
|--------------------------------------------------------------------------
*/

const updateLessonValidator = [

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage(
            "Lesson title must be between 3 and 200 characters."
        ),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 3000 })
        .withMessage(
            "Description cannot exceed 3000 characters."
        ),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage(
            "Position must be greater than 0."
        ),

    body("isPreview")
        .optional()
        .isBoolean()
        .withMessage(
            "isPreview must be a boolean."
        ),

    body("video.url")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video URL."
        ),

    body("video.duration")
        .optional()
        .isInt({ min: 0 })
        .withMessage(
            "Video duration must be a positive number."
        ),

    body("video.thumbnail")
        .optional()
        .trim()
        .isURL()
        .withMessage(
            "Invalid video thumbnail URL."
        ),

];

/*
|--------------------------------------------------------------------------
| Lesson Id
|--------------------------------------------------------------------------
*/

const lessonIdValidator = [

    param("lessonId")
        .isMongoId()
        .withMessage(
            "Invalid lesson id."
        ),

];

/*
|--------------------------------------------------------------------------
| Publish Lesson
|--------------------------------------------------------------------------
*/

const publishLessonValidator = [

    body("status")
        .isIn(Object.values(LESSON_STATUS))
        .withMessage(
            "Invalid lesson status."
        ),

];

module.exports = {
    createLessonValidator,
    updateLessonValidator,
    lessonIdValidator,
    publishLessonValidator,
};