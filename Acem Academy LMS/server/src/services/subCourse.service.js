const SubCourse = require("../models/subCourse.model");
const Course = require("../models/course.model");

const ApiError = require("../utils/ApiError");

const {
    COURSE_STATUS,
} = require("../constants/course.constants");

const {
    SUBCOURSE_STATUS,
} = require("../constants/subCourse.constants");


/*
|--------------------------------------------------------------------------
| Create Sub Course
|--------------------------------------------------------------------------
*/

const createSubCourse = async (
    subCourseData,
    user
) => {

    /*
    |--------------------------------------------------------------------------
    | Check Course Exists
    |--------------------------------------------------------------------------
    */

    const course = await Course.findOne({
        _id: subCourseData.course,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(
            404,
            "Course not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Check Course Published
    |--------------------------------------------------------------------------
    */

    if (course.status !== COURSE_STATUS.PUBLISHED) {
        throw new ApiError(
            400,
            "Course is not published."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Auto Generate Position
    |--------------------------------------------------------------------------
    */

    if (!subCourseData.position) {

        const lastSubCourse = await SubCourse
            .findOne({
                course: course._id,
                isDeleted: false,
            })
            .sort({
                position: -1,
            });

        subCourseData.position = lastSubCourse
            ? lastSubCourse.position + 1
            : 1;
    }

    /*
    |--------------------------------------------------------------------------
    | Check Duplicate Position
    |--------------------------------------------------------------------------
    */

    const existingPosition = await SubCourse.findOne({
        course: course._id,
        position: subCourseData.position,
        isDeleted: false,
    });

    if (existingPosition) {
        throw new ApiError(
            409,
            "Position already exists."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Sub Course
    |--------------------------------------------------------------------------
    */

    const subCourse = await SubCourse.create({

        ...subCourseData,

        createdBy: user._id,

        updatedBy: user._id,

    });

    return subCourse;

};

/*
|--------------------------------------------------------------------------
| Get Sub Courses
|--------------------------------------------------------------------------
*/

const getSubCourses = async (courseId) => {

    const filter = {
        isDeleted: false,
    };

    if (courseId) {
        filter.course = courseId;
    }

    const subCourses = await SubCourse.find(filter)
        .populate(
            "course",
            "title courseCode"
        )
        .sort({
            position: 1,
        });

    return subCourses;

};

/*
|--------------------------------------------------------------------------
| Get Sub Course By Id
|--------------------------------------------------------------------------
*/

const getSubCourseById = async (
    subCourseId
) => {

    const subCourse = await SubCourse.findOne({
        _id: subCourseId,
        isDeleted: false,
    }).populate(
        "course",
        "title courseCode"
    );

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    return subCourse;

};

/*
|--------------------------------------------------------------------------
| Update Sub Course
|--------------------------------------------------------------------------
*/

const updateSubCourse = async (
    subCourseId,
    updateData,
    user
) => {

    const subCourse = await SubCourse.findOne({
        _id: subCourseId,
        isDeleted: false,
    });

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    if (
        updateData.position &&
        updateData.position !== subCourse.position
    ) {

        const existingPosition = await SubCourse.findOne({
            course: subCourse.course,
            position: updateData.position,
            isDeleted: false,
        });

        if (existingPosition) {
            throw new ApiError(
                409,
                "Position already exists."
            );
        }

    }

    Object.assign(
        subCourse,
        updateData
    );

    subCourse.updatedBy = user._id;

    await subCourse.save();

    return subCourse;

};

/*
|--------------------------------------------------------------------------
| Delete Sub Course
|--------------------------------------------------------------------------
*/

const deleteSubCourse = async (
    subCourseId,
    user
) => {

    const subCourse = await SubCourse.findOne({
        _id: subCourseId,
        isDeleted: false,
    });

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    subCourse.isDeleted = true;

    subCourse.updatedBy = user._id;

    await subCourse.save();

};

/*
|--------------------------------------------------------------------------
| Publish Sub Course
|--------------------------------------------------------------------------
*/

const publishSubCourse = async (
    subCourseId,
    body,
    user
) => {

    const subCourse = await SubCourse.findOne({
        _id: subCourseId,
        isDeleted: false,
    });

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    subCourse.status = body.status;

    subCourse.updatedBy = user._id;

    await subCourse.save();

    return subCourse;

};

module.exports = {
    createSubCourse,
    getSubCourses,
    getSubCourseById,
    updateSubCourse,
    deleteSubCourse,
    publishSubCourse,
};