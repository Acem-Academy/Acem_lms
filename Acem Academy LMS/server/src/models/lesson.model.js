const mongoose = require("mongoose");

const {
    LESSON_STATUS,
} = require("../constants/lesson.constants");

/*
|--------------------------------------------------------------------------
| Quiz Question Schema
|--------------------------------------------------------------------------
*/

const quizQuestionSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: [true, "Question is required"],
            trim: true,
            maxlength: 2000,
        },

        options: {
            type: [String],
            required: [true, "Question options are required"],
            validate: {
                validator: function (options) {
                    return options.length >= 2;
                },
                message: "A question must have at least 2 options.",
            },
        },

        correctAnswer: {
            type: Number,
            required: [true, "Correct answer is required"],
            min: 0,
        },

        points: {
            type: Number,
            default: 1,
            min: 1,
        },

        explanation: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
    },
    {
        _id: true,
    }
);

/*
|--------------------------------------------------------------------------
| Quiz Schema
|--------------------------------------------------------------------------
*/

const quizSchema = new mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: false,
        },

        title: {
            type: String,
            default: "Lesson Quiz",
            trim: true,
            maxlength: 200,
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },

        passingScore: {
            type: Number,
            default: 70,
            min: 0,
            max: 100,
        },

        maxAttempts: {
            type: Number,
            default: 1,
            min: 1,
        },

        questions: {
            type: [quizQuestionSchema],
            default: [],
        },
    },
    {
        _id: true,
    }
);

const lessonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Lesson title is required"],
            trim: true,
            minlength: 3,
            maxlength: 200,
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 3000,
        },

        topic: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Topic",
            required: [true, "Topic is required"],
        },

        /*
        |--------------------------------------------------------------------------
        | Rich Text Content
        |--------------------------------------------------------------------------
        */

        content: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

       /*
|--------------------------------------------------------------------------
| Video
|--------------------------------------------------------------------------
*/

video: {
    type: {
        type: String,
        enum: ["youtube", "upload"],
        default: "youtube",
    },

    url: {
        type: String,
        default: "",
        trim: true,
    },

    duration: {
        type: Number,
        default: 0,
        min: 0,
    },

    thumbnail: {
        type: String,
        default: "",
        trim: true,
    },
},
        /*
        |--------------------------------------------------------------------------
        | Attachments
        |--------------------------------------------------------------------------
        */

        attachments: [
            {
                title: {
                    type: String,
                    trim: true,
                },

                url: {
                    type: String,
                    trim: true,
                },

                fileType: {
                    type: String,
                    trim: true,
                },
            },
        ],

/*
|--------------------------------------------------------------------------
| Quiz
|--------------------------------------------------------------------------
*/

quiz: {
    type: quizSchema,
    default: null,
},

        /*
        |--------------------------------------------------------------------------
        | Lesson Settings
        |--------------------------------------------------------------------------
        */

        position: {
            type: Number,
            required: [true, "Position is required"],
            min: 1,
        },

        isPreview: {
            type: Boolean,
            default: false,
        },

        status: {
            type: String,
            enum: Object.values(LESSON_STATUS),
            default: LESSON_STATUS.DRAFT,
        },

        /*
        |--------------------------------------------------------------------------
        | Soft Delete
        |--------------------------------------------------------------------------
        */

        isDeleted: {
            type: Boolean,
            default: false,
        },

        /*
        |--------------------------------------------------------------------------
        | Audit Fields
        |--------------------------------------------------------------------------
        */

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

lessonSchema.index({
    topic: 1,
});

lessonSchema.index({
    status: 1,
});

lessonSchema.index({
    position: 1,
});

lessonSchema.index({
    isDeleted: 1,
});

lessonSchema.index({
    createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Unique Position Per Topic
|--------------------------------------------------------------------------
*/

lessonSchema.index(
    {
        topic: 1,
        position: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    "Lesson",
    lessonSchema
);