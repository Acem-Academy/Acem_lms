const nodemailer = require("nodemailer");

const { OTP_PURPOSES, OTP_CONFIG } = require("../constants/otp");

let transporter = null;
let warnedAboutMissingConfig = false;

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const host = process.env.SMTP_HOST;

    if (!host) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure:
            String(process.env.SMTP_SECURE).toLowerCase() ===
            "true",
        auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
            : undefined,
    });

    return transporter;
};

const buildOtpEmail = (purpose, otp) => {
    const isReset =
        purpose === OTP_PURPOSES.PASSWORD_RESET;

    const subject = isReset
        ? "Reset your ACEM Academy password"
        : "Verify your ACEM Academy email";

    const action = isReset
        ? "reset your password"
        : "verify your email address";

    const text = [
        `Use the following code to ${action}:`,
        "",
        otp,
        "",
        `This code expires in ${OTP_CONFIG.EXPIRES_IN_MS / 60000} minutes.`,
        "If you did not request this code, you can safely ignore this email.",
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="margin: 0 0 16px;">ACEM Academy</h2>
            <p>Use the following code to ${action}:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
                ${otp}
            </p>
            <p>This code expires in ${OTP_CONFIG.EXPIRES_IN_MS / 60000} minutes.</p>
            <p>If you did not request this code, you can safely ignore this email.</p>
        </div>
    `;

    return { subject, text, html };
};

const sendOtpEmail = async ({ to, purpose, otp }) => {
    if (process.env.DISABLE_EMAIL === "true") {
        return false;
    }

    const transport = getTransporter();

    if (!transport) {
        if (
            process.env.NODE_ENV === "production"
        ) {
            throw new Error(
                "Email service is not configured"
            );
        }

        if (!warnedAboutMissingConfig) {
            console.warn(
                "SMTP is not configured. OTP emails are not being delivered."
            );
            warnedAboutMissingConfig = true;
        }

        return false;
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const { subject, text, html } = buildOtpEmail(
        purpose,
        otp
    );

    await transport.sendMail({
        from,
        to,
        subject,
        text,
        html,
    });

    return true;
};

module.exports = {
    sendOtpEmail,
};
