const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const lessonService = require("../services/lesson.service");

/*
|--------------------------------------------------------------------------
| Create Lesson
|--------------------------------------------------------------------------
*/

const createLesson = asyncHandler(async (req, res) => {
    const lesson = await lessonService.createLesson(
        req.body,
        req.files,
        req.user
    );

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                lesson,
                "Lesson created successfully"
            )
        );
});

/*
|--------------------------------------------------------------------------
| Get Lessons
|--------------------------------------------------------------------------
*/

const getLessons = asyncHandler(async (req, res) => {

    const lessons = await lessonService.getLessons(
        req.query.topic,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            lessons,
            "Lessons fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Lesson By Id
|--------------------------------------------------------------------------
*/

const getLessonById = asyncHandler(async (req, res) => {

    const lesson = await lessonService.getLessonById(
        req.params.lessonId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            lesson,
            "Lesson fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Submit Quiz
|--------------------------------------------------------------------------
*/

const submitQuiz = asyncHandler(async (req, res) => {

    const result = await lessonService.submitQuiz(
        req.params.lessonId,
        req.body.answers,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Quiz submitted successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Update Lesson
|--------------------------------------------------------------------------
*/

const updateLesson = asyncHandler(async (req, res) => {
    const lesson = await lessonService.updateLesson(
        req.params.lessonId,
        req.body,
        req.files,
        req.user
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                lesson,
                "Lesson updated successfully"
            )
        );
});

/*
|--------------------------------------------------------------------------
| Delete Lesson
|--------------------------------------------------------------------------
*/

const deleteLesson = asyncHandler(async (req, res) => {

    await lessonService.deleteLesson(
        req.params.lessonId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Lesson deleted successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Publish Lesson
|--------------------------------------------------------------------------
*/

const publishLesson = asyncHandler(async (req, res) => {

    const lesson = await lessonService.publishLesson(
        req.params.lessonId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            lesson,
            "Lesson published successfully"
        )
    );

});

module.exports = {
    createLesson,
    getLessons,
    getLessonById,
    submitQuiz,
    updateLesson,
    deleteLesson,
    publishLesson,
};