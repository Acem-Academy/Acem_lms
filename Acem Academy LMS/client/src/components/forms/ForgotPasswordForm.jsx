import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    GraduationCap,
    KeyRound,
    Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { ROUTES } from "@/config/routes";
import * as authService from "@/services/auth.service";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function ForgotPasswordForm() {

    const navigate = useNavigate();

    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [isResending, setIsResending] =
        useState(false);

    const [cooldown, setCooldown] =
        useState(0);

    const [authError, setAuthError] =
        useState("");

    const [infoMessage, setInfoMessage] =
        useState("");

    const [isReset, setIsReset] =
        useState(false);

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        reset,
        resetField,
        formState: { errors },
    } = useForm({
        defaultValues: {
            email: "",
            otp: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (cooldown <= 0) {
            return undefined;
        }

        const timer = setTimeout(
            () => setCooldown((value) => value - 1),
            1000
        );

        return () => clearTimeout(timer);
    }, [cooldown]);

    const onRequestReset = async (formData) => {
        try {
            setIsSubmitting(true);
            setAuthError("");
            setInfoMessage("");

            await authService.forgotPassword({
                email: formData.email,
            });

            setEmail(formData.email);
            setStep(2);
            setCooldown(60);
            setInfoMessage(
                "If an account exists with that email, a password reset code has been sent."
            );
        } catch (error) {
            setAuthError(
                error?.response?.data?.message ||
                "Unable to request a password reset."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const onResetPassword = async (formData) => {
        try {
            setIsSubmitting(true);
            setAuthError("");

            await authService.resetPassword({
                email,
                otp: formData.otp,
                newPassword: formData.newPassword,
            });

            setIsReset(true);
        } catch (error) {
            setAuthError(
                error?.response?.data?.message ||
                "Unable to reset your password. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const onResend = async () => {
        try {
            setIsResending(true);
            setAuthError("");
            setInfoMessage("");

            await authService.forgotPassword({ email });

            setInfoMessage(
                "If an account exists with that email, a password reset code has been sent."
            );

            resetField("otp");

            setCooldown(60);
        } catch (error) {
            setAuthError(
                error?.response?.data?.message ||
                "Unable to resend the reset code."
            );

            if (error?.response?.status === 429) {
                setCooldown(60);
            }
        } finally {
            setIsResending(false);
        }
    };

    const onUseDifferentEmail = () => {
        reset({
            email,
            otp: "",
            newPassword: "",
            confirmPassword: "",
        });
        setAuthError("");
        setInfoMessage("");
        setStep(1);
    };

    if (isReset) {
        return (
            <Card
                className="
                    overflow-hidden
                    border
                    border-[var(--color-border)]
                    bg-[var(--color-surface)]
                    text-white
                    shadow-2xl
                "
            >
                <CardHeader className="space-y-5 px-7 pt-8 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div
                            className="
                                flex
                                h-11
                                w-11
                                items-center
                                justify-center
                                rounded-xl
                                bg-[var(--color-primary)]/10
                                ring-1
                                ring-[var(--color-primary)]/30
                            "
                        >
                            <KeyRound className="h-6 w-6 text-[var(--color-primary)]" />
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-[var(--color-primary)]">
                                ACEM Academy
                            </p>

                            <p className="text-xs text-[var(--color-text-muted)]">
                                Learning Management System
                            </p>
                        </div>
                    </div>

                    <div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-[var(--color-primary)]">
                            Password Reset
                        </CardTitle>

                        <CardDescription className="mt-2 text-sm text-white">
                            Your password has been reset. Sign in with your new password.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="px-7 pb-8 sm:px-8">
                    <Button
                        type="button"
                        onClick={() =>
                            navigate(ROUTES.LOGIN)
                        }
                        className="
                            h-11
                            w-full
                            bg-[var(--color-primary)]
                            font-semibold
                            text-black
                            transition
                            hover:bg-[var(--color-primary-dark)]
                        "
                    >
                        Continue to Sign In
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className="
                overflow-hidden
                border
                border-[var(--color-border)]
                bg-[var(--color-surface)]
                text-white
                shadow-2xl
            "
        >
            <CardHeader className="space-y-5 px-7 pt-8 sm:px-8">
                <div className="flex items-center gap-3">
                    <div
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            bg-[var(--color-primary)]/10
                            ring-1
                            ring-[var(--color-primary)]/30
                        "
                    >
                        <GraduationCap className="h-6 w-6 text-[var(--color-primary)]" />
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-[var(--color-primary)]">
                            ACEM Academy
                        </p>

                        <p className="text-xs text-[var(--color-text-muted)]">
                            Learning Management System
                        </p>
                    </div>
                </div>

                <div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-[var(--color-primary)]">
                        {step === 1
                            ? "Forgot Password?"
                            : "Reset Your Password"}
                    </CardTitle>

                    <CardDescription className="mt-2 text-sm text-white">
                        {step === 1
                            ? "Enter your email and we will send you a reset code."
                            : "Enter the code we sent and choose a new password."}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="px-7 pb-8 sm:px-8">
                {step === 1 ? (
                    <form
                        onSubmit={handleSubmit(onRequestReset)}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-sm font-medium text-white"
                            >
                                Email
                            </Label>

                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                className="
                                    h-11
                                    border-[var(--color-border)]
                                    bg-black
                                    text-white
                                    placeholder:text-[#777777]
                                    focus-visible:border-[var(--color-primary)]
                                    focus-visible:ring-[var(--color-primary)]/30
                                "
                                {...register("email", {
                                    required:
                                        "Email is required",
                                })}
                            />

                            {errors.email && (
                                <p className="text-sm text-red-400">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {authError && (
                            <p
                                role="alert"
                                className="
                                    rounded-xl
                                    border
                                    border-red-900
                                    bg-red-950/30
                                    px-4
                                    py-3
                                    text-sm
                                    text-red-400
                                "
                            >
                                {authError}
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="
                                h-11
                                w-full
                                bg-[var(--color-primary)]
                                font-semibold
                                text-black
                                transition
                                hover:bg-[var(--color-primary-dark)]
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send Reset Code"
                            )}
                        </Button>

                        <p className="text-center text-sm text-[var(--color-text-muted)]">
                            Remembered your password?{" "}
                            <Link
                                to={ROUTES.LOGIN}
                                className="
                                    font-semibold
                                    text-[var(--color-primary)]
                                    transition
                                    hover:text-[var(--color-primary-dark)]
                                    hover:underline
                                "
                            >
                                Sign In
                            </Link>
                        </p>
                    </form>
                ) : (
                    <form
                        onSubmit={handleSubmit(onResetPassword)}
                        className="space-y-5"
                    >
                        <div className="rounded-xl border border-[var(--color-border)] bg-black px-4 py-3 text-sm text-[var(--color-text-muted)]">
                            Reset code sent to{" "}
                            <span className="font-medium text-white">
                                {email}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="otp"
                                className="text-sm font-medium text-white"
                            >
                                Reset Code
                            </Label>

                            <Input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                placeholder="Enter the 6-digit code"
                                className="
                                    h-11
                                    border-[var(--color-border)]
                                    bg-black
                                    text-center
                                    text-lg
                                    tracking-[0.5em]
                                    text-white
                                    placeholder:text-sm
                                    placeholder:tracking-normal
                                    placeholder:text-[#777777]
                                    focus-visible:border-[var(--color-primary)]
                                    focus-visible:ring-[var(--color-primary)]/30
                                "
                                {...register("otp", {
                                    required:
                                        "Reset code is required",
                                    pattern: {
                                        value: /^\d{6}$/,
                                        message:
                                            "Enter the 6-digit code",
                                    },
                                })}
                            />

                            {errors.otp && (
                                <p className="text-sm text-red-400">
                                    {errors.otp.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="newPassword"
                                className="text-sm font-medium text-white"
                            >
                                New Password
                            </Label>

                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Enter a new password"
                                    className="
                                        h-11
                                        border-[var(--color-border)]
                                        bg-black
                                        pr-11
                                        text-white
                                        placeholder:text-[#777777]
                                        focus-visible:border-[var(--color-primary)]
                                        focus-visible:ring-[var(--color-primary)]/30
                                    "
                                    {...register(
                                        "newPassword",
                                        {
                                            required:
                                                "New password is required",
                                            minLength: {
                                                value: 8,
                                                message:
                                                    "Password must be at least 8 characters",
                                            },
                                        }
                                    )}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        -translate-y-1/2
                                        text-[var(--color-text-muted)]
                                        transition
                                        hover:text-[var(--color-primary)]
                                    "
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>

                            {errors.newPassword && (
                                <p className="text-sm text-red-400">
                                    {errors.newPassword.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium text-white"
                            >
                                Confirm New Password
                            </Label>

                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Confirm the new password"
                                    className="
                                        h-11
                                        border-[var(--color-border)]
                                        bg-black
                                        pr-11
                                        text-white
                                        placeholder:text-[#777777]
                                        focus-visible:border-[var(--color-primary)]
                                        focus-visible:ring-[var(--color-primary)]/30
                                    "
                                    {...register(
                                        "confirmPassword",
                                        {
                                            required:
                                                "Please confirm your new password",
                                            validate: (value) =>
                                                value ===
                                                    getValues(
                                                        "newPassword"
                                                    ) ||
                                                "Passwords do not match",
                                        }
                                    )}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        -translate-y-1/2
                                        text-[var(--color-text-muted)]
                                        transition
                                        hover:text-[var(--color-primary)]
                                    "
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>

                            {errors.confirmPassword && (
                                <p className="text-sm text-red-400">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {authError && (
                            <p
                                role="alert"
                                className="
                                    rounded-xl
                                    border
                                    border-red-900
                                    bg-red-950/30
                                    px-4
                                    py-3
                                    text-sm
                                    text-red-400
                                "
                            >
                                {authError}
                            </p>
                        )}

                        {infoMessage && (
                            <p
                                role="status"
                                className="
                                    rounded-xl
                                    border
                                    border-[var(--color-primary)]/40
                                    bg-[var(--color-primary)]/10
                                    px-4
                                    py-3
                                    text-sm
                                    text-[var(--color-primary)]
                                "
                            >
                                {infoMessage}
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="
                                h-11
                                w-full
                                bg-[var(--color-primary)]
                                font-semibold
                                text-black
                                transition
                                hover:bg-[var(--color-primary-dark)]
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>

                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={onUseDifferentEmail}
                                className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    text-sm
                                    font-medium
                                    text-[var(--color-text-muted)]
                                    transition
                                    hover:text-[var(--color-primary)]
                                "
                            >
                                <ArrowLeft size={16} />
                                Use a different email
                            </button>

                            <button
                                type="button"
                                onClick={onResend}
                                disabled={
                                    isResending ||
                                    cooldown > 0
                                }
                                className="
                                    text-sm
                                    font-medium
                                    text-[var(--color-primary)]
                                    transition
                                    hover:text-[var(--color-primary-dark)]
                                    hover:underline
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                            >
                                {isResending
                                    ? "Sending..."
                                    : cooldown > 0
                                        ? `Resend in ${cooldown}s`
                                        : "Resend Code"}
                            </button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

export default ForgotPasswordForm;
