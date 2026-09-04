const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const topicService = require("../services/topic.service");

/*
|--------------------------------------------------------------------------
| Create Topic
|--------------------------------------------------------------------------
*/

const createTopic = asyncHandler(async (req, res) => {

    const topic = await topicService.createTopic(
        req.body,
        req.user
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            topic,
            "Topic created successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Topics
|--------------------------------------------------------------------------
*/

const getTopics = asyncHandler(async (req, res) => {

    const topics = await topicService.getTopics(
        req.query.chapter
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            topics,
            "Topics fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Get Topic By Id
|--------------------------------------------------------------------------
*/

const getTopicById = asyncHandler(async (req, res) => {

    const topic = await topicService.getTopicById(
        req.params.topicId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            topic,
            "Topic fetched successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Update Topic
|--------------------------------------------------------------------------
*/

const updateTopic = asyncHandler(async (req, res) => {

    const topic = await topicService.updateTopic(
        req.params.topicId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            topic,
            "Topic updated successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Delete Topic
|--------------------------------------------------------------------------
*/

const deleteTopic = asyncHandler(async (req, res) => {

    await topicService.deleteTopic(
        req.params.topicId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Topic deleted successfully"
        )
    );

});

/*
|--------------------------------------------------------------------------
| Publish Topic
|--------------------------------------------------------------------------
*/

const publishTopic = asyncHandler(async (req, res) => {

    const topic = await topicService.publishTopic(
        req.params.topicId,
        req.body,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            topic,
            "Topic published successfully"
        )
    );

});

module.exports = {
    createTopic,
    getTopics,
    getTopicById,
    updateTopic,
    deleteTopic,
    publishTopic,
};