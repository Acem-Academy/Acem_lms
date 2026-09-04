const mongoose = require("mongoose");

const {
    CHAPTER_STATUS,
} = require("../constants/chapter.constants");

const chapterSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Chapter title is required"],
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

        subCourse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCourse",
            required: [true, "Sub Course is required"],
        },

        position: {
            type: Number,
            required: [true, "Position is required"],
            min: 1,
        },

        status: {
            type: String,
            enum: Object.values(CHAPTER_STATUS),
            default: CHAPTER_STATUS.DRAFT,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Created By is required"],
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

chapterSchema.index({
    subCourse: 1,
});

chapterSchema.index({
    status: 1,
});

chapterSchema.index({
    position: 1,
});

chapterSchema.index({
    isDeleted: 1,
});

chapterSchema.index({
    createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Unique Position Per Sub Course
|--------------------------------------------------------------------------
*/

chapterSchema.index(
    {
        subCourse: 1,
        position: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    "Chapter",
    chapterSchema
);