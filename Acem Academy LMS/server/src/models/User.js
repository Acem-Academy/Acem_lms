const mongoose = require("mongoose");
const validator = require("validator");
const ROLES = require("../constants/roles");
const STATUS = require("../constants/status");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
        },

       email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
        validator: validator.isEmail,
        message: "Please enter a valid email address",
    },
},

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 8,
            select: false,
        },

        role: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.STUDENT,
        },

        status: {
            type: String,
            enum: Object.values(STATUS),
            default: STATUS.ACTIVE,
        },

        avatar: {
            url: {
                type: String,
                default: "",
            },
            publicId: {
                type: String,
                default: "",
            },
        },

        refreshToken: {
            type: String,
            default: null,
            select: false,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        deletedAt: {
            type: Date,
            default: null,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
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

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model("User", userSchema);

