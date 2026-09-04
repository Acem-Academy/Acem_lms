import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    User,
    Mail,
    ShieldCheck,
    CalendarDays,
    Edit3,
    BookOpen,
    LogOut,
    Lock,
    Eye,
    EyeOff,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from "lucide-react";

import {
    changePasswordApi,
    updateProfileApi,
} from "@/api/auth.api";

import { useAuth } from "@/context/AuthContext";


function Profile() {

   const navigate = useNavigate();

const { logout } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | User State
    |--------------------------------------------------------------------------
    */

    const [user, setUser] = useState({
        fullName: "",
        email: "",
        role: "student",
        createdAt: null,
    });


    /*
    |--------------------------------------------------------------------------
    | Profile Edit State
    |--------------------------------------------------------------------------
    */

    const [isEditing, setIsEditing] = useState(false);

    const [profileForm, setProfileForm] = useState({
        fullName: "",
        email: "",
    });

    const [profileLoading, setProfileLoading] =
        useState(false);


    /*
    |--------------------------------------------------------------------------
    | Password State
    |--------------------------------------------------------------------------
    */

    const [showPasswordForm, setShowPasswordForm] =
        useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showCurrentPassword, setShowCurrentPassword] =
        useState(false);

    const [showNewPassword, setShowNewPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [passwordLoading, setPasswordLoading] =
        useState(false);


    /*
    |--------------------------------------------------------------------------
    | Logout State
    |--------------------------------------------------------------------------
    */

    const [logoutLoading, setLogoutLoading] =
        useState(false);


    /*
    |--------------------------------------------------------------------------
    | Messages
    |--------------------------------------------------------------------------
    */

    const [successMessage, setSuccessMessage] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");


    /*
    |--------------------------------------------------------------------------
    | Load User
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const storedUser =
            localStorage.getItem("user");

        if (!storedUser) {
            return;
        }

        try {

            const parsedUser =
                JSON.parse(storedUser);

            const userData = {
                fullName:
                    parsedUser.fullName || "",
                email:
                    parsedUser.email || "",
                role:
                    parsedUser.role || "student",
                createdAt:
                    parsedUser.createdAt || null,
            };

            setUser(userData);

            setProfileForm({
                fullName: userData.fullName,
                email: userData.email,
            });

        } catch (error) {

            console.error(
                "Failed to read user data:",
                error
            );

        }

    }, []);


    /*
    |--------------------------------------------------------------------------
    | Clear Messages
    |--------------------------------------------------------------------------
    */

    const clearMessages = () => {

        setSuccessMessage("");
        setErrorMessage("");

    };


    /*
    |--------------------------------------------------------------------------
    | Profile Input
    |--------------------------------------------------------------------------
    */

    const handleProfileChange = (event) => {

        const {
            name,
            value,
        } = event.target;

        setProfileForm((previous) => ({
            ...previous,
            [name]: value,
        }));

    };


    /*
    |--------------------------------------------------------------------------
    | Password Input
    |--------------------------------------------------------------------------
    */

    const handlePasswordChange = (event) => {

        const {
            name,
            value,
        } = event.target;

        setPasswordForm((previous) => ({
            ...previous,
            [name]: value,
        }));

    };


    /*
    |--------------------------------------------------------------------------
    | Edit Profile
    |--------------------------------------------------------------------------
    */

    const handleEditProfile = () => {

        clearMessages();

        setProfileForm({
            fullName: user.fullName,
            email: user.email,
        });

        setIsEditing(true);

    };


    /*
    |--------------------------------------------------------------------------
    | Cancel Edit
    |--------------------------------------------------------------------------
    */

    const handleCancelEdit = () => {

        setProfileForm({
            fullName: user.fullName,
            email: user.email,
        });

        setIsEditing(false);

        clearMessages();

    };


    /*
    |--------------------------------------------------------------------------
    | Update Profile
    |--------------------------------------------------------------------------
    */

    const handleUpdateProfile = async (event) => {

        event.preventDefault();

        clearMessages();


        if (!profileForm.fullName.trim()) {

            setErrorMessage(
                "Full name is required."
            );

            return;

        }


        if (!profileForm.email.trim()) {

            setErrorMessage(
                "Email address is required."
            );

            return;

        }


        try {

            setProfileLoading(true);

            const response =
                await updateProfileApi({
                    fullName:
                        profileForm.fullName.trim(),
                    email:
                        profileForm.email.trim(),
                });


            const updatedUser =
                response?.data?.user ||
                response?.data;


            const newUser = {
                ...user,
                ...(updatedUser || {}),
                fullName:
                    updatedUser?.fullName ||
                    profileForm.fullName.trim(),
                email:
                    updatedUser?.email ||
                    profileForm.email.trim(),
            };


            setUser(newUser);


            localStorage.setItem(
                "user",
                JSON.stringify(newUser)
            );


            setProfileForm({
                fullName:
                    newUser.fullName,
                email:
                    newUser.email,
            });


            setIsEditing(false);

            setSuccessMessage(
                "Profile updated successfully."
            );

        } catch (error) {

            console.error(
                "Profile update failed:",
                error
            );

            setErrorMessage(
                error?.response?.data?.message ||
                "Failed to update profile."
            );

        } finally {

            setProfileLoading(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Change Password
    |--------------------------------------------------------------------------
    */

    const handleChangePassword = async (event) => {

        event.preventDefault();

        clearMessages();


        const {
            currentPassword,
            newPassword,
            confirmPassword,
        } = passwordForm;


        if (!currentPassword) {

            setErrorMessage(
                "Current password is required."
            );

            return;

        }


        if (!newPassword) {

            setErrorMessage(
                "New password is required."
            );

            return;

        }


        if (newPassword.length < 6) {

            setErrorMessage(
                "New password must be at least 6 characters."
            );

            return;

        }


        if (newPassword !== confirmPassword) {

            setErrorMessage(
                "New passwords do not match."
            );

            return;

        }


        try {

            setPasswordLoading(true);

            await changePasswordApi({
                currentPassword,
                newPassword,
            });


            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });


            setShowPasswordForm(false);

            setSuccessMessage(
                "Password changed successfully."
            );

        } catch (error) {

            console.error(
                "Password change failed:",
                error
            );

            setErrorMessage(
                error?.response?.data?.message ||
                "Failed to change password."
            );

        } finally {

            setPasswordLoading(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */

    const handleLogout = async () => {
    try {

        setLogoutLoading(true);

        await logout();

        navigate("/login", {
            replace: true,
        });

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );

    } finally {

        setLogoutLoading(false);

    }
};

    /*
    |--------------------------------------------------------------------------
    | Joined Date
    |--------------------------------------------------------------------------
    */

    const joinedDate = user.createdAt
        ? new Date(
            user.createdAt
        ).toLocaleDateString(
            "en-IN",
            {
                month: "long",
                year: "numeric",
            }
        )
        : "August 2026";


    /*
    |--------------------------------------------------------------------------
    | Password Strength
    |--------------------------------------------------------------------------
    */

    const passwordLength =
        passwordForm.newPassword.length;

    const passwordStrength =
        passwordLength === 0
            ? null
            : passwordLength < 6
                ? "Weak"
                : passwordLength < 10
                    ? "Good"
                    : "Strong";


    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-screen bg-black text-white">


            {/* ========================================================== */}
            {/* Page Header */}
            {/* ========================================================== */}

            <section
                className="
                    border-b
                    border-[var(--color-border)]
                    bg-black
                "
            >

                <div className="mx-auto max-w-5xl px-6 py-10">

                    <p
                        className="
                            text-sm
                            font-semibold
                            uppercase
                            tracking-[0.18em]
                            text-[var(--color-primary)]
                        "
                    >
                        ACEM Academy
                    </p>

                    <h1
                        className="
                            mt-2
                            text-3xl
                            font-bold
                            tracking-tight
                            text-white
                        "
                    >
                        My Profile
                    </h1>

                    <p
                        className="
                            mt-2
                            text-sm
                            text-[var(--color-text-muted)]
                        "
                    >
                        Manage your account information and
                        security settings.
                    </p>

                </div>

            </section>


            {/* ========================================================== */}
            {/* Main */}
            {/* ========================================================== */}

            <main
                className="
                    mx-auto
                    max-w-5xl
                    px-6
                    py-10
                "
            >


                {/* ====================================================== */}
                {/* Messages */}
                {/* ====================================================== */}

                {successMessage && (

                    <div
                        className="
                            mb-6
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-[var(--color-primary)]/30
                            bg-[var(--color-primary)]/10
                            px-4
                            py-3
                            text-sm
                            text-[var(--color-primary)]
                        "
                    >

                        <CheckCircle2
                            size={18}
                        />

                        <span>
                            {successMessage}
                        </span>

                    </div>

                )}


                {errorMessage && (

                    <div
                        className="
                            mb-6
                            flex
                            items-center
                            gap-3
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

                        <AlertCircle
                            size={18}
                        />

                        <span>
                            {errorMessage}
                        </span>

                    </div>

                )}


                {/* ====================================================== */}
                {/* Profile Card */}
                {/* ====================================================== */}

                <section
                    className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                    "
                >


                    {/* ================================================== */}
                    {/* Profile Hero */}
                    {/* ================================================== */}

                    <div
                        className="
                            relative
                            overflow-hidden
                            border-b
                            border-[var(--color-border)]
                            bg-black
                            px-6
                            py-8
                            sm:px-8
                        "
                    >

                        <div
                            className="
                                absolute
                                right-[-80px]
                                top-[-100px]
                                h-64
                                w-64
                                rounded-full
                                bg-[var(--color-primary)]/5
                                blur-3xl
                            "
                        />


                        <div
                            className="
                                relative
                                flex
                                flex-col
                                gap-6
                                sm:flex-row
                                sm:items-center
                                sm:justify-between
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-5
                                "
                            >

                                {/* Avatar */}

                                <div
                                    className="
                                        flex
                                        h-20
                                        w-20
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-full
                                        border-2
                                        border-[var(--color-primary)]
                                        bg-[var(--color-primary)]
                                        text-3xl
                                        font-bold
                                        text-black
                                        shadow-[0_0_30px_rgba(255,227,110,0.12)]
                                    "
                                >

                                    {user.fullName
                                        ? user.fullName
                                            .charAt(0)
                                            .toUpperCase()
                                        : "U"}

                                </div>


                                <div className="min-w-0">

                                    <h2
                                        className="
                                            truncate
                                            text-2xl
                                            font-bold
                                            text-white
                                        "
                                    >
                                        {user.fullName ||
                                            "Student"}
                                    </h2>


                                    <p
                                        className="
                                            mt-1
                                            truncate
                                            text-sm
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        {user.email ||
                                            "No email available"}
                                    </p>


                                    <div className="mt-3 flex flex-wrap gap-2">

                                        <span
                                            className="
                                                rounded-full
                                                border
                                                border-[var(--color-primary)]/30
                                                bg-[var(--color-primary)]/10
                                                px-3
                                                py-1
                                                text-xs
                                                font-semibold
                                                capitalize
                                                text-[var(--color-primary)]
                                            "
                                        >
                                            {user.role}
                                        </span>


                                        <span
                                            className="
                                                flex
                                                items-center
                                                gap-1.5
                                                rounded-full
                                                border
                                                border-[var(--color-border)]
                                                bg-white/[0.03]
                                                px-3
                                                py-1
                                                text-xs
                                                text-[var(--color-text-muted)]
                                            "
                                        >

                                            <CalendarDays
                                                size={12}
                                            />

                                            Joined {joinedDate}

                                        </span>

                                    </div>

                                </div>

                            </div>


                            {!isEditing && (

                                <button
                                    type="button"
                                    onClick={
                                        handleEditProfile
                                    }
                                    className="
                                        inline-flex
                                        w-fit
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-[var(--color-primary)]
                                        bg-transparent
                                        px-4
                                        py-2.5
                                        text-sm
                                        font-semibold
                                        text-[var(--color-primary)]
                                        transition
                                        hover:bg-[var(--color-primary)]
                                        hover:text-black
                                    "
                                >

                                    <Edit3
                                        size={16}
                                    />

                                    Edit Profile

                                </button>

                            )}

                        </div>

                    </div>


                    {/* ================================================== */}
                    {/* Profile Information */}
                    {/* ================================================== */}

                    {!isEditing ? (

                        <div className="p-6 sm:p-8">

                            <div className="mb-6">

                                <h3
                                    className="
                                        text-lg
                                        font-bold
                                        text-white
                                    "
                                >
                                    Personal Information
                                </h3>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-[var(--color-text-muted)]
                                    "
                                >
                                    Your basic account information.
                                </p>

                            </div>


                            <div
                                className="
                                    grid
                                    gap-5
                                    sm:grid-cols-2
                                "
                            >


                                {/* Full Name */}

                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-black
                                        p-5
                                        transition
                                        hover:border-[var(--color-primary)]/40
                                    "
                                >

                                    <div className="flex items-start gap-4">

                                        <div
                                            className="
                                                flex
                                                h-10
                                                w-10
                                                shrink-0
                                                items-center
                                                justify-center
                                                rounded-lg
                                                bg-[var(--color-primary)]/10
                                            "
                                        >

                                            <User
                                                size={19}
                                                className="
                                                    text-[var(--color-primary)]
                                                "
                                            />

                                        </div>


                                        <div className="min-w-0">

                                            <p
                                                className="
                                                    text-xs
                                                    font-medium
                                                    uppercase
                                                    tracking-wide
                                                    text-[var(--color-text-muted)]
                                                "
                                            >
                                                Full Name
                                            </p>

                                            <p
                                                className="
                                                    mt-1
                                                    truncate
                                                    text-sm
                                                    font-semibold
                                                    text-white
                                                "
                                            >
                                                {user.fullName ||
                                                    "Not available"}
                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* Email */}

                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-black
                                        p-5
                                        transition
                                        hover:border-[var(--color-primary)]/40
                                    "
                                >

                                    <div className="flex items-start gap-4">

                                        <div
                                            className="
                                                flex
                                                h-10
                                                w-10
                                                shrink-0
                                                items-center
                                                justify-center
                                                rounded-lg
                                                bg-[var(--color-primary)]/10
                                            "
                                        >

                                            <Mail
                                                size={19}
                                                className="
                                                    text-[var(--color-primary)]
                                                "
                                            />

                                        </div>


                                        <div className="min-w-0">

                                            <p
                                                className="
                                                    text-xs
                                                    font-medium
                                                    uppercase
                                                    tracking-wide
                                                    text-[var(--color-text-muted)]
                                                "
                                            >
                                                Email Address
                                            </p>

                                            <p
                                                className="
                                                    mt-1
                                                    truncate
                                                    text-sm
                                                    font-semibold
                                                    text-white
                                                "
                                            >
                                                {user.email ||
                                                    "Not available"}
                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* Role */}

                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-black
                                        p-5
                                        transition
                                        hover:border-[var(--color-primary)]/40
                                    "
                                >

                                    <div className="flex items-start gap-4">

                                        <div
                                            className="
                                                flex
                                                h-10
                                                w-10
                                                shrink-0
                                                items-center
                                                justify-center
                                                rounded-lg
                                                bg-[var(--color-primary)]/10
                                            "
                                        >

                                            <ShieldCheck
                                                size={19}
                                                className="
                                                    text-[var(--color-primary)]
                                                "
                                            />

                                        </div>


                                        <div>

                                            <p
                                                className="
                                                    text-xs
                                                    font-medium
                                                    uppercase
                                                    tracking-wide
                                                    text-[var(--color-text-muted)]
                                                "
                                            >
                                                Account Role
                                            </p>

                                            <p
                                                className="
                                                    mt-1
                                                    text-sm
                                                    font-semibold
                                                    capitalize
                                                    text-white
                                                "
                                            >
                                                {user.role}
                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* Member Since */}

                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-black
                                        p-5
                                        transition
                                        hover:border-[var(--color-primary)]/40
                                    "
                                >

                                    <div className="flex items-start gap-4">

                                        <div
                                            className="
                                                flex
                                                h-10
                                                w-10
                                                shrink-0
                                                items-center
                                                justify-center
                                                rounded-lg
                                                bg-[var(--color-primary)]/10
                                            "
                                        >

                                            <CalendarDays
                                                size={19}
                                                className="
                                                    text-[var(--color-primary)]
                                                "
                                            />

                                        </div>


                                        <div>

                                            <p
                                                className="
                                                    text-xs
                                                    font-medium
                                                    uppercase
                                                    tracking-wide
                                                    text-[var(--color-text-muted)]
                                                "
                                            >
                                                Member Since
                                            </p>

                                            <p
                                                className="
                                                    mt-1
                                                    text-sm
                                                    font-semibold
                                                    text-white
                                                "
                                            >
                                                {joinedDate}
                                            </p>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    ) : (

                        /* ==================================================
                           Edit Profile Form
                           ================================================== */

                        <form
                            onSubmit={
                                handleUpdateProfile
                            }
                            className="p-6 sm:p-8"
                        >

                            <div className="mb-6">

                                <h3
                                    className="
                                        text-lg
                                        font-bold
                                        text-white
                                    "
                                >
                                    Edit Profile
                                </h3>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-[var(--color-text-muted)]
                                    "
                                >
                                    Update your personal information.
                                </p>

                            </div>


                            <div
                                className="
                                    grid
                                    gap-5
                                    sm:grid-cols-2
                                "
                            >

                                <div>

                                    <label
                                        htmlFor="fullName"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        Full Name
                                    </label>

                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        value={
                                            profileForm.fullName
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        className="
                                            h-11
                                            w-full
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-black
                                            px-4
                                            text-sm
                                            text-white
                                            outline-none
                                            transition
                                            placeholder:text-[var(--color-text-muted)]
                                            focus:border-[var(--color-primary)]
                                            focus:ring-2
                                            focus:ring-[var(--color-primary)]/20
                                        "
                                        placeholder="Enter your full name"
                                    />

                                </div>


                                <div>

                                    <label
                                        htmlFor="email"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        Email Address
                                    </label>

                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={
                                            profileForm.email
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        className="
                                            h-11
                                            w-full
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-black
                                            px-4
                                            text-sm
                                            text-white
                                            outline-none
                                            transition
                                            placeholder:text-[var(--color-text-muted)]
                                            focus:border-[var(--color-primary)]
                                            focus:ring-2
                                            focus:ring-[var(--color-primary)]/20
                                        "
                                        placeholder="Enter your email"
                                    />

                                </div>

                            </div>


                            <div className="mt-6 flex flex-wrap gap-3">

                                <button
                                    type="submit"
                                    disabled={
                                        profileLoading
                                    }
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        bg-[var(--color-primary)]
                                        px-5
                                        py-2.5
                                        text-sm
                                        font-semibold
                                        text-black
                                        transition
                                        hover:bg-[var(--color-primary-dark)]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                    "
                                >

                                    {profileLoading ? (

                                        <>
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />

                                            Saving...
                                        </>

                                    ) : (

                                        "Save Changes"

                                    )}

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleCancelEdit
                                    }
                                    disabled={
                                        profileLoading
                                    }
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        px-5
                                        py-2.5
                                        text-sm
                                        font-semibold
                                        text-white
                                        transition
                                        hover:border-[var(--color-primary)]
                                        hover:text-[var(--color-primary)]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                    "
                                >

                                    <X size={16} />

                                    Cancel

                                </button>

                            </div>

                        </form>

                    )}

                </section>


                {/* ====================================================== */}
                {/* Security */}
                {/* ====================================================== */}

                <section
                    className="
                        mt-6
                        rounded-2xl
                        border
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        p-6
                        sm:p-8
                    "
                >

                    <div
                        className="
                            flex
                            flex-col
                            gap-4
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        "
                    >

                        <div>

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-[var(--color-primary)]/10
                                    "
                                >

                                    <Lock
                                        size={19}
                                        className="
                                            text-[var(--color-primary)]
                                        "
                                    />

                                </div>


                                <div>

                                    <h3
                                        className="
                                            text-lg
                                            font-bold
                                            text-white
                                        "
                                    >
                                        Security
                                    </h3>

                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        Keep your account secure.
                                    </p>

                                </div>

                            </div>

                        </div>


                        {!showPasswordForm && (

                            <button
                                type="button"
                                onClick={() => {

                                    clearMessages();

                                    setShowPasswordForm(
                                        true
                                    );

                                }}
                                className="
                                    inline-flex
                                    w-fit
                                    items-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-[var(--color-primary)]
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-semibold
                                    text-[var(--color-primary)]
                                    transition
                                    hover:bg-[var(--color-primary)]
                                    hover:text-black
                                "
                            >

                                <Lock size={16} />

                                Change Password

                            </button>

                        )}

                    </div>


                    {showPasswordForm && (

                        <form
                            onSubmit={
                                handleChangePassword
                            }
                            className="
                                mt-7
                                border-t
                                border-[var(--color-border)]
                                pt-7
                            "
                        >

                            <div className="grid gap-5">


                                {/* Current Password */}

                                <div>

                                    <label
                                        htmlFor="currentPassword"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        Current Password
                                    </label>

                                    <div className="relative">

                                        <input
                                            id="currentPassword"
                                            name="currentPassword"
                                            type={
                                                showCurrentPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={
                                                passwordForm.currentPassword
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                            className="
                                                h-11
                                                w-full
                                                rounded-xl
                                                border
                                                border-[var(--color-border)]
                                                bg-black
                                                px-4
                                                pr-11
                                                text-sm
                                                text-white
                                                outline-none
                                                transition
                                                placeholder:text-[var(--color-text-muted)]
                                                focus:border-[var(--color-primary)]
                                                focus:ring-2
                                                focus:ring-[var(--color-primary)]/20
                                            "
                                            placeholder="Enter current password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCurrentPassword(
                                                    (previous) =>
                                                        !previous
                                                )
                                            }
                                            className="
                                                absolute
                                                right-3
                                                top-1/2
                                                -translate-y-1/2
                                                text-[var(--color-text-muted)]
                                                hover:text-[var(--color-primary)]
                                            "
                                        >

                                            {showCurrentPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}

                                        </button>

                                    </div>

                                </div>


                                {/* New Password */}

                                <div>

                                    <label
                                        htmlFor="newPassword"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        New Password
                                    </label>

                                    <div className="relative">

                                        <input
                                            id="newPassword"
                                            name="newPassword"
                                            type={
                                                showNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={
                                                passwordForm.newPassword
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                            className="
                                                h-11
                                                w-full
                                                rounded-xl
                                                border
                                                border-[var(--color-border)]
                                                bg-black
                                                px-4
                                                pr-11
                                                text-sm
                                                text-white
                                                outline-none
                                                transition
                                                placeholder:text-[var(--color-text-muted)]
                                                focus:border-[var(--color-primary)]
                                                focus:ring-2
                                                focus:ring-[var(--color-primary)]/20
                                            "
                                            placeholder="Enter new password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowNewPassword(
                                                    (previous) =>
                                                        !previous
                                                )
                                            }
                                            className="
                                                absolute
                                                right-3
                                                top-1/2
                                                -translate-y-1/2
                                                text-[var(--color-text-muted)]
                                                hover:text-[var(--color-primary)]
                                            "
                                        >

                                            {showNewPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}

                                        </button>

                                    </div>


                                    {passwordStrength && (

                                        <div className="mt-2 flex items-center justify-between">

                                            <span className="text-xs text-[var(--color-text-muted)]">
                                                Password strength
                                            </span>

                                            <span
                                                className={`
                                                    text-xs
                                                    font-semibold
                                                    ${
                                                        passwordStrength === "Weak"
                                                            ? "text-red-400"
                                                            : passwordStrength === "Good"
                                                                ? "text-[var(--color-primary)]"
                                                                : "text-green-400"
                                                    }
                                                `}
                                            >
                                                {passwordStrength}
                                            </span>

                                        </div>

                                    )}

                                </div>


                                {/* Confirm Password */}

                                <div>

                                    <label
                                        htmlFor="confirmPassword"
                                        className="
                                            mb-2
                                            block
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        Confirm New Password
                                    </label>

                                    <div className="relative">

                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={
                                                passwordForm.confirmPassword
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                            className="
                                                h-11
                                                w-full
                                                rounded-xl
                                                border
                                                border-[var(--color-border)]
                                                bg-black
                                                px-4
                                                pr-11
                                                text-sm
                                                text-white
                                                outline-none
                                                transition
                                                placeholder:text-[var(--color-text-muted)]
                                                focus:border-[var(--color-primary)]
                                                focus:ring-2
                                                focus:ring-[var(--color-primary)]/20
                                            "
                                            placeholder="Confirm new password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (previous) =>
                                                        !previous
                                                )
                                            }
                                            className="
                                                absolute
                                                right-3
                                                top-1/2
                                                -translate-y-1/2
                                                text-[var(--color-text-muted)]
                                                hover:text-[var(--color-primary)]
                                            "
                                        >

                                            {showConfirmPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}

                                        </button>

                                    </div>

                                </div>

                            </div>


                            <div className="mt-6 flex flex-wrap gap-3">

                                <button
                                    type="submit"
                                    disabled={
                                        passwordLoading
                                    }
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        bg-[var(--color-primary)]
                                        px-5
                                        py-2.5
                                        text-sm
                                        font-semibold
                                        text-black
                                        transition
                                        hover:bg-[var(--color-primary-dark)]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                    "
                                >

                                    {passwordLoading ? (

                                        <>
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />

                                            Updating...
                                        </>

                                    ) : (

                                        <>
                                            <Lock size={16} />

                                            Update Password
                                        </>

                                    )}

                                </button>


                                <button
                                    type="button"
                                    onClick={() => {

                                        setShowPasswordForm(
                                            false
                                        );

                                        setPasswordForm({
                                            currentPassword: "",
                                            newPassword: "",
                                            confirmPassword: "",
                                        });

                                        clearMessages();

                                    }}
                                    disabled={
                                        passwordLoading
                                    }
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        px-5
                                        py-2.5
                                        text-sm
                                        font-semibold
                                        text-white
                                        transition
                                        hover:border-[var(--color-primary)]
                                        hover:text-[var(--color-primary)]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                    "
                                >

                                    <X size={16} />

                                    Cancel

                                </button>

                            </div>

                        </form>

                    )}

                </section>


                {/* ====================================================== */}
                {/* Quick Actions */}
                {/* ====================================================== */}

                <section
                    className="
                        mt-6
                        rounded-2xl
                        border
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        p-6
                        sm:p-8
                    "
                >

                    <h3
                        className="
                            text-lg
                            font-bold
                            text-white
                        "
                    >
                        Quick Actions
                    </h3>

                    <p
                        className="
                            mt-1
                            text-sm
                            text-[var(--color-text-muted)]
                        "
                    >
                        Manage your learning account.
                    </p>


                    <div
                        className="
                            mt-6
                            grid
                            gap-4
                            sm:grid-cols-2
                        "
                    >


                        {/* My Learning */}

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/student/my-learning"
                                )
                            }
                            className="
                                group
                                flex
                                items-center
                                gap-4
                                rounded-xl
                                border
                                border-[var(--color-border)]
                                bg-black
                                p-4
                                text-left
                                transition
                                hover:border-[var(--color-primary)]
                                hover:bg-[var(--color-primary)]/5
                            "
                        >

                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-[var(--color-primary)]/10
                                    transition
                                    group-hover:bg-[var(--color-primary)]
                                "
                            >

                                <BookOpen
                                    size={19}
                                    className="
                                        text-[var(--color-primary)]
                                        group-hover:text-black
                                    "
                                />

                            </div>


                            <div>

                                <p
                                    className="
                                        text-sm
                                        font-semibold
                                        text-white
                                        transition
                                        group-hover:text-[var(--color-primary)]
                                    "
                                >
                                    My Learning
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        text-[var(--color-text-muted)]
                                    "
                                >
                                    View your enrolled courses
                                </p>

                            </div>

                        </button>


                        {/* Logout */}

                        <button
                            type="button"
                            onClick={
                                handleLogout
                            }
                            disabled={
                                logoutLoading
                            }
                            className="
                                group
                                flex
                                items-center
                                gap-4
                                rounded-xl
                                border
                                border-red-900/70
                                bg-black
                                p-4
                                text-left
                                transition
                                hover:border-red-600
                                hover:bg-red-950/20
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >

                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-red-950/40
                                "
                            >

                                {logoutLoading ? (

                                    <Loader2
                                        size={19}
                                        className="
                                            animate-spin
                                            text-red-500
                                        "
                                    />

                                ) : (

                                    <LogOut
                                        size={19}
                                        className="
                                            text-red-500
                                        "
                                    />

                                )}

                            </div>


                            <div>

                                <p
                                    className="
                                        text-sm
                                        font-semibold
                                        text-red-500
                                    "
                                >
                                    {logoutLoading
                                        ? "Logging out..."
                                        : "Logout"}
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        text-[var(--color-text-muted)]
                                    "
                                >
                                    Sign out of your account
                                </p>

                            </div>

                        </button>

                    </div>

                </section>

            </main>

        </div>

    );
}


export default Profile;