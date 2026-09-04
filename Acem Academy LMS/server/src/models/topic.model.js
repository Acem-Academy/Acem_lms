const mongoose = require("mongoose");

const {
    TOPIC_STATUS,
} = require("../constants/topic.constants");

const topicSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Topic title is required"],
            trim: true,
            minlength: 3,
            maxlength: 150,
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },

        chapter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chapter",
            required: [true, "Chapter is required"],
        },

        position: {
            type: Number,
            required: [true, "Position is required"],
            min: 1,
        },

        status: {
            type: String,
            enum: Object.values(TOPIC_STATUS),
            default: TOPIC_STATUS.DRAFT,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

topicSchema.index({
    chapter: 1,
});

topicSchema.index({
    status: 1,
});

topicSchema.index({
    position: 1,
});

topicSchema.index({
    isDeleted: 1,
});

topicSchema.index({
    createdAt: -1,
});

topicSchema.index(
    {
        chapter: 1,
        position: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    "Topic",
    topicSchema
);