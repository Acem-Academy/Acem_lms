const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Quiz Attempt
|--------------------------------------------------------------------------
|
| Immutable record of a single quiz submission by a student. Correct-answer
| keys are never stored here: only the student's own answers and the score
| the server computed from the live lesson quiz.
|
| attemptNumber is scoped to (student, lesson) and is protected by a unique
| compound index so concurrent submissions can never exceed maxAttempts.
|
*/

const quizAttemptSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Student is required"],
        },

        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson",
            required: [true, "Lesson is required"],
        },

        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            default: null,
        },

        enrollment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Enrollment",
            default: null,
        },

        attemptNumber: {
            type: Number,
            required: [true, "Attempt number is required"],
            min: 1,
        },

        answers: {
            type: [Number],
            default: [],
        },

        earnedPoints: {
            type: Number,
            required: true,
            min: 0,
        },

        totalPoints: {
            type: Number,
            required: true,
            min: 0,
        },

        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },

        passed: {
            type: Boolean,
            required: true,
        },

        submittedAt: {
            type: Date,
            default: Date.now,
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

/*
| One attempt number per student per lesson. This unique index is the
| concurrency guard for maxAttempts enforcement.
*/

quizAttemptSchema.index(
    {
        student: 1,
        lesson: 1,
        attemptNumber: 1,
    },
    {
        unique: true,
    }
);

quizAttemptSchema.index({
    lesson: 1,
});

quizAttemptSchema.index({
    course: 1,
});

module.exports = mongoose.model(
    "QuizAttempt",
    quizAttemptSchema
);
