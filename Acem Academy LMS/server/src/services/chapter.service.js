const Chapter = require("../models/chapter.model");
const SubCourse = require("../models/subCourse.model");

const ApiError = require("../utils/ApiError");

const {
    CHAPTER_STATUS,
} = require("../constants/chapter.constants");

/*
|--------------------------------------------------------------------------
| Create Chapter
|--------------------------------------------------------------------------
*/

const createChapter = async (
    chapterData,
    user
) => {

    const subCourse = await SubCourse.findOne({
        _id: chapterData.subCourse,
        isDeleted: false,
    });

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    if (!chapterData.position) {

        const lastChapter = await Chapter.findOne({
            subCourse: subCourse._id,
            isDeleted: false,
        }).sort({
            position: -1,
        });

        chapterData.position = lastChapter
            ? lastChapter.position + 1
            : 1;
    }

    const existingPosition = await Chapter.findOne({
        subCourse: subCourse._id,
        position: chapterData.position,
        isDeleted: false,
    });

    if (existingPosition) {
        throw new ApiError(
            409,
            "Position already exists."
        );
    }

    const chapter = await Chapter.create({
        ...chapterData,
        createdBy: user._id,
        updatedBy: user._id,
    });

    return chapter;

};

/*
|--------------------------------------------------------------------------
| Get Chapters
|--------------------------------------------------------------------------
*/

const getChapters = async (subCourseId) => {

    const filter = {
        isDeleted: false,
    };

    if (subCourseId) {
        filter.subCourse = subCourseId;
    }

    const chapters = await Chapter.find(filter)
        .populate(
            "subCourse",
            "title"
        )
        .sort({
            position: 1,
        });

    return chapters;

};
/*
|--------------------------------------------------------------------------
| Get Chapter By Id
|--------------------------------------------------------------------------
*/

const getChapterById = async (
    chapterId
) => {

    const chapter = await Chapter.findOne({
        _id: chapterId,
        isDeleted: false,
    }).populate(
        "subCourse",
        "title"
    );

    if (!chapter) {
        throw new ApiError(
            404,
            "Chapter not found."
        );
    }

    return chapter;

};

/*
|--------------------------------------------------------------------------
| Update Chapter
|--------------------------------------------------------------------------
*/

const updateChapter = async (
    chapterId,
    updateData,
    user
) => {

    const chapter = await Chapter.findOne({
        _id: chapterId,
        isDeleted: false,
    });

    if (!chapter) {
        throw new ApiError(
            404,
            "Chapter not found."
        );
    }

    if (
        updateData.position &&
        updateData.position !== chapter.position
    ) {

        const existingPosition = await Chapter.findOne({
            subCourse: chapter.subCourse,
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
        chapter,
        updateData
    );

    chapter.updatedBy = user._id;

    await chapter.save();

    return chapter;

};


/*
|--------------------------------------------------------------------------
| Delete Chapter
|--------------------------------------------------------------------------
*/

const deleteChapter = async (
    chapterId,
    user
) => {

    const chapter = await Chapter.findOne({
        _id: chapterId,
        isDeleted: false,
    });

    if (!chapter) {
        throw new ApiError(
            404,
            "Chapter not found."
        );
    }

    chapter.isDeleted = true;

    chapter.updatedBy = user._id;

    await chapter.save();

};

/*
|--------------------------------------------------------------------------
| Publish Chapter
|--------------------------------------------------------------------------
*/

const publishChapter = async (
    chapterId,
    body,
    user
) => {

    const chapter = await Chapter.findOne({
        _id: chapterId,
        isDeleted: false,
    });

    if (!chapter) {
        throw new ApiError(
            404,
            "Chapter not found."
        );
    }

    chapter.status = body.status;

    chapter.updatedBy = user._id;

    await chapter.save();

    return chapter;

};

module.exports = {
    createChapter,
    getChapters,
    getChapterById,
    updateChapter,
    deleteChapter,
    publishChapter,
};