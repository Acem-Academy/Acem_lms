const mongoose = require("mongoose");

const {
    SUBCOURSE_STATUS,
} = require("../constants/subCourse.constants");

const subCourseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Sub Course title is required"],
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

        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: [true, "Course is required"],
        },

        position: {
            type: Number,
            required: [true, "Position is required"],
            min: 1,
        },

        status: {
            type: String,
            enum: Object.values(SUBCOURSE_STATUS),
            default: SUBCOURSE_STATUS.DRAFT,
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

subCourseSchema.index({
    course: 1,
});

subCourseSchema.index({
    status: 1,
});

subCourseSchema.index({
    position: 1,
});

subCourseSchema.index({
    isDeleted: 1,
});

subCourseSchema.index({
    createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Unique Position Per Course
|--------------------------------------------------------------------------
*/

subCourseSchema.index(
    {
        course: 1,
        position: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    "SubCourse",
    subCourseSchema
);