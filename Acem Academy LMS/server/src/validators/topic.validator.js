const { body, param } = require("express-validator");

const {
    TOPIC_STATUS,
} = require("../constants/topic.constants");

/*
|--------------------------------------------------------------------------
| Create Topic
|--------------------------------------------------------------------------
*/

const createTopicValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Topic title is required.")
        .bail()
        .isLength({ min: 3, max: 150 })
        .withMessage("Topic title must be between 3 and 150 characters."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),

    body("chapter")
        .notEmpty()
        .withMessage("Chapter is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid Chapter id."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Position must be greater than 0."),

];

/*
|--------------------------------------------------------------------------
| Update Topic
|--------------------------------------------------------------------------
*/

const updateTopicValidator = [

    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage("Topic title must be between 3 and 150 characters."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),

    body("position")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Position must be greater than 0."),

];

/*
|--------------------------------------------------------------------------
| Topic Id
|--------------------------------------------------------------------------
*/

const topicIdValidator = [

    param("topicId")
        .isMongoId()
        .withMessage("Invalid Topic id."),

];

/*
|--------------------------------------------------------------------------
| Publish Topic
|--------------------------------------------------------------------------
*/

const publishTopicValidator = [

    body("status")
        .isIn(Object.values(TOPIC_STATUS))
        .withMessage("Invalid Topic status."),

];

module.exports = {
    createTopicValidator,
    updateTopicValidator,
    topicIdValidator,
    publishTopicValidator,
};