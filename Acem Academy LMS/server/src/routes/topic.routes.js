const express = require("express");

const topicController = require("../controllers/topic.controller");

const {
    createTopicValidator,
    updateTopicValidator,
    topicIdValidator,
    publishTopicValidator,
} = require("../validators/topic.validator");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const validate = require("../middlewares/validate.middleware");

const ROLES = require("../constants/roles");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Create Topic
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    createTopicValidator,
    validate,
    topicController.createTopic
);

/*
|--------------------------------------------------------------------------
| Get Topics
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    topicController.getTopics
);

/*
|--------------------------------------------------------------------------
| Get Topic By Id
|--------------------------------------------------------------------------
*/

router.get(
    "/:topicId",
    authenticate,
    topicIdValidator,
    validate,
    topicController.getTopicById
);

/*
|--------------------------------------------------------------------------
| Update Topic
|--------------------------------------------------------------------------
*/

router.patch(
    "/:topicId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    topicIdValidator,
    updateTopicValidator,
    validate,
    topicController.updateTopic
);

/*
|--------------------------------------------------------------------------
| Delete Topic
|--------------------------------------------------------------------------
*/

router.delete(
    "/:topicId",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    topicIdValidator,
    validate,
    topicController.deleteTopic
);

/*
|--------------------------------------------------------------------------
| Publish Topic
|--------------------------------------------------------------------------
*/

router.patch(
    "/:topicId/publish",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.TEACHER),
    topicIdValidator,
    publishTopicValidator,
    validate,
    topicController.publishTopic
);

module.exports = router;