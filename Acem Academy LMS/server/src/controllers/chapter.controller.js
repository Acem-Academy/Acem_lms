const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const chapterService = require("../services/chapter.service");

/*
|--------------------------------------------------------------------------
| Create Chapter
|--------------------------------------------------------------------------
*/

const createChapter = asyncHandler(async (req, res) => {

    const chapter = await chapterService.createChapter(
        req.body,
        req.user
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            chapter,
            "Chapter created successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Chapters
|--------------------------------------------------------------------------
*/

const getChapters = asyncHandler(async (req, res) => {

    const chapters = await chapterService.getChapters(
        req.query.subCourse
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            chapters,
            "Chapters fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Chapter By Id
|--------------------------------------------------------------------------
*/

const getChapterById = asyncHandler(async (req, res) => {

    const chapter = await chapterService.getChapterById(
        req.params.chapterId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            chapter,
            "Chapter fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Update Chapter
|--------------------------------------------------------------------------
*/

const updateChapter = asyncHandler(async (req, res) => {

    const chapter = await chapterService.updateChapter(
        req.params.chapterId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            chapter,
            "Chapter updated successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Delete Chapter
|--------------------------------------------------------------------------
*/

const deleteChapter = asyncHandler(async (req, res) => {

    await chapterService.deleteChapter(
        req.params.chapterId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Chapter deleted successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Publish Chapter
|--------------------------------------------------------------------------
*/

const publishChapter = asyncHandler(async (req, res) => {

    const chapter = await chapterService.publishChapter(
        req.params.chapterId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            chapter,
            "Chapter published successfully"
        )
    );

});

module.exports = {
    createChapter,
    getChapters,
    getChapterById,
    updateChapter,
    deleteChapter,
    publishChapter,
};