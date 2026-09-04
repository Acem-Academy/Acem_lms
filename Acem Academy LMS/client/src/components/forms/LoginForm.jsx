import { useState } from "react";
import {
    Eye,
    EyeOff,
    Loader2,
    GraduationCap,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/config/routes";
import { ROLES } from "@/config/roles";

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
import { Checkbox } from "@/components/ui/checkbox";

function LoginForm() {

    const navigate = useNavigate();
    const { login } = useAuth();

    const [showPassword, setShowPassword] =
        useState(false);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();


    /*
    |--------------------------------------------------------------------------
    | Login Submit
    |--------------------------------------------------------------------------
    */

    const onSubmit = async (formData) => {

        try {

            setIsSubmitting(true);

            const loggedInUser =
                await login(formData);

            if (!loggedInUser) return;

            switch (loggedInUser.role) {

                case ROLES.ADMIN:

                    navigate(
                        ROUTES.ADMIN.DASHBOARD,
                        {
                            replace: true,
                        }
                    );

                    break;


                case ROLES.TEACHER:

                    navigate(
                        ROUTES.TEACHER.DASHBOARD,
                        {
                            replace: true,
                        }
                    );

                    break;


                case ROLES.STUDENT:

                    navigate(
                        ROUTES.STUDENT.DASHBOARD,
                        {
                            replace: true,
                        }
                    );

                    break;


                default:

                    navigate(
                        ROUTES.LOGIN,
                        {
                            replace: true,
                        }
                    );

            }

        } catch (error) {

            console.error(error);

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

                {/* Logo */}

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
                        Welcome Back 👋
                    </CardTitle>

                    <CardDescription
                        className="
                            mt-2
                            text-sm
                            text-white
                        "
                    >
                        Sign in to continue to ACEM Academy.
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
                                placeholder="Enter your password"
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
                    {/* Remember / Forgot */}
                    {/* ================================================== */}

                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">

                            <Checkbox
                                id="remember"
                                className="
                                    border-[var(--color-border)]
                                    data-[state=checked]:border-[var(--color-primary)]
                                    data-[state=checked]:bg-[var(--color-primary)]
                                    data-[state=checked]:text-black
                                "
                            />

                            <Label
                                htmlFor="remember"
                                className="cursor-pointer text-sm text-white"
                            >
                                Remember me
                            </Label>

                        </div>


                        <button
                            type="button"
                            className="
                                text-sm
                                font-medium
                                text-[var(--color-primary)]
                                transition
                                hover:text-[var(--color-primary-dark)]
                                hover:underline
                            "
                        >
                            Forgot Password?
                        </button>

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

                                Signing In...
                            </>

                        ) : (

                            "Sign In"

                        )}

                    </Button>


                    {/* ================================================== */}
                    {/* Register */}
                    {/* ================================================== */}

                    <p className="pt-2 text-center text-sm text-[var(--color-text-muted)]">

                        Don't have an account?{" "}

                        <Link
                            to={ROUTES.REGISTER}
                            className="
                                font-semibold
                                text-[var(--color-primary)]
                                transition
                                hover:text-[var(--color-primary-dark)]
                                hover:underline
                            "
                        >
                            Create Account
                        </Link>

                    </p>

                </form>

            </CardContent>

        </Card>

    );
}

export default LoginForm;