const Chapter = require("../models/chapter.model");
const SubCourse = require("../models/subCourse.model");

const ApiError = require("../utils/ApiError");

const {
    assertCurriculumOwnership,
} = require("../utils/ownership");

const {
    CHAPTER_STATUS,
} = require("../constants/chapter.constants");

const CHAPTER_UPDATE_FIELDS = [
    "title",
    "description",
    "position",
];

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

    await assertCurriculumOwnership(
        "subCourse",
        subCourse._id,
        user
    );

    if (!chapterData.position) {

        const lastChapter = await Chapter.findOne({
            subCourse: subCourse._id,
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
    });

    if (existingPosition) {
        throw new ApiError(
            409,
            existingPosition.isDeleted
                ? "Position is held by a deleted item. Choose another position."
                : "Position already exists."
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
    chapterId,
    user
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

    await assertCurriculumOwnership(
        "chapter",
        chapterId,
        user
    );

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

    await assertCurriculumOwnership(
        "chapter",
        chapterId,
        user
    );

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

    for (const key of CHAPTER_UPDATE_FIELDS) {
        if (updateData[key] !== undefined) {
            chapter[key] = updateData[key];
        }
    }

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

    await assertCurriculumOwnership(
        "chapter",
        chapterId,
        user
    );

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

    await assertCurriculumOwnership(
        "chapter",
        chapterId,
        user
    );

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