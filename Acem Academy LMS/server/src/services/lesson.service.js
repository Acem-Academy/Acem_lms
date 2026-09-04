const Lesson = require("../models/lesson.model");
const Topic = require("../models/topic.model");

const ApiError = require("../utils/ApiError");

/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

const createLesson = async (
    lessonData,
    user
) => {

    /*
    |--------------------------------------------------------------------------
    | Check Topic Exists
    |--------------------------------------------------------------------------
    */

    const topic = await Topic.findOne({
        _id: lessonData.topic,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Auto Generate Position
    |--------------------------------------------------------------------------
    */

    if (!lessonData.position) {

        const lastLesson = await Lesson.findOne({
            topic: topic._id,
            isDeleted: false,
        }).sort({
            position: -1,
        });

        lessonData.position = lastLesson
            ? lastLesson.position + 1
            : 1;
    }

    /*
    |--------------------------------------------------------------------------
    | Check Duplicate Position
    |--------------------------------------------------------------------------
    */

    const existingPosition = await Lesson.findOne({
        topic: topic._id,
        position: lessonData.position,
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
    | Create Lesson
    |--------------------------------------------------------------------------
    */

    const lesson = await Lesson.create({
        ...lessonData,
        createdBy: user._id,
        updatedBy: user._id,
    });

    return lesson;
};

/*
|--------------------------------------------------------------------------
| Get Lessons
|--------------------------------------------------------------------------
*/

const getLessons = async (topicId) => {

    const filter = {
        isDeleted: false,
    };

    if (topicId) {
        filter.topic = topicId;
    }

    const lessons = await Lesson.find(filter)
        .populate(
            "topic",
            "title"
        )
        .sort({
            position: 1,
        });

    return lessons;
};
/*
|--------------------------------------------------------------------------
| Get Lesson By Id
|--------------------------------------------------------------------------
*/

const getLessonById = async (
    lessonId
) => {

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    }).populate(
        "topic",
        "title"
    );

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    return lesson;
};

/*
|--------------------------------------------------------------------------
| Update Lesson
|--------------------------------------------------------------------------
*/

const updateLesson = async (
    lessonId,
    updateData,
    user
) => {

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Check Position
    |--------------------------------------------------------------------------
    */

    if (
        updateData.position &&
        updateData.position !== lesson.position
    ) {

        const existingPosition = await Lesson.findOne({
            topic: lesson.topic,
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
        lesson,
        updateData
    );

    lesson.updatedBy = user._id;

    await lesson.save();

    return lesson;
};

/*
|--------------------------------------------------------------------------
| Delete Lesson
|--------------------------------------------------------------------------
*/

const deleteLesson = async (
    lessonId,
    user
) => {

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    lesson.isDeleted = true;

    lesson.updatedBy = user._id;

    await lesson.save();
};

/*
|--------------------------------------------------------------------------
| Publish Lesson
|--------------------------------------------------------------------------
*/

const publishLesson = async (
    lessonId,
    body,
    user
) => {

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    lesson.status = body.status;

    lesson.updatedBy = user._id;

    await lesson.save();

    return lesson;
};

module.exports = {
    createLesson,
    getLessons,
    getLessonById,
    updateLesson,
    deleteLesson,
    publishLesson,
};