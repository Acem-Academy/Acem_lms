const { body, param } = require("express-validator");

/*
|--------------------------------------------------------------------------
| Enroll Student
|--------------------------------------------------------------------------
*/

const enrollStudentValidator = [

    body("course")
        .notEmpty()
        .withMessage("Course is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid course id."),

];

/*
|--------------------------------------------------------------------------
| Enrollment Id
|--------------------------------------------------------------------------
*/

const enrollmentIdValidator = [

    param("enrollmentId")
        .isMongoId()
        .withMessage("Invalid enrollment id."),

];

module.exports = {
    enrollStudentValidator,
    enrollmentIdValidator,
};