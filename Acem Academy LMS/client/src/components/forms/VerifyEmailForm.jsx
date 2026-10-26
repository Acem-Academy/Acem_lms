import { useEffect, useState } from "react";
import {
    ArrowLeft,
    GraduationCap,
    Loader2,
    MailCheck,
} from "lucide-react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
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

function VerifyEmailForm() {

    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

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

    const [isVerified, setIsVerified] =
        useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        resetField,
        formState: { errors },
    } = useForm({
        defaultValues: {
            email: searchParams.get("email") || "",
            otp: "",
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

    const onSubmit = async (formData) => {
        try {
            setIsSubmitting(true);
            setAuthError("");
            setInfoMessage("");

            await authService.verifyEmail({
                email: formData.email,
                otp: formData.otp,
            });

            setIsVerified(true);
        } catch (error) {
            setAuthError(
                error?.response?.data?.message ||
                "Unable to verify your email. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const onResend = async () => {
        const email = getValues("email");

        if (!email) {
            setAuthError(
                "Enter your email address first."
            );

            return;
        }

        try {
            setIsResending(true);
            setAuthError("");
            setInfoMessage("");

            const response =
                await authService.resendVerification({
                    email,
                });

            setInfoMessage(
                response?.message ||
                "If an unverified account exists, a new verification code has been sent."
            );

            resetField("otp");

            setCooldown(60);
        } catch (error) {
            setAuthError(
                error?.response?.data?.message ||
                "Unable to resend the verification code."
            );

            if (error?.response?.status === 429) {
                setCooldown(60);
            }
        } finally {
            setIsResending(false);
        }
    };

    if (isVerified) {
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
                            <MailCheck className="h-6 w-6 text-[var(--color-primary)]" />
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
                            Email Verified
                        </CardTitle>

                        <CardDescription className="mt-2 text-sm text-white">
                            Your email address has been verified. You can now sign in to your account.
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
                        Verify Your Email
                    </CardTitle>

                    <CardDescription className="mt-2 text-sm text-white">
                        Enter the 6-digit code we sent to your email address.
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="px-7 pb-8 sm:px-8">
                <form
                    onSubmit={handleSubmit(onSubmit)}
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
                                required: "Email is required",
                            })}
                        />

                        {errors.email && (
                            <p className="text-sm text-red-400">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="otp"
                            className="text-sm font-medium text-white"
                        >
                            Verification Code
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
                                    "Verification code is required",
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
                                Verifying...
                            </>
                        ) : (
                            "Verify Email"
                        )}
                    </Button>

                    <div className="flex items-center justify-between gap-3">
                        <Link
                            to={ROUTES.LOGIN}
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
                            Back to Sign In
                        </Link>

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
            </CardContent>
        </Card>
    );
}

export default VerifyEmailForm;
