const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const courseService = require("../services/course.service");

const createCourse = asyncHandler(async (req, res) => {

    const course = await courseService.createCourse(
        req.body,
        req.user
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            course,
            "Course created successfully"
        )
    );

});

const getCourses = asyncHandler(async (req, res) => {

    const courses = await courseService.getCourses(req.query);

    return res.status(200).json(
        new ApiResponse(
            200,
            courses,
            "Courses fetched successfully"
        )
    );

});

const getMyCourses = asyncHandler(async (req, res) => {

    const courses = await courseService.getMyCourses(
        req.user._id
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            courses,
            "Your courses fetched successfully"
        )
    );

});


const getCourseById = asyncHandler(async (req, res) => {

    const course = await courseService.getCourseById(
        req.params.courseId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            course,
            "Course fetched successfully"
        )
    );

});

const updateCourse = asyncHandler(async (req, res) => {

    const course = await courseService.updateCourse(
        req.params.courseId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            course,
            "Course updated successfully"
        )
    );

});

const deleteCourse = asyncHandler(async (req, res) => {

    await courseService.deleteCourse(
        req.params.courseId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Course deleted successfully"
        )
    );

});

const publishCourse = asyncHandler(async (req, res) => {

    const course = await courseService.publishCourse(
        req.params.courseId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            course,
            "Course published successfully"
        )
    );

});

module.exports = {
    createCourse,
    getCourses,
    getMyCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    publishCourse,
};