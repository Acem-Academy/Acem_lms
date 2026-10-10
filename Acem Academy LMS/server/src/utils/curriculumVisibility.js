const Course = require("../models/course.model");
const SubCourse = require("../models/subCourse.model");
const Chapter = require("../models/chapter.model");
const Topic = require("../models/topic.model");

const ROLES = require("../constants/roles");

const {
    COURSE_STATUS,
} = require("../constants/course.constants");

const {
    SUBCOURSE_STATUS,
} = require("../constants/subCourse.constants");

const {
    CHAPTER_STATUS,
} = require("../constants/chapter.constants");

const {
    TOPIC_STATUS,
} = require("../constants/topic.constants");

const {
    LESSON_STATUS,
} = require("../constants/lesson.constants");

/*
|--------------------------------------------------------------------------
| Student Curriculum Visibility
|--------------------------------------------------------------------------
|
| Students may only see curriculum items that are themselves published
| AND whose entire ancestor chain is published (and not soft-deleted):
|
|   course -> subCourse -> chapter -> topic -> lesson
|
| A published lesson under an unpublished chapter (or course) must stay
| hidden, and archived items are hidden the same way as drafts.
|
| Teachers and admins are never filtered: they need to see and manage
| their own draft/archived content.
|
*/

const isStudent = (user) =>
    !!user && user.role === ROLES.STUDENT;

const uniqueIds = (ids) => [
    ...new Set(
        (ids || [])
            .filter(Boolean)
            .map((id) => id.toString())
    ),
];

const idSet = (docs) =>
    new Set(docs.map((doc) => doc._id.toString()));

/*
|--------------------------------------------------------------------------
| Published Course Ids
|--------------------------------------------------------------------------
*/

const getPublishedCourseIds = async (courseIds) => {

    const ids = uniqueIds(courseIds);

    if (ids.length === 0) {
        return new Set();
    }

    const courses = await Course.find({
        _id: { $in: ids },
        isDeleted: false,
        status: COURSE_STATUS.PUBLISHED,
    }).select("_id");

    return idSet(courses);

};

/*
|--------------------------------------------------------------------------
| Published Sub Course Ids
|--------------------------------------------------------------------------
|
| A sub-course is visible only when the sub-course is published and its
| parent course is published.
|
*/

const getPublishedSubCourseIds = async (subCourseIds) => {

    const ids = uniqueIds(subCourseIds);

    if (ids.length === 0) {
        return new Set();
    }

    const subCourses = await SubCourse.find({
        _id: { $in: ids },
        isDeleted: false,
        status: SUBCOURSE_STATUS.PUBLISHED,
    }).select("course");

    const publishedCourseIds =
        await getPublishedCourseIds(
            subCourses.map(
                (subCourse) => subCourse.course
            )
        );

    return new Set(
        subCourses
            .filter(
                (subCourse) =>
                    subCourse.course &&
                    publishedCourseIds.has(
                        subCourse.course.toString()
                    )
            )
            .map(
                (subCourse) => subCourse._id.toString()
            )
    );

};

/*
|--------------------------------------------------------------------------
| Published Chapter Ids
|--------------------------------------------------------------------------
*/

const getPublishedChapterIds = async (chapterIds) => {

    const ids = uniqueIds(chapterIds);

    if (ids.length === 0) {
        return new Set();
    }

    const chapters = await Chapter.find({
        _id: { $in: ids },
        isDeleted: false,
        status: CHAPTER_STATUS.PUBLISHED,
    }).select("subCourse");

    const publishedSubCourseIds =
        await getPublishedSubCourseIds(
            chapters.map(
                (chapter) => chapter.subCourse
            )
        );

    return new Set(
        chapters
            .filter(
                (chapter) =>
                    chapter.subCourse &&
                    publishedSubCourseIds.has(
                        chapter.subCourse.toString()
                    )
            )
            .map(
                (chapter) => chapter._id.toString()
            )
    );

};

/*
|--------------------------------------------------------------------------
| Published Topic Ids
|--------------------------------------------------------------------------
*/

const getPublishedTopicIds = async (topicIds) => {

    const ids = uniqueIds(topicIds);

    if (ids.length === 0) {
        return new Set();
    }

    const topics = await Topic.find({
        _id: { $in: ids },
        isDeleted: false,
        status: TOPIC_STATUS.PUBLISHED,
    }).select("chapter");

    const publishedChapterIds =
        await getPublishedChapterIds(
            topics.map(
                (topic) => topic.chapter
            )
        );

    return new Set(
        topics
            .filter(
                (topic) =>
                    topic.chapter &&
                    publishedChapterIds.has(
                        topic.chapter.toString()
                    )
            )
            .map(
                (topic) => topic._id.toString()
            )
    );

};

/*
|--------------------------------------------------------------------------
| Is Lesson Published For Student
|--------------------------------------------------------------------------
|
| The lesson itself must be published and its topic (and every ancestor
| above it) must be published. Accepts a lesson whose topic may be a raw
| ObjectId or a populated document.
|
*/

const isLessonPublishedForStudent = async (lesson) => {

    if (!lesson) {
        return false;
    }

    if (lesson.status !== LESSON_STATUS.PUBLISHED) {
        return false;
    }

    const topicId = lesson.topic
        ? lesson.topic._id || lesson.topic
        : null;

    if (!topicId) {
        return false;
    }

    const publishedTopicIds =
        await getPublishedTopicIds([topicId]);

    return publishedTopicIds.has(topicId.toString());

};

module.exports = {
    isStudent,
    getPublishedCourseIds,
    getPublishedSubCourseIds,
    getPublishedChapterIds,
    getPublishedTopicIds,
    isLessonPublishedForStudent,
};
