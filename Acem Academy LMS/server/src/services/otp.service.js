const crypto = require("crypto");
const bcrypt = require("bcrypt");

const Otp = require("../models/Otp");
const ApiError = require("../utils/ApiError");
const { OTP_PURPOSES, OTP_CONFIG } = require("../constants/otp");
const { sendOtpEmail } = require("../utils/email");

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const generateOtp = () =>
    String(crypto.randomInt(100000, 1000000));

const hashOtp = async (otp) => {
    return await bcrypt.hash(otp, 10);
};

const compareOtp = async (otp, codeHash) => {
    return await bcrypt.compare(otp, codeHash);
};

const invalidOtpError = (purpose) => {
    if (purpose === OTP_PURPOSES.PASSWORD_RESET) {
        return new ApiError(
            400,
            "Invalid or expired reset code"
        );
    }

    return new ApiError(
        400,
        "Invalid or expired verification code"
    );
};

const issueOtp = async (email, purpose) => {
    const normalizedEmail = normalizeEmail(email);
    const now = new Date();

    const existingOtp = await Otp.findOne({
        email: normalizedEmail,
        purpose,
    });

    if (
        existingOtp &&
        existingOtp.resendAvailableAt > now
    ) {
        const seconds = Math.max(
            1,
            Math.ceil(
                (existingOtp.resendAvailableAt.getTime() -
                    now.getTime()) /
                    1000
            )
        );

        throw new ApiError(
            429,
            `Please wait ${seconds} seconds before requesting another code.`
        );
    }

    const otp = generateOtp();
    const codeHash = await hashOtp(otp);

    await Otp.findOneAndUpdate(
        {
            email: normalizedEmail,
            purpose,
        },
        {
            $set: {
                codeHash,
                expiresAt: new Date(
                    now.getTime() + OTP_CONFIG.EXPIRES_IN_MS
                ),
                attempts: 0,
                maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
                resendAvailableAt: new Date(
                    now.getTime() +
                        OTP_CONFIG.RESEND_COOLDOWN_MS
                ),
                usedAt: null,
            },
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        }
    );

    try {
        await sendOtpEmail({
            to: normalizedEmail,
            purpose,
            otp,
        });
    } catch (error) {
        console.error(
            "Failed to send OTP email:",
            error && error.message
        );
    }

    return true;
};

const validateOtp = async (email, purpose, code) => {
    const normalizedEmail = normalizeEmail(email);

    const otpRecord = await Otp.findOne({
        email: normalizedEmail,
        purpose,
    });

    if (!otpRecord || otpRecord.usedAt) {
        throw invalidOtpError(purpose);
    }

    if (otpRecord.expiresAt.getTime() <= Date.now()) {
        throw invalidOtpError(purpose);
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
        throw new ApiError(
            429,
            "Too many attempts. Please request a new code."
        );
    }

    const isMatch = await compareOtp(
        code,
        otpRecord.codeHash
    );

    if (!isMatch) {
        const updatedOtp = await Otp.findOneAndUpdate(
            {
                _id: otpRecord._id,
                usedAt: null,
            },
            {
                $inc: {
                    attempts: 1,
                },
            },
            {
                new: true,
            }
        );

        if (
            updatedOtp &&
            updatedOtp.attempts >= updatedOtp.maxAttempts
        ) {
            throw new ApiError(
                429,
                "Too many attempts. Please request a new code."
            );
        }

        throw invalidOtpError(purpose);
    }

    return otpRecord;
};

const consumeOtp = async (email, purpose, code) => {
    const otpRecord = await validateOtp(
        email,
        purpose,
        code
    );

    const consumedOtp = await Otp.findOneAndUpdate(
        {
            _id: otpRecord._id,
            usedAt: null,
        },
        {
            $set: {
                usedAt: new Date(),
            },
        },
        {
            new: true,
        }
    );

    if (!consumedOtp) {
        throw invalidOtpError(purpose);
    }

    return consumedOtp;
};

const deleteOtp = async (email, purpose) => {
    await Otp.deleteOne({
        email: normalizeEmail(email),
        purpose,
    });
};

module.exports = {
    generateOtp,
    hashOtp,
    compareOtp,
    issueOtp,
    validateOtp,
    consumeOtp,
    deleteOtp,
};
