const { body, param } = require("express-validator");

const {
    CHAPTER_STATUS,
} = require("../constants/chapter.constants");

/*
|--------------------------------------------------------------------------
| Create Chapter
|--------------------------------------------------------------------------
*/

const createChapterValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Chapter title is required.")
        .bail()
        .isLength({ min: 3, max: 150 })
        .withMessage("Chapter title must be between 3 and 150 characters."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),

    body("subCourse")
        .notEmpty()
        .withMessage("Sub Course is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid Sub Course id."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Position must be greater than 0."),

];

/*
|--------------------------------------------------------------------------
| Update Chapter
|--------------------------------------------------------------------------
*/

const updateChapterValidator = [

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage("Chapter title must be between 3 and 150 characters."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Position must be greater than 0."),

];

/*
|--------------------------------------------------------------------------
| Chapter Id
|--------------------------------------------------------------------------
*/

const chapterIdValidator = [

    param("chapterId")
        .isMongoId()
        .withMessage("Invalid Chapter id."),

];

/*
|--------------------------------------------------------------------------
| Publish Chapter
|--------------------------------------------------------------------------
*/

const publishChapterValidator = [

    body("status")
        .isIn(Object.values(CHAPTER_STATUS))
        .withMessage("Invalid Chapter status."),

];

module.exports = {
    createChapterValidator,
    updateChapterValidator,
    chapterIdValidator,
    publishChapterValidator,
};