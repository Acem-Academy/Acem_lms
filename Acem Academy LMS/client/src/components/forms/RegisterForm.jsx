import { useState } from "react";
import {
    Eye,
    EyeOff,
    Loader2,
    GraduationCap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/config/routes";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function RegisterForm() {

    const navigate = useNavigate();
    const { register: registerUser } = useAuth();

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm();

    const password = watch("password");


    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const onSubmit = async (formData) => {

        try {

            setIsSubmitting(true);

            const {
                confirmPassword,
                ...registerData
            } = formData;

            await registerUser(registerData);

            alert("Registration successful!");

            navigate(ROUTES.LOGIN);

        } catch (error) {

            console.error(error);

            alert(
                error?.response?.data?.message ||
                "Registration failed"
            );

        } finally {

            setIsSubmitting(false);

        }

    };


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

            {/* ========================================================== */}
            {/* Header */}
            {/* ========================================================== */}

            <CardHeader className="space-y-5 px-7 pt-8 sm:px-8">

                {/* Brand */}

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

                        <GraduationCap
                            className="h-6 w-6 text-[var(--color-primary)]"
                        />

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


                {/* Heading */}

                <div>

                    <CardTitle
                        className="
                            text-3xl
                            font-bold
                            tracking-tight
                            text-[var(--color-primary)]
                        "
                    >
                        Create Account 🚀
                    </CardTitle>

                    <CardDescription
                        className="
                            mt-2
                            text-sm
                            text-white
                        "
                    >
                        Join ACEM Academy and start learning today.
                    </CardDescription>

                </div>

            </CardHeader>


            {/* ========================================================== */}
            {/* Content */}
            {/* ========================================================== */}

            <CardContent className="px-7 pb-8 sm:px-8">

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                >

                    {/* ================================================== */}
                    {/* Full Name */}
                    {/* ================================================== */}

                    <div className="space-y-2">

                        <Label
                            htmlFor="fullName"
                            className="text-sm font-medium text-white"
                        >
                            Full Name
                        </Label>

                        <Input
                            id="fullName"
                            placeholder="Enter your full name"
                            className="
                                h-11
                                border-[var(--color-border)]
                                bg-black
                                text-white
                                placeholder:text-[#777777]
                                focus-visible:border-[var(--color-primary)]
                                focus-visible:ring-[var(--color-primary)]/30
                            "
                            {...register("fullName", {
                                required:
                                    "Full name is required",
                            })}
                        />

                        {errors.fullName && (

                            <p className="text-sm text-red-400">
                                {errors.fullName.message}
                            </p>

                        )}

                    </div>


                    {/* ================================================== */}
                    {/* Email */}
                    {/* ================================================== */}

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


                    {/* ================================================== */}
                    {/* Password */}
                    {/* ================================================== */}

                    <div className="space-y-2">

                        <Label
                            htmlFor="password"
                            className="text-sm font-medium text-white"
                        >
                            Password
                        </Label>

                        <div className="relative">

                            <Input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Enter password"
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
                                {...register("password", {
                                    required:
                                        "Password is required",

                                    minLength: {
                                        value: 8,
                                        message:
                                            "Password must be at least 8 characters",
                                    },
                                })}
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

                        {errors.password && (

                            <p className="text-sm text-red-400">
                                {errors.password.message}
                            </p>

                        )}

                    </div>


                    {/* ================================================== */}
                    {/* Confirm Password */}
                    {/* ================================================== */}

                    <div className="space-y-2">

                        <Label
                            htmlFor="confirmPassword"
                            className="text-sm font-medium text-white"
                        >
                            Confirm Password
                        </Label>

                        <div className="relative">

                            <Input
                                id="confirmPassword"
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Confirm password"
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
                                            "Please confirm your password",

                                        validate: (value) =>
                                            value === password ||
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


                    {/* ================================================== */}
                    {/* Submit */}
                    {/* ================================================== */}

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
                                <Loader2
                                    className="mr-2 h-4 w-4 animate-spin"
                                />

                                Creating Account...
                            </>

                        ) : (

                            "Create Account"

                        )}

                    </Button>


                    {/* ================================================== */}
                    {/* Login */}
                    {/* ================================================== */}

                    <p className="pt-2 text-center text-sm text-[var(--color-text-muted)]">

                        Already have an account?{" "}

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

            </CardContent>

        </Card>

    );
}

export default RegisterForm;