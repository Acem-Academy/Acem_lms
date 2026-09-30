const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const enrollmentService = require("../services/enrollment.service");

/*
|--------------------------------------------------------------------------
| Enroll Student
|--------------------------------------------------------------------------
*/

const enrollStudent = asyncHandler(async (req, res) => {

    const enrollment = await enrollmentService.enrollStudent(
        req.body,
        req.user
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            enrollment,
            "Course enrolled successfully."
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get My Courses
|--------------------------------------------------------------------------
*/

const getMyCourses = asyncHandler(async (req, res) => {

    const courses = await enrollmentService.getMyCourses(
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            courses,
            "Enrolled courses fetched successfully."
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Enrollment By Id
|--------------------------------------------------------------------------
*/

const getEnrollmentById = asyncHandler(async (req, res) => {

    const enrollment = await enrollmentService.getEnrollmentById(
        req.params.enrollmentId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            enrollment,
            "Enrollment fetched successfully."
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get All Enrollments
|--------------------------------------------------------------------------
*/

const getAllEnrollments = asyncHandler(async (req, res) => {

    const enrollments = await enrollmentService.getAllEnrollments();

    return res.status(200).json(
        new ApiResponse(
            200,
            enrollments,
            "Enrollments fetched successfully."
        )
    );

});

/*
|--------------------------------------------------------------------------
| Cancel Enrollment
|--------------------------------------------------------------------------
*/

const cancelEnrollment = asyncHandler(async (req, res) => {

    const enrollment = await enrollmentService.cancelEnrollment(
        req.params.enrollmentId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            enrollment,
            "Enrollment cancelled successfully."
        )
    );

});

/*
|--------------------------------------------------------------------------
| Start Lesson
|--------------------------------------------------------------------------
*/

const startLesson = asyncHandler(async (req, res) => {

    const enrollment = await enrollmentService.startLesson(
        req.params.enrollmentId,
        req.params.lessonId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            enrollment,
            "Lesson started successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Complete Lesson
|--------------------------------------------------------------------------
*/

const completeLesson = asyncHandler(async (req, res) => {

    const enrollment = await enrollmentService.completeLesson(
        req.params.enrollmentId,
        req.params.lessonId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            enrollment,
            "Lesson completed successfully"
        )
    );

});


/*
|--------------------------------------------------------------------------
| Get Teacher Students
|--------------------------------------------------------------------------
*/

const getTeacherStudents = asyncHandler(async (req, res) => {

    const students =
        await enrollmentService.getTeacherStudents(
            req.user._id
        );

    return res.status(200).json(
        new ApiResponse(
            200,
            students,
            "Teacher students fetched successfully."
        )
    );

});

module.exports = {
    enrollStudent,
    getMyCourses,
    getEnrollmentById,
    getAllEnrollments,
    cancelEnrollment,
    startLesson,
    completeLesson,
    getTeacherStudents,
};