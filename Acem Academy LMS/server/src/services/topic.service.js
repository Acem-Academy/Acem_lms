const Topic = require("../models/topic.model");
const Chapter = require("../models/chapter.model");

const ApiError = require("../utils/ApiError");

const {
    TOPIC_STATUS,
} = require("../constants/topic.constants");


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

    /*
    |--------------------------------------------------------------------------
    | Auto Generate Position
    |--------------------------------------------------------------------------
    */

    if (!topicData.position) {

        const lastTopic = await Topic.findOne({
            chapter: chapter._id,
            isDeleted: false,
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

const getTopics = async (chapterId) => {

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

    return topics;

};

/*
|--------------------------------------------------------------------------
| Get Topic By Id
|--------------------------------------------------------------------------
*/

const getTopicById = async (
    topicId
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

    Object.assign(
        topic,
        updateData
    );

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