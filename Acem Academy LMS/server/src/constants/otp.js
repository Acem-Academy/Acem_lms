const OTP_PURPOSES = Object.freeze({
    EMAIL_VERIFICATION: "email_verification",
    PASSWORD_RESET: "password_reset",
});

const OTP_CONFIG = Object.freeze({
    LENGTH: 6,
    EXPIRES_IN_MS: 10 * 60 * 1000,
    RESEND_COOLDOWN_MS: 60 * 1000,
    MAX_ATTEMPTS: 5,
});

module.exports = {
    OTP_PURPOSES,
    OTP_CONFIG,
};
