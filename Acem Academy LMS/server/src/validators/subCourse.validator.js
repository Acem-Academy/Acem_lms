const { body, param } = require("express-validator");

const {
    SUBCOURSE_STATUS,
} = require("../constants/subCourse.constants");

/*
|--------------------------------------------------------------------------
| Create Sub Course
|--------------------------------------------------------------------------
*/

const createSubCourseValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Sub Course title is required.")
        .bail()
        .isLength({ min: 3, max: 150 })
        .withMessage("Sub Course title must be between 3 and 150 characters."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),

    body("course")
        .notEmpty()
        .withMessage("Course is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid course id."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Position must be greater than 0."),

];

/*
|--------------------------------------------------------------------------
| Update Sub Course
|--------------------------------------------------------------------------
*/

const updateSubCourseValidator = [

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage("Sub Course title must be between 3 and 150 characters."),

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
| Sub Course Id
|--------------------------------------------------------------------------
*/

const subCourseIdValidator = [

    param("subCourseId")
        .isMongoId()
        .withMessage("Invalid Sub Course Id."),

];

/*
|--------------------------------------------------------------------------
| Publish Sub Course
|--------------------------------------------------------------------------
*/

const publishSubCourseValidator = [

    body("status")
        .isIn(Object.values(SUBCOURSE_STATUS))
        .withMessage("Invalid Sub Course status."),

];

module.exports = {
    createSubCourseValidator,
    updateSubCourseValidator,
    subCourseIdValidator,
    publishSubCourseValidator,
};