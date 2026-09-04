const mongoose = require("mongoose");
const slugify = require("slugify");

const {
    COURSE_STATUS,
    COURSE_VISIBILITY,
} = require("../constants/course.constants");

const courseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 150,
        },

        courseCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },

        thumbnail: {
            type: String,
            default: "",
            trim: true,
        },

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        price: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Duration in Minutes
        duration: {
            type: Number,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: Object.values(COURSE_STATUS),
            default: COURSE_STATUS.DRAFT,
        },

        visibility: {
            type: String,
            enum: Object.values(COURSE_VISIBILITY),
            default: COURSE_VISIBILITY.PUBLIC,
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
| Generate Slug
|--------------------------------------------------------------------------
*/

courseSchema.pre("validate", function () {

    if (this.isModified("title")) {

       this.slug = slugify(
    `${this.title}-${this.courseCode}`,
    {
        lower: true,
        strict: true,
        trim: true,
    }
);

    }

});
/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

courseSchema.index({
    title: "text",
    description: "text",
});

courseSchema.index({
    teacher: 1,
});

courseSchema.index({
    status: 1,
});

courseSchema.index({
    visibility: 1,
});

courseSchema.index({
    isDeleted: 1,
});

courseSchema.index({
    createdAt: -1,
});

module.exports = mongoose.model(
    "Course",
    courseSchema
);