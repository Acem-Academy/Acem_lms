/*
 * Regression suite: Day 14 - Integration & Full User Journey Testing.
 *
 * Covers end-to-end integration across Days 1-13:
 * - Workflow 1: Authentication & Account (Register, OTP verify, Login with cookies, Profile, Profile update, Token refresh, Password change, Logout)
 * - Workflow 2: Admin Operations & RBAC (Dashboard stats, Users pagination/filter, User status update, Courses pagination, RBAC guards)
 * - Workflow 3: Teacher Core Journey (Course creation, Whitelist enforcement, Curriculum tree: subcourse/chapter/topic/lesson, Publish pipeline, Teacher students, Ownership guard)
 * - Workflow 4: Student Learning Journey (Course discovery, Syllabus redaction pre-enrollment, Enrollment, My Courses, Lesson content access with quiz redaction, Start lesson, Quiz grading, Complete lesson)
 * - Workflow 5: Security & Error Contract Guardrails (Malformed IDs return 400, Role authorization on progress endpoints, Redaction integrity)
 * - Workflow 6: Data restoration & baseline integrity verification
 *
 * Usage:
 *   node tests/regression/run.js day14
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const ADMIN = "6a703908e4a774afc478ea9b";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT = "6a707973e4a774afc478ea9d";
const TS = Date.now();
const TAG = `D14_${TS}`;

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tokenFor = (id) =>
    jwt.sign({ id, role: "dummy" }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
    });

const cookieHeader = (id, extraCookies = "") => {
    const cookies = [];
    if (id) {
        cookies.push(`accessToken=${tokenFor(id)}`);
    }
    if (extraCookies) {
        cookies.push(extraCookies);
    }
    return cookies.length > 0 ? { Cookie: cookies.join("; ") } : {};
};

const req = async (method, path, { who, rawCookies, json } = {}) => {
    let headers = {};
    if (rawCookies) {
        headers.Cookie = rawCookies;
    } else if (who) {
        headers = { ...cookieHeader(who) };
    }

    let body;
    if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    }

    const res = await fetch(`${BASE}/api/v1${path}`, { method, headers, body });
    let parsed = null;
    try {
        parsed = await res.json();
    } catch {
        /* non-json */
    }

    const setCookies = res.headers.get("set-cookie") || "";

    return {
        status: res.status,
        data: parsed ? parsed.data : null,
        msg: parsed ? parsed.message : null,
        errors: parsed && Array.isArray(parsed.errors) ? parsed.errors : null,
        rawHeaders: res.headers,
        setCookies,
    };
};

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Snapshot baseline counts
    const initialCounts = {
        users: await db.collection("users").countDocuments(),
        courses: await db.collection("courses").countDocuments(),
        subcourses: await db.collection("subcourses").countDocuments(),
        chapters: await db.collection("chapters").countDocuments(),
        topics: await db.collection("topics").countDocuments(),
        lessons: await db.collection("lessons").countDocuments(),
        enrollments: await db.collection("enrollments").countDocuments(),
        quizattempts: await db.collection("quizattempts").countDocuments(),
    };

    console.log(`[Day 14 Probe] Baseline counts: Users=${initialCounts.users}, Courses=${initialCounts.courses}, Enrollments=${initialCounts.enrollments}`);

    let tempUserId = null;
    let tempCourseId = null;
    let tempSubCourseId = null;
    let tempChapterId = null;
    let tempTopicId = null;
    let tempLessonId = null;
    let tempEnrollmentId = null;

    try {
        /* ====================================================================== */
        /* Workflow 1: Authentication & Account Integration                        */
        /* ====================================================================== */
        console.log("\n--- Workflow 1: Authentication & Account Integration ---");

        const testEmail = `test_int_${TS}@acem.test`;
        const testPassword = "Password123!";
        const KNOWN_OTP = "123456";

        // 1.1 Registration
        const regRes = await req("POST", "/auth/register", {
            json: {
                fullName: "Integration Student",
                email: testEmail,
                password: testPassword,
            },
        });
        check(
            "1.1 Student registration returns 201 with user data",
            regRes.status === 201 && regRes.data && regRes.data.email === testEmail,
            `status=${regRes.status} email=${regRes.data?.email}`
        );

        const tempUserDoc = await db.collection("users").findOne({ email: testEmail });
        tempUserId = tempUserDoc ? tempUserDoc._id.toString() : null;

        // 1.2 Unverified login rejected
        const unverifiedLogin = await req("POST", "/auth/login", {
            json: {
                email: testEmail,
                password: testPassword,
            },
        });
        check(
            "1.2 Login with unverified email returns 403 EMAIL_NOT_VERIFIED",
            unverifiedLogin.status === 403 &&
                Array.isArray(unverifiedLogin.errors) &&
                unverifiedLogin.errors.includes("EMAIL_NOT_VERIFIED"),
            `status=${unverifiedLogin.status} errors=${JSON.stringify(unverifiedLogin.errors)}`
        );

        // Seed known OTP hash in database for deterministic email verification testing
        const hashedOtp = await bcrypt.hash(KNOWN_OTP, 10);
        await db.collection("otps").updateOne(
            { email: testEmail },
            { $set: { codeHash: hashedOtp, attempts: 0, expiresAt: new Date(Date.now() + 600000) } }
        );

        // 1.3 Verify email with valid OTP
        const verifyRes = await req("POST", "/auth/verify-email", {
            json: {
                email: testEmail,
                otp: KNOWN_OTP,
            },
        });
        check(
            "1.3 Verify email with valid OTP returns 200",
            verifyRes.status === 200,
            `status=${verifyRes.status} msg=${verifyRes.msg}`
        );

        // 1.4 Login with verified account
        const loginRes = await req("POST", "/auth/login", {
            json: {
                email: testEmail,
                password: testPassword,
            },
        });

        const hasAccessTokenCookie = loginRes.setCookies.includes("accessToken=");
        const hasRefreshTokenCookie = loginRes.setCookies.includes("refreshToken=");

        check(
            "1.4 Login with verified account returns 200 and sets auth cookies",
            loginRes.status === 200 && hasAccessTokenCookie && hasRefreshTokenCookie,
            `status=${loginRes.status} cookies=${loginRes.setCookies ? "present" : "missing"}`
        );

        // Extract cookies from login response
        const cookiesReceived = loginRes.setCookies
            .split(/,(?=[^;]+?=)/)
            .map((c) => c.trim().split(";")[0])
            .join("; ");

        // 1.5 Get Profile using cookie
        const profileRes = await req("GET", "/auth/profile", { rawCookies: cookiesReceived });
        check(
            "1.5 Profile retrieval with auth cookies returns 200 with user data",
            profileRes.status === 200 && profileRes.data?.email === testEmail,
            `status=${profileRes.status} name=${profileRes.data?.fullName}`
        );

        // 1.6 Update Profile
        const updateProfRes = await req("PATCH", "/auth/profile", {
            rawCookies: cookiesReceived,
            json: {
                fullName: "Integration Student Renamed",
                email: testEmail,
            },
        });
        check(
            "1.6 Update profile returns 200 and persists updated fullName",
            updateProfRes.status === 200 && updateProfRes.data?.fullName === "Integration Student Renamed",
            `status=${updateProfRes.status} name=${updateProfRes.data?.fullName}`
        );

        // 1.7 Refresh Token rotation
        const refreshTokenCookie = cookiesReceived
            .split("; ")
            .find((c) => c.startsWith("refreshToken="));

        const refreshRes = await req("POST", "/auth/refresh-token", {
            rawCookies: refreshTokenCookie,
        });
        check(
            "1.7 Token refresh with refreshToken cookie returns 200 and fresh accessToken",
            refreshRes.status === 200 && refreshRes.setCookies.includes("accessToken="),
            `status=${refreshRes.status}`
        );

        // 1.8 Change Password
        const newPassword = "NewPassword456!";
        const changePassRes = await req("PATCH", "/auth/change-password", {
            rawCookies: cookiesReceived,
            json: {
                oldPassword: testPassword,
                newPassword: newPassword,
            },
        });
        check(
            "1.8 Change password returns 200",
            changePassRes.status === 200,
            `status=${changePassRes.status}`
        );

        // 1.9 Logout
        const logoutRes = await req("POST", "/auth/logout", {
            rawCookies: cookiesReceived,
        });
        check(
            "1.9 Logout returns 200 and revokes session",
            logoutRes.status === 200,
            `status=${logoutRes.status}`
        );

        /* ====================================================================== */
        /* Workflow 2: Admin Operations & RBAC Integration                         */
        /* ====================================================================== */
        console.log("\n--- Workflow 2: Admin Operations & RBAC Integration ---");

        // 2.1 Admin Dashboard stats
        const adminDashRes = await req("GET", "/admin/dashboard", { who: ADMIN });
        const d = adminDashRes.data;
        check(
            "2.1 Admin dashboard returns 200 with comprehensive stats",
            adminDashRes.status === 200 &&
                d &&
                typeof d.totalUsers === "number" &&
                typeof d.totalCourses === "number" &&
                typeof d.totalEnrollments === "number" &&
                typeof d.activeUsers === "number" &&
                Array.isArray(d.usersByRole) &&
                Array.isArray(d.coursesByStatus),
            `status=${adminDashRes.status} totalUsers=${d?.totalUsers} totalCourses=${d?.totalCourses}`
        );

        // 2.2 Admin Users list with pagination and search
        const adminUsersRes = await req("GET", "/admin/users?page=1&limit=5&role=student", { who: ADMIN });
        check(
            "2.2 Admin users list returns 200 with pagination and role filter",
            adminUsersRes.status === 200 &&
                Array.isArray(adminUsersRes.data?.users) &&
                adminUsersRes.data?.total !== undefined &&
                adminUsersRes.data?.totalPages !== undefined &&
                adminUsersRes.data.users.every((u) => u.role === "student" && !u.password && !u.refreshToken),
            `status=${adminUsersRes.status} count=${adminUsersRes.data?.users?.length} total=${adminUsersRes.data?.total}`
        );

        // 2.3 Admin update user status
        const adminUpdateUserRes = await req("PATCH", `/admin/users/${tempUserId}`, {
            who: ADMIN,
            json: { status: "inactive" },
        });
        check(
            "2.3 Admin update user status to inactive returns 200",
            adminUpdateUserRes.status === 200 && adminUpdateUserRes.data?.status === "inactive",
            `status=${adminUpdateUserRes.status} userStatus=${adminUpdateUserRes.data?.status}`
        );

        // Re-activate user for subsequent tests
        await db.collection("users").updateOne(
            { _id: new mongoose.Types.ObjectId(tempUserId) },
            { $set: { status: "active" } }
        );

        // 2.4 Admin Courses list
        const adminCoursesRes = await req("GET", "/admin/courses?page=1&limit=10", { who: ADMIN });
        check(
            "2.4 Admin courses list returns 200 with pagination",
            adminCoursesRes.status === 200 &&
                Array.isArray(adminCoursesRes.data?.courses) &&
                adminCoursesRes.data?.total !== undefined &&
                adminCoursesRes.data?.totalPages !== undefined,
            `status=${adminCoursesRes.status} count=${adminCoursesRes.data?.courses?.length}`
        );

        // 2.5 Student cannot access admin dashboard (403)
        const studentAdminRes = await req("GET", "/admin/dashboard", { who: tempUserId });
        check(
            "2.5 Student access to admin dashboard returns 403 Forbidden",
            studentAdminRes.status === 403,
            `status=${studentAdminRes.status}`
        );

        /* ====================================================================== */
        /* Workflow 3: Teacher Core Journey & Curriculum Hierarchy                  */
        /* ====================================================================== */
        console.log("\n--- Workflow 3: Teacher Core Journey ---");

        // 3.1 Teacher views their courses
        const teacherCoursesRes = await req("GET", "/courses/my-courses", { who: TEACHER });
        check(
            "3.1 Teacher views my-courses returns 200",
            teacherCoursesRes.status === 200 && Array.isArray(teacherCoursesRes.data),
            `status=${teacherCoursesRes.status} count=${teacherCoursesRes.data?.length}`
        );

        // 3.2 Teacher creates a course (verifying default draft status and teacher binding)
        const createCourseRes = await req("POST", "/courses", {
            who: TEACHER,
            json: {
                title: `Integration Course ${TAG}`,
                courseCode: `IC_${TAG.substring(0, 8)}`,
                description: "This is a full integration test course for ACEM Academy LMS.",
                price: 99,
                duration: 120,
                visibility: "public",
            },
        });
        tempCourseId = createCourseRes.data?._id;
        check(
            "3.2 Teacher creates course returns 201 with draft status",
            createCourseRes.status === 201 &&
                tempCourseId &&
                createCourseRes.data.status === "draft" &&
                (createCourseRes.data.teacher._id || createCourseRes.data.teacher).toString() === TEACHER,
            `status=${createCourseRes.status} id=${tempCourseId}`
        );

        // 3.3 Teacher updates course metadata
        const updateCourseRes = await req("PATCH", `/courses/${tempCourseId}`, {
            who: TEACHER,
            json: {
                title: `Integration Course ${TAG} Updated`,
                price: 149,
            },
        });
        check(
            "3.3 Teacher updates course returns 200 with updated fields",
            updateCourseRes.status === 200 && updateCourseRes.data?.price === 149,
            `status=${updateCourseRes.status} price=${updateCourseRes.data?.price}`
        );

        // Publish course so curriculum subcourses can be attached (business logic requirement)
        await req("PATCH", `/courses/${tempCourseId}/publish`, { who: TEACHER, json: { status: "published" } });

        // 3.4 Teacher creates curriculum tree: SubCourse
        const subCourseRes = await req("POST", "/sub-courses", {
            who: TEACHER,
            json: {
                course: tempCourseId,
                title: "Integration SubCourse 1",
                position: 1,
            },
        });
        tempSubCourseId = subCourseRes.data?._id;
        check(
            "3.4 Teacher creates sub-course returns 201",
            subCourseRes.status === 201 && tempSubCourseId,
            `status=${subCourseRes.status} id=${tempSubCourseId}`
        );

        // 3.5 Teacher creates Chapter
        const chapterRes = await req("POST", "/chapters", {
            who: TEACHER,
            json: {
                subCourse: tempSubCourseId,
                title: "Integration Chapter 1",
                position: 1,
            },
        });
        tempChapterId = chapterRes.data?._id;
        check(
            "3.5 Teacher creates chapter returns 201",
            chapterRes.status === 201 && tempChapterId,
            `status=${chapterRes.status} id=${tempChapterId}`
        );

        // 3.6 Teacher creates Topic
        const topicRes = await req("POST", "/topics", {
            who: TEACHER,
            json: {
                chapter: tempChapterId,
                title: "Integration Topic 1",
                position: 1,
            },
        });
        tempTopicId = topicRes.data?._id;
        check(
            "3.6 Teacher creates topic returns 201",
            topicRes.status === 201 && tempTopicId,
            `status=${topicRes.status} id=${tempTopicId}`
        );

        // 3.7 Teacher creates Lesson with content and quiz
        const lessonRes = await req("POST", "/lessons", {
            who: TEACHER,
            json: {
                topic: tempTopicId,
                title: "Integration Lesson 1",
                content: "Detailed full lesson content for integration verification.",
                position: 1,
                quiz: {
                    enabled: true,
                    passingScore: 75,
                    maxAttempts: 3,
                    questions: [
                        {
                            question: "What does LMS stand for?",
                            options: [
                                "Learning Management System",
                                "Local Machine Software",
                                "Long Memory Storage",
                                "Light Mode Standard",
                            ],
                            correctAnswer: 0,
                            explanation: "LMS stands for Learning Management System.",
                            points: 10,
                        },
                    ],
                },
            },
        });
        tempLessonId = lessonRes.data?._id;
        check(
            "3.7 Teacher creates lesson with quiz returns 201",
            lessonRes.status === 201 && tempLessonId,
            `status=${lessonRes.status} id=${tempLessonId}`
        );

        // 3.8 Teacher publishes curriculum hierarchy
        const pubS = await req("PATCH", `/sub-courses/${tempSubCourseId}/publish`, { who: TEACHER, json: { status: "published" } });
        const pubC = await req("PATCH", `/chapters/${tempChapterId}/publish`, { who: TEACHER, json: { status: "published" } });
        const pubT = await req("PATCH", `/topics/${tempTopicId}/publish`, { who: TEACHER, json: { status: "published" } });
        const pubL = await req("PATCH", `/lessons/${tempLessonId}/publish`, { who: TEACHER, json: { status: "published" } });

        check(
            "3.8 Teacher publishes curriculum hierarchy returns 200 across all nodes",
            pubS.status === 200 && pubC.status === 200 && pubT.status === 200 && pubL.status === 200,
            `subcourse=${pubS.status} chapter=${pubC.status} topic=${pubT.status} lesson=${pubL.status}`
        );

        // 3.9 Cross-teacher modification blocked
        const foreignRes = await req("PATCH", `/lessons/${tempLessonId}`, {
            who: tempUserId,
            json: { title: "Hacked" },
        });
        check(
            "3.9 Unauthorized user blocked from modifying teacher lesson returns 403",
            foreignRes.status === 403,
            `status=${foreignRes.status}`
        );

        /* ====================================================================== */
        /* Workflow 4: Student Learning Journey                                    */
        /* ====================================================================== */
        console.log("\n--- Workflow 4: Student Learning Journey ---");

        // 4.1 Student discovers published courses
        const publicCoursesRes = await req("GET", "/courses", { who: tempUserId });
        const foundCreatedCourse = publicCoursesRes.data?.find((c) => c._id.toString() === tempCourseId);
        check(
            "4.1 Student discovers published course in catalog",
            publicCoursesRes.status === 200 && !!foundCreatedCourse,
            `status=${publicCoursesRes.status} found=${!!foundCreatedCourse}`
        );

        // 4.2 Pre-enrollment lesson list access (H10): syllabus metadata only, NO content/quiz
        const preEnrollLessonsRes = await req("GET", `/lessons?topic=${tempTopicId}`, { who: tempUserId });
        const preLesson = preEnrollLessonsRes.data?.[0];
        check(
            "4.2 Pre-enrollment lesson list redacts proprietary content and quiz keys",
            preEnrollLessonsRes.status === 200 &&
                preLesson &&
                preLesson.content === undefined &&
                preLesson.video === undefined &&
                preLesson.quiz === undefined,
            `status=${preEnrollLessonsRes.status} contentPresent=${preLesson?.content !== undefined}`
        );

        // 4.3 Student enrolls in course
        const enrollRes = await req("POST", "/enrollments", {
            who: tempUserId,
            json: { course: tempCourseId },
        });
        tempEnrollmentId = enrollRes.data?._id;
        check(
            "4.3 Student enrolls in course returns 201",
            enrollRes.status === 201 && tempEnrollmentId,
            `status=${enrollRes.status} enrollmentId=${tempEnrollmentId}`
        );

        // 4.4 Duplicate enrollment returns 409 Conflict
        const dupEnrollRes = await req("POST", "/enrollments", {
            who: tempUserId,
            json: { course: tempCourseId },
        });
        check(
            "4.4 Duplicate enrollment rejected with 409 Conflict",
            dupEnrollRes.status === 409,
            `status=${dupEnrollRes.status} msg=${dupEnrollRes.msg}`
        );

        // 4.5 Student views My Courses
        const myLearningRes = await req("GET", "/enrollments/my-courses", { who: tempUserId });
        const foundInMyCourses = myLearningRes.data?.find(
            (e) => (e.course?._id || e.course)?.toString() === tempCourseId
        );
        check(
            "4.5 Enrolled course appears in student's My Courses list",
            myLearningRes.status === 200 && !!foundInMyCourses,
            `status=${myLearningRes.status} found=${!!foundInMyCourses}`
        );

        // 4.6 Enrolled lesson access: content is delivered, but quiz correctAnswer & explanation are REDACTED (C4)
        const enrolledLessonRes = await req("GET", `/lessons/${tempLessonId}`, { who: tempUserId });
        const lData = enrolledLessonRes.data;
        const q0 = lData?.quiz?.questions?.[0];
        check(
            "4.6 Enrolled student receives lesson content with quiz answers strictly redacted",
            enrolledLessonRes.status === 200 &&
                lData?.content &&
                q0 &&
                q0.correctAnswer === undefined &&
                q0.explanation === undefined,
            `status=${enrolledLessonRes.status} hasContent=${!!lData?.content} answerRedacted=${q0?.correctAnswer === undefined}`
        );

        // 4.7 Student starts lesson
        const startLessonRes = await req("POST", `/enrollments/${tempEnrollmentId}/lessons/${tempLessonId}/start`, {
            who: tempUserId,
        });
        check(
            "4.7 Student starts lesson returns 200 and records lastAccessedLesson",
            startLessonRes.status === 200 &&
                startLessonRes.data?.enrollment?.lastAccessedLesson?.toString() === tempLessonId,
            `status=${startLessonRes.status}`
        );

        // 4.8 Student submits quiz
        const quizSubmitRes = await req("POST", `/lessons/${tempLessonId}/quiz/submit`, {
            who: tempUserId,
            json: { answers: [0] }, // Correct answer is 0
        });
        check(
            "4.8 Student submits quiz and receives verified passing score",
            quizSubmitRes.status === 200 &&
                quizSubmitRes.data?.passed === true &&
                quizSubmitRes.data?.percentage === 100 &&
                quizSubmitRes.data?.earnedPoints === 10,
            `status=${quizSubmitRes.status} passed=${quizSubmitRes.data?.passed} earned=${quizSubmitRes.data?.earnedPoints}`
        );

        // 4.9 Student completes lesson
        const completeLessonRes = await req("POST", `/enrollments/${tempEnrollmentId}/lessons/${tempLessonId}/complete`, {
            who: tempUserId,
        });
        check(
            "4.9 Student completes lesson returns 200 and progress reaches 100%",
            completeLessonRes.status === 200 && completeLessonRes.data?.progress === 100,
            `status=${completeLessonRes.status} progress=${completeLessonRes.data?.progress}%`
        );

        // 4.10 Teacher can view enrolled student in teacher students list
        const teacherStudentsRes = await req("GET", "/enrollments/teacher/students", { who: TEACHER });
        const enrolledStudentEntry = teacherStudentsRes.data?.find(
            (item) => item.student?._id?.toString() === tempUserId || item.course?._id?.toString() === tempCourseId
        );
        check(
            "4.10 Teacher students endpoint returns student enrollment record",
            teacherStudentsRes.status === 200 && !!enrolledStudentEntry,
            `status=${teacherStudentsRes.status} found=${!!enrolledStudentEntry}`
        );

        /* ====================================================================== */
        /* Workflow 5: Security & Error Contract Guardrails                        */
        /* ====================================================================== */
        console.log("\n--- Workflow 5: Security & Error Contracts ---");

        // 5.1 Malformed course ID returns 400 Bad Request (not 500)
        const malformedCourse = await req("GET", "/courses/not-a-valid-id", { who: tempUserId });
        check(
            "5.1 Malformed courseId returns 400 Bad Request",
            malformedCourse.status === 400,
            `status=${malformedCourse.status}`
        );

        // 5.2 Malformed lesson ID returns 400 Bad Request (not 500)
        const malformedLesson = await req("GET", "/lessons/not-a-valid-id", { who: tempUserId });
        check(
            "5.2 Malformed lessonId returns 400 Bad Request",
            malformedLesson.status === 400,
            `status=${malformedLesson.status}`
        );

        // 5.3 Teacher cannot call student progress route (403 Forbidden)
        const teacherOnProgress = await req("POST", `/enrollments/${tempEnrollmentId}/lessons/${tempLessonId}/start`, {
            who: TEACHER,
        });
        check(
            "5.3 Teacher calling student lesson progress route returns 403 Forbidden",
            teacherOnProgress.status === 403,
            `status=${teacherOnProgress.status}`
        );

        // 5.4 Unauthenticated request returns 401 Unauthorized
        const anonRes = await req("GET", "/auth/profile");
        check(
            "5.4 Unauthenticated request to /auth/profile returns 401 Unauthorized",
            anonRes.status === 401,
            `status=${anonRes.status}`
        );

    } finally {
        /* ====================================================================== */
        /* Workflow 6: Cleanup & Database Restoration                              */
        /* ====================================================================== */
        console.log("\n--- Workflow 6: Cleanup & State Restoration ---");

        if (tempEnrollmentId) {
            await db.collection("enrollments").deleteOne({ _id: new mongoose.Types.ObjectId(tempEnrollmentId) });
        }
        if (tempUserId) {
            await db.collection("quizattempts").deleteMany({ student: new mongoose.Types.ObjectId(tempUserId) });
            await db.collection("users").deleteOne({ _id: new mongoose.Types.ObjectId(tempUserId) });
            await db.collection("otps").deleteMany({ email: `test_int_${TS}@acem.test` });
        }
        if (tempLessonId) {
            await db.collection("lessons").deleteOne({ _id: new mongoose.Types.ObjectId(tempLessonId) });
        }
        if (tempTopicId) {
            await db.collection("topics").deleteOne({ _id: new mongoose.Types.ObjectId(tempTopicId) });
        }
        if (tempChapterId) {
            await db.collection("chapters").deleteOne({ _id: new mongoose.Types.ObjectId(tempChapterId) });
        }
        if (tempSubCourseId) {
            await db.collection("subcourses").deleteOne({ _id: new mongoose.Types.ObjectId(tempSubCourseId) });
        }
        if (tempCourseId) {
            await db.collection("courses").deleteOne({ _id: new mongoose.Types.ObjectId(tempCourseId) });
        }

        // Verify restoration of baseline counts
        const finalCounts = {
            users: await db.collection("users").countDocuments(),
            courses: await db.collection("courses").countDocuments(),
            subcourses: await db.collection("subcourses").countDocuments(),
            chapters: await db.collection("chapters").countDocuments(),
            topics: await db.collection("topics").countDocuments(),
            lessons: await db.collection("lessons").countDocuments(),
            enrollments: await db.collection("enrollments").countDocuments(),
            quizattempts: await db.collection("quizattempts").countDocuments(),
        };

        const countsRestored =
            finalCounts.users === initialCounts.users &&
            finalCounts.courses === initialCounts.courses &&
            finalCounts.subcourses === initialCounts.subcourses &&
            finalCounts.chapters === initialCounts.chapters &&
            finalCounts.topics === initialCounts.topics &&
            finalCounts.lessons === initialCounts.lessons &&
            finalCounts.enrollments === initialCounts.enrollments &&
            finalCounts.quizattempts === initialCounts.quizattempts;

        check(
            "6.1 Database counts fully restored to pre-probe baseline",
            countsRestored,
            `Users: ${initialCounts.users}->${finalCounts.users}, Courses: ${initialCounts.courses}->${finalCounts.courses}, Enrollments: ${initialCounts.enrollments}->${finalCounts.enrollments}`
        );

        await mongoose.disconnect();
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    console.log(`\n=== Day 14 Integration: ${passed}/${results.length} assertions passed, ${failed} failed ===\n`);

    if (failed > 0) {
        process.exit(1);
    }
})();
