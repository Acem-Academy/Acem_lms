const mongoose = require("mongoose");

const {
    ENROLLMENT_STATUS,
} = require("../constants/enrollment.constants");

const enrollmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Student is required"],
        },

        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: [true, "Course is required"],
        },

        status: {
            type: String,
            enum: Object.values(ENROLLMENT_STATUS),
            default: ENROLLMENT_STATUS.ACTIVE,
        },

        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        completedLessons: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lesson",
            },
        ],

        lastAccessedLesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson",
            default: null,
        },

        enrolledAt: {
            type: Date,
            default: Date.now,
        },

        completedAt: {
            type: Date,
            default: null,
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
| Prevent Duplicate Enrollment
|--------------------------------------------------------------------------
*/

enrollmentSchema.index(
    {
        student: 1,
        course: 1,
    },
    {
        unique: true,
    }
);

/*
|--------------------------------------------------------------------------
| Performance Indexes
|--------------------------------------------------------------------------
*/

enrollmentSchema.index({
    student: 1,
});

enrollmentSchema.index({
    course: 1,
});

enrollmentSchema.index({
    status: 1,
});

module.exports = mongoose.model(
    "Enrollment",
    enrollmentSchema
);