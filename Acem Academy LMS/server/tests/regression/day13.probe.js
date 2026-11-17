/*
 * Regression suite: Day 13 - Security & Validation Retest.
 *
 * Covers:
 * - Course create mass assignment guard (status forced to draft, isDeleted forced to false, teacher forced to auth user)
 * - Malformed ObjectId handling returns 400 (not 500) across routes
 * - Enrollment lesson start & complete routes enforce student authorization (403 for non-students)
 * - Temporary test records are purged and database counts verified to baseline
 *
 * Usage:
 *   node tests/regression/run.js day13
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT = "6a707973e4a774afc478ea9d";
const TAG = "SEC13 ";

const FAKE_ID = new mongoose.Types.ObjectId().toString();
const EPOCH = "2000-01-01T00:00:00.000Z";

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tokenFor = (id) =>
    jwt.sign({ id, role: "dummy" }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
    });

const cookieHeader = (id) => (id ? { Cookie: `accessToken=${tokenFor(id)}` } : {});

const req = async (method, path, { who, json } = {}) => {
    const headers = { ...cookieHeader(who) };
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
        /* none */
    }
    return {
        status: res.status,
        data: parsed ? parsed.data : null,
        msg: parsed ? parsed.message : null,
        errors: parsed && Array.isArray(parsed.errors) ? parsed.errors : null,
    };
};

const idOf = (d) => (d && (d._id ? d._id.toString() : null)) || null;

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const initialCourseCount = await db.collection("courses").countDocuments();

    /* ====================================================================== */
    /* 1. Course Create Mass Assignment Protection                             */
    /* ====================================================================== */

    const hostileCoursePayload = {
        title: `${TAG}Hostile Course`,
        courseCode: `SEC13-${Date.now()}`,
        description: "Testing course create mass assignment defenses.",
        status: "published",
        isDeleted: true,
        teacher: STUDENT,
        _id: FAKE_ID,
        createdAt: EPOCH,
        updatedAt: EPOCH,
    };

    const createRes = await req("POST", "/courses", {
        who: TEACHER,
        json: hostileCoursePayload,
    });

    const courseId = idOf(createRes.data);
    check("1a. course create accepted with status 201", createRes.status === 201 && courseId, `status=${createRes.status} id=${courseId}`);

    const courseDoc = await db.collection("courses").findOne({ _id: new mongoose.Types.ObjectId(courseId) });
    check("1b. course status forced to draft (not published)", courseDoc && courseDoc.status === "draft", `status=${courseDoc && courseDoc.status}`);
    check("1c. course isDeleted forced to false (not true)", courseDoc && courseDoc.isDeleted === false, `isDeleted=${courseDoc && courseDoc.isDeleted}`);
    check("1d. course teacher set to authenticated teacher (not student)", courseDoc && courseDoc.teacher.toString() === TEACHER, `teacher=${courseDoc && courseDoc.teacher.toString()}`);
    check("1e. course _id not overridden by client fake id", courseDoc && courseDoc._id.toString() !== FAKE_ID, `_id=${courseDoc && courseDoc._id.toString()}`);

    /* ====================================================================== */
    /* 2. Malformed ObjectId Request Validation & Error Handling (400 not 500) */
    /* ====================================================================== */

    const malformedCourse = await req("GET", "/courses/not-a-valid-id", { who: STUDENT });
    check("2a. malformed courseId returns 400 (not 500)", malformedCourse.status === 400, `status=${malformedCourse.status} msg=${JSON.stringify(malformedCourse.msg)}`);

    const malformedLesson = await req("GET", "/lessons/not-a-valid-id", { who: STUDENT });
    check("2b. malformed lessonId returns 400 (not 500)", malformedLesson.status === 400, `status=${malformedLesson.status} msg=${JSON.stringify(malformedLesson.msg)}`);

    const malformedStart = await req("POST", "/enrollments/not-an-id/lessons/also-bad/start", { who: STUDENT });
    check("2c. malformed enrollment start params return 400 (not 500)", malformedStart.status === 400, `status=${malformedStart.status} msg=${JSON.stringify(malformedStart.msg)}`);

    const malformedComplete = await req("POST", "/enrollments/not-an-id/lessons/also-bad/complete", { who: STUDENT });
    check("2d. malformed enrollment complete params return 400 (not 500)", malformedComplete.status === 400, `status=${malformedComplete.status} msg=${JSON.stringify(malformedComplete.msg)}`);

    /* ====================================================================== */
    /* 3. Role Authorization on Lesson Progress Endpoints                     */
    /* ====================================================================== */

    const dummyValidId = new mongoose.Types.ObjectId().toString();
    const teacherStart = await req("POST", `/enrollments/${dummyValidId}/lessons/${dummyValidId}/start`, { who: TEACHER });
    check("3a. teacher calling enrollment start returns 403", teacherStart.status === 403, `status=${teacherStart.status}`);

    const teacherComplete = await req("POST", `/enrollments/${dummyValidId}/lessons/${dummyValidId}/complete`, { who: TEACHER });
    check("3b. teacher calling enrollment complete returns 403", teacherComplete.status === 403, `status=${teacherComplete.status}`);

    /* ====================================================================== */
    /* 4. Cleanup & Database Baseline Verification                            */
    /* ====================================================================== */

    if (courseId) {
        await db.collection("courses").deleteOne({ _id: new mongoose.Types.ObjectId(courseId) });
    }

    const finalCourseCount = await db.collection("courses").countDocuments();
    check("4a. temp course purged and course count restored", finalCourseCount === initialCourseCount, `initial=${initialCourseCount} final=${finalCourseCount}`);

    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n=== ${passed}/${results.length} assertions passed, ${failed} failed ===`);

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
})();
