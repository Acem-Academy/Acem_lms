const express = require("express");

const chapterController = require("../controllers/chapter.controller");

const {
    createChapterValidator,
    updateChapterValidator,
    chapterIdValidator,
    publishChapterValidator,
} = require("../validators/chapter.validator");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Create Chapter
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    createChapterValidator,
    validate,
    chapterController.createChapter
);

/*
|--------------------------------------------------------------------------
| Get Chapters
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    chapterController.getChapters
);

/*
|--------------------------------------------------------------------------
| Get Chapter By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:chapterId",
    authenticate,
    chapterIdValidator,
    validate,
    chapterController.getChapterById
);

/*
|--------------------------------------------------------------------------
| Update Chapter
|--------------------------------------------------------------------------
*/

router.patch(
    "/:chapterId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    chapterIdValidator,
    updateChapterValidator,
    validate,
    chapterController.updateChapter
);

/*
|--------------------------------------------------------------------------
| Delete Chapter
|--------------------------------------------------------------------------
*/

router.delete(
    "/:chapterId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    chapterIdValidator,
    validate,
    chapterController.deleteChapter
);

/*
|--------------------------------------------------------------------------
| Publish Chapter
|--------------------------------------------------------------------------
*/

router.patch(
    "/:chapterId/publish",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    chapterIdValidator,
    publishChapterValidator,
    validate,
    chapterController.publishChapter
);

module.exports = router;