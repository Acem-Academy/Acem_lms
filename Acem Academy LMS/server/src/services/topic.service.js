const Topic = require("../models/topic.model");
const Chapter = require("../models/chapter.model");

const ApiError = require("../utils/ApiError");

const {
    assertCurriculumOwnership,
} = require("../utils/ownership");

const {
    TOPIC_STATUS,
} = require("../constants/topic.constants");

const {
    isStudent,
    getPublishedTopicIds,
} = require("../utils/curriculumVisibility");

const TOPIC_UPDATE_FIELDS = [
    "title",
    "description",
    "position",
];


/*
|--------------------------------------------------------------------------
| Create Topic
|--------------------------------------------------------------------------
*/

const createTopic = async (
    topicData,
    user
) => {

    /*
    |--------------------------------------------------------------------------
    | Check Chapter Exists
    |--------------------------------------------------------------------------
    */

    const chapter = await Chapter.findOne({
        _id: topicData.chapter,
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
        chapter._id,
        user
    );

    /*
    |--------------------------------------------------------------------------
    | Auto Generate Position
    |--------------------------------------------------------------------------
    */

    if (!topicData.position) {

        const lastTopic = await Topic.findOne({
            chapter: chapter._id,
        }).sort({
            position: -1,
        });

        topicData.position = lastTopic
            ? lastTopic.position + 1
            : 1;
    }

    /*
    |--------------------------------------------------------------------------
    | Check Duplicate Position
    |--------------------------------------------------------------------------
    */

    const existingPosition = await Topic.findOne({
        chapter: chapter._id,
        position: topicData.position,
    });

    if (existingPosition) {
        throw new ApiError(
            409,
            existingPosition.isDeleted
                ? "Position is held by a deleted item. Choose another position."
                : "Position already exists."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Topic
    |--------------------------------------------------------------------------
    */

    const topic = await Topic.create({
        ...topicData,
        createdBy: user._id,
        updatedBy: user._id,
    });

    return topic;

};

/*
|--------------------------------------------------------------------------
| Get Topics
|--------------------------------------------------------------------------
*/

const getTopics = async (chapterId, user) => {

    const filter = {
        isDeleted: false,
    };

    if (chapterId) {
        filter.chapter = chapterId;
    }

    const topics = await Topic.find(filter)
        .populate(
            "chapter",
            "title"
        )
        .sort({
            position: 1,
        });

    /*
    |--------------------------------------------------------------------------
    | Student Visibility
    |--------------------------------------------------------------------------
    |
    | Students only see published topics whose chapter, sub-course and
    | course are published. Teachers/admins keep the full list.
    |
    */

    if (!isStudent(user)) {
        return topics;
    }

    const publishedTopicIds =
        await getPublishedTopicIds(
            topics.map(
                (topic) => topic._id
            )
        );

    return topics.filter((topic) =>
        publishedTopicIds.has(
            topic._id.toString()
        )
    );

};

/*
|--------------------------------------------------------------------------
| Get Topic By Id
|--------------------------------------------------------------------------
*/

const getTopicById = async (
    topicId,
    user
) => {

    const topic = await Topic.findOne({
        _id: topicId,
        isDeleted: false,
    }).populate(
        "chapter",
        "title"
    );

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    if (isStudent(user)) {
        const publishedTopicIds =
            await getPublishedTopicIds([
                topicId,
            ]);

        if (
            !publishedTopicIds.has(
                topicId.toString()
            )
        ) {
            throw new ApiError(
                404,
                "Topic not found."
            );
        }
    }

    await assertCurriculumOwnership(
        "topic",
        topicId,
        user
    );

    return topic;

};

/*
|--------------------------------------------------------------------------
| Update Topic
|--------------------------------------------------------------------------
*/

const updateTopic = async (
    topicId,
    updateData,
    user
) => {

    const topic = await Topic.findOne({
        _id: topicId,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    await assertCurriculumOwnership(
        "topic",
        topicId,
        user
    );

    if (
        updateData.position &&
        updateData.position !== topic.position
    ) {

        const existingPosition = await Topic.findOne({
            chapter: topic.chapter,
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

    for (const key of TOPIC_UPDATE_FIELDS) {
        if (updateData[key] !== undefined) {
            topic[key] = updateData[key];
        }
    }

    topic.updatedBy = user._id;

    await topic.save();

    return topic;

};

/*
|--------------------------------------------------------------------------
| Delete Topic
|--------------------------------------------------------------------------
*/

const deleteTopic = async (
    topicId,
    user
) => {

    const topic = await Topic.findOne({
        _id: topicId,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    await assertCurriculumOwnership(
        "topic",
        topicId,
        user
    );

    topic.isDeleted = true;

    topic.updatedBy = user._id;

    await topic.save();

};

/*
|--------------------------------------------------------------------------
| Publish Topic
|--------------------------------------------------------------------------
*/

const publishTopic = async (
    topicId,
    body,
    user
) => {

    const topic = await Topic.findOne({
        _id: topicId,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    await assertCurriculumOwnership(
        "topic",
        topicId,
        user
    );

    topic.status = body.status;

    topic.updatedBy = user._id;

    await topic.save();

    return topic;

};

module.exports = {
    createTopic,
    getTopics,
    getTopicById,
    updateTopic,
    deleteTopic,
    publishTopic,
};