const { body, param } = require("express-validator");

const {
    COURSE_STATUS,
    COURSE_VISIBILITY,
} = require("../constants/course.constants");

/*
|--------------------------------------------------------------------------
| Create Course
|--------------------------------------------------------------------------
*/

const createCourseValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Course title is required")
        .bail()
        .isLength({ min: 3, max: 150 })
        .withMessage(
            "Course title must be between 3 and 150 characters."
        ),

    body("courseCode")
        .trim()
        .notEmpty()
        .withMessage("Course code is required"),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .bail()
        .isLength({ min: 10 })
        .withMessage(
            "Description must be at least 10 characters."
        ),

    body("price")
        .optional()
        .isNumeric()
        .withMessage("Price must be a number."),

    body("duration")
        .optional()
        .isNumeric()
        .withMessage("Duration must be a number."),

    body("visibility")
        .optional()
        .isIn(Object.values(COURSE_VISIBILITY))
        .withMessage("Invalid visibility."),
];

/*
|--------------------------------------------------------------------------
| Update Course
|--------------------------------------------------------------------------
*/

const updateCourseValidator = [

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage(
            "Course title must be between 3 and 150 characters."
        ),

    body("courseCode")
        .optional()
        .trim(),

    body("description")
        .optional()
        .trim(),

    body("teacher")
        .optional()
        .isMongoId()
        .withMessage("Invalid teacher id."),

    body("price")
        .optional()
        .isNumeric(),

    body("duration")
        .optional()
        .isNumeric(),

    body("visibility")
        .optional()
        .isIn(Object.values(COURSE_VISIBILITY)),

];

/*
|--------------------------------------------------------------------------
| Course Id
|--------------------------------------------------------------------------
*/

const courseIdValidator = [

    param("courseId")
        .isMongoId()
        .withMessage("Invalid course id."),

];

/*
|--------------------------------------------------------------------------
| Publish Course
|--------------------------------------------------------------------------
*/

const publishCourseValidator = [

    body("status")
        .isIn(Object.values(COURSE_STATUS))
        .withMessage("Invalid course status."),

];

module.exports = {
    createCourseValidator,
    updateCourseValidator,
    courseIdValidator,
    publishCourseValidator,
};