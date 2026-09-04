const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const subCourseService = require("../services/subCourse.service");

/*
|--------------------------------------------------------------------------
| Create Sub Course
|--------------------------------------------------------------------------
*/

const createSubCourse = asyncHandler(async (req, res) => {

    const subCourse = await subCourseService.createSubCourse(
        req.body,
        req.user
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            subCourse,
            "Sub Course created successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Sub Courses
|--------------------------------------------------------------------------
*/

const getSubCourses = asyncHandler(async (req, res) => {

    const subCourses = await subCourseService.getSubCourses(
        req.query.course
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            subCourses,
            "Sub Courses fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Sub Course By Id
|--------------------------------------------------------------------------
*/

const getSubCourseById = asyncHandler(async (req, res) => {

    const subCourse = await subCourseService.getSubCourseById(
        req.params.subCourseId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            subCourse,
            "Sub Course fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Update Sub Course
|--------------------------------------------------------------------------
*/

const updateSubCourse = asyncHandler(async (req, res) => {

    const subCourse = await subCourseService.updateSubCourse(
        req.params.subCourseId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            subCourse,
            "Sub Course updated successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Delete Sub Course
|--------------------------------------------------------------------------
*/

const deleteSubCourse = asyncHandler(async (req, res) => {

    await subCourseService.deleteSubCourse(
        req.params.subCourseId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Sub Course deleted successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Publish Sub Course
|--------------------------------------------------------------------------
*/

const publishSubCourse = asyncHandler(async (req, res) => {

    const subCourse = await subCourseService.publishSubCourse(
        req.params.subCourseId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            subCourse,
            "Sub Course published successfully"
        )
    );

});

module.exports = {
    createSubCourse,
    getSubCourses,
    getSubCourseById,
    updateSubCourse,
    deleteSubCourse,
    publishSubCourse,
};