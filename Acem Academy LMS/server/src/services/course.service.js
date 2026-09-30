const Course = require("../models/course.model");
const ApiError = require("../utils/ApiError");
const STATUS = require("../constants/status");
const ROLES = require("../constants/roles");

const {
    COURSE_STATUS,
} = require("../constants/course.constants");

const { uploadToCloudinary } = require("../utils/cloudinary");

/* -------------------------------------------------------------------------- */
/*                              Create Course                                 */
/* -------------------------------------------------------------------------- */

const createCourse = async (courseData, file, user) => {

    const existingCourse = await Course.findOne({
        courseCode: courseData.courseCode,
        isDeleted: false,
    });

    if (existingCourse) {
        throw new ApiError(
            409,
            "Course code already exists"
        );
    }

    let thumbnail = "";

    /*
    |--------------------------------------------------------------------------
    | Upload Thumbnail
    |--------------------------------------------------------------------------
    */

    if (file) {
        const uploaded = await uploadToCloudinary(
            file.buffer,
            {
                folder: "acem-academy/courses",
                resource_type: "image",
            }
        );

        thumbnail = uploaded.secure_url;
    }

    /*
    |--------------------------------------------------------------------------
    | Create Course
    |--------------------------------------------------------------------------
    |
    | Teacher is automatically taken from authenticated user.
    | Frontend does NOT need to send teacher.
    |
    */

    const course = await Course.create({
        ...courseData,

        teacher: user._id,

        thumbnail,

        createdBy: user._id,

        updatedBy: user._id,
    });

    return course;
};

/* -------------------------------------------------------------------------- */
/*                               Get Courses                                  */
/* -------------------------------------------------------------------------- */

const getCourses = async () => {

    return await Course.find({
        isDeleted: false,
    })
        .populate("teacher", "fullName email")
        .sort({ createdAt: -1 });

};

/* -------------------------------------------------------------------------- */
/*                            Get My Courses                                  */
/* -------------------------------------------------------------------------- */

const getMyCourses = async (teacherId) => {

    return await Course.find({
        teacher: teacherId,
        isDeleted: false,
    })
        .populate("teacher", "fullName email")
        .sort({ createdAt: -1 });

};

/* -------------------------------------------------------------------------- */
/*                             Get Course By Id                               */
/* -------------------------------------------------------------------------- */

const getCourseById = async (courseId) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    })
        .populate("teacher", "fullName email");

    if (!course) {
        throw new ApiError(
            404,
            "Course not found"
        );
    }

    return course;
};

/* -------------------------------------------------------------------------- */
/*                               Update Course                                */
/* -------------------------------------------------------------------------- */

const updateCourse = async (
    courseId,
    body,
    file,
    user
) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(
            404,
            "Course not found"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Teacher Ownership Check
    |--------------------------------------------------------------------------
    */

    if (
        user.role === ROLES.TEACHER &&
        course.teacher.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to update this course"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Course Code Duplicate Check
    |--------------------------------------------------------------------------
    */

    if (
        body.courseCode &&
        body.courseCode !== course.courseCode
    ) {

        const existingCourse = await Course.findOne({
            courseCode: body.courseCode,
            isDeleted: false,
            _id: {
                $ne: courseId,
            },
        });

        if (existingCourse) {
            throw new ApiError(
                409,
                "Course code already exists"
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Update Data
    |--------------------------------------------------------------------------
    */

    const updateData = {
        ...body,
        updatedBy: user._id,
    };

    /*
    |--------------------------------------------------------------------------
    | Thumbnail Upload
    |--------------------------------------------------------------------------
    */

    if (file) {

        const uploaded = await uploadToCloudinary(
            file.buffer,
            {
                folder: "acem-academy/courses",
                resource_type: "image",
            }
        );

        updateData.thumbnail =
            uploaded.secure_url;
    }

    const updatedCourse =
        await Course.findByIdAndUpdate(
            courseId,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate(
                "teacher",
                "fullName email"
            );

    return updatedCourse;
};

/* -------------------------------------------------------------------------- */
/*                               Delete Course                                */
/* -------------------------------------------------------------------------- */

const deleteCourse = async (
    courseId,
    user
) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(
            404,
            "Course not found"
        );
    }

    if (
        user.role === ROLES.TEACHER &&
        course.teacher.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to delete this course"
        );
    }

    await Course.findByIdAndUpdate(
        courseId,
        {
            isDeleted: true,
            updatedBy: user._id,
        }
    );
};

/* -------------------------------------------------------------------------- */
/*                              Publish Course                                */
/* -------------------------------------------------------------------------- */

const publishCourse = async (
    courseId,
    body,
    user
) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(
            404,
            "Course not found"
        );
    }

    if (
        user.role === ROLES.TEACHER &&
        course.teacher.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to publish this course"
        );
    }

    course.status =
        body.status ||
        COURSE_STATUS.PUBLISHED;

    course.updatedBy = user._id;

    await course.save();

    return course;
};

module.exports = {
    createCourse,
    getCourses,
    getMyCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    publishCourse,
};