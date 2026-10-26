const mongoose = require("mongoose");

const { OTP_PURPOSES, OTP_CONFIG } = require("../constants/otp");

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        purpose: {
            type: String,
            enum: Object.values(OTP_PURPOSES),
            required: true,
        },

        codeHash: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        attempts: {
            type: Number,
            default: 0,
        },

        maxAttempts: {
            type: Number,
            default: OTP_CONFIG.MAX_ATTEMPTS,
        },

        resendAvailableAt: {
            type: Date,
            required: true,
        },

        usedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

otpSchema.index(
    { email: 1, purpose: 1 },
    { unique: true }
);

otpSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("Otp", otpSchema);
