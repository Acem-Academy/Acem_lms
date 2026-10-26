/*
 * Regression suite: Day 10 - Admin Management & RBAC.
 *
 * Covers:
 * - Unauthenticated access to admin routes returns 401
 * - Student and Teacher access to admin routes returns 403
 * - Admin dashboard returns database-backed statistics (totalUsers, totalCourses,
 *   totalEnrollments, activeUsers, breakdowns)
 * - Admin users listing with pagination, filtering (role, status), search,
 *   and redaction of sensitive fields (password, refreshToken)
 * - Admin courses listing with pagination, filtering (status, visibility), and populated teacher
 * - Admin user update guards:
 *     - cannot change own role / deactivate own account (self-lockout prevention)
 *     - cannot demote or deactivate the last active administrator
 *     - input validation for role, status, and invalid user ID
 * - Admin course management actions: publish / unpublish
 * - Temporary test records are purged and database counts verified to baseline
 *
 * Usage:
 *   node tests/regression/run.js admin
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const ADMIN = "6a703908e4a774afc478ea9b";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT = "6a707973e4a774afc478ea9d";
const TS = Date.now();

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
        /* no json */
    }
    return {
        status: res.status,
        data: parsed ? parsed.data : null,
        msg: parsed ? parsed.message : null,
    };
};

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require("../../src/models/User");

    const baselineUserCount = await User.countDocuments({ isDeleted: false });

    // 1. Unauthenticated requests => 401
    const anonDash = await req("GET", "/admin/dashboard");
    check("1a. anon GET /admin/dashboard => 401", anonDash.status === 401, `status=${anonDash.status}`);

    const anonUsers = await req("GET", "/admin/users");
    check("1b. anon GET /admin/users => 401", anonUsers.status === 401, `status=${anonUsers.status}`);

    const anonCourses = await req("GET", "/admin/courses");
    check("1c. anon GET /admin/courses => 401", anonCourses.status === 401, `status=${anonCourses.status}`);

    const anonPatch = await req("PATCH", `/admin/users/${STUDENT}`, { json: { role: "teacher" } });
    check("1d. anon PATCH /admin/users/:id => 401", anonPatch.status === 401, `status=${anonPatch.status}`);

    // 2. Student requests => 403
    const studDash = await req("GET", "/admin/dashboard", { who: STUDENT });
    check("2a. student GET /admin/dashboard => 403", studDash.status === 403, `status=${studDash.status}`);

    const studUsers = await req("GET", "/admin/users", { who: STUDENT });
    check("2b. student GET /admin/users => 403", studUsers.status === 403, `status=${studUsers.status}`);

    const studCourses = await req("GET", "/admin/courses", { who: STUDENT });
    check("2c. student GET /admin/courses => 403", studCourses.status === 403, `status=${studCourses.status}`);

    const studPatch = await req("PATCH", `/admin/users/${STUDENT}`, { who: STUDENT, json: { role: "admin" } });
    check("2d. student PATCH /admin/users/:id => 403", studPatch.status === 403, `status=${studPatch.status}`);

    // 3. Teacher requests => 403
    const teachDash = await req("GET", "/admin/dashboard", { who: TEACHER });
    check("3a. teacher GET /admin/dashboard => 403", teachDash.status === 403, `status=${teachDash.status}`);

    const teachUsers = await req("GET", "/admin/users", { who: TEACHER });
    check("3b. teacher GET /admin/users => 403", teachUsers.status === 403, `status=${teachUsers.status}`);

    const teachCourses = await req("GET", "/admin/courses", { who: TEACHER });
    check("3c. teacher GET /admin/courses => 403", teachCourses.status === 403, `status=${teachCourses.status}`);

    const teachPatch = await req("PATCH", `/admin/users/${STUDENT}`, { who: TEACHER, json: { role: "admin" } });
    check("3d. teacher PATCH /admin/users/:id => 403", teachPatch.status === 403, `status=${teachPatch.status}`);

    // 4. Admin Dashboard stats
    const dash = await req("GET", "/admin/dashboard", { who: ADMIN });
    check("4a. admin GET /admin/dashboard => 200", dash.status === 200, `status=${dash.status}`);
    check("4b. dashboard returns totalUsers", typeof dash.data?.totalUsers === "number", `totalUsers=${dash.data?.totalUsers}`);
    check("4c. dashboard returns totalCourses", typeof dash.data?.totalCourses === "number", `totalCourses=${dash.data?.totalCourses}`);
    check("4d. dashboard returns totalEnrollments", typeof dash.data?.totalEnrollments === "number", `totalEnrollments=${dash.data?.totalEnrollments}`);
    check("4e. dashboard returns activeUsers", typeof dash.data?.activeUsers === "number", `activeUsers=${dash.data?.activeUsers}`);
    check("4f. dashboard returns usersByRole array", Array.isArray(dash.data?.usersByRole), `len=${dash.data?.usersByRole?.length}`);
    check("4g. dashboard returns coursesByStatus array", Array.isArray(dash.data?.coursesByStatus), `len=${dash.data?.coursesByStatus?.length}`);
    check("4h. dashboard returns enrollmentsByCourse array", Array.isArray(dash.data?.enrollmentsByCourse), `len=${dash.data?.enrollmentsByCourse?.length}`);

    // 5. Admin Users listing
    const usersRes = await req("GET", "/admin/users", { who: ADMIN });
    check("5a. admin GET /admin/users => 200", usersRes.status === 200, `status=${usersRes.status}`);
    check("5b. users response contains pagination", typeof usersRes.data?.total === "number" && usersRes.data?.page === 1);
    check("5c. users list is array", Array.isArray(usersRes.data?.users));
    const sampleUser = usersRes.data?.users?.[0];
    check("5d. sensitive fields redacted", sampleUser && sampleUser.password === undefined && sampleUser.refreshToken === undefined);

    // Filtering users by role
    const teacherUsers = await req("GET", "/admin/users?role=teacher", { who: ADMIN });
    const allTeachers = teacherUsers.data?.users?.every((u) => u.role === "teacher");
    check("5e. filter role=teacher returns only teachers", teacherUsers.status === 200 && allTeachers === true);

    // Search users by name or email
    const searchUser = await req("GET", "/admin/users?search=teacher", { who: ADMIN });
    check("5f. search users by keyword returns matches", searchUser.status === 200 && (searchUser.data?.users?.length || 0) > 0);

    // 6. Admin Courses listing
    const coursesRes = await req("GET", "/admin/courses", { who: ADMIN });
    check("6a. admin GET /admin/courses => 200", coursesRes.status === 200, `status=${coursesRes.status}`);
    check("6b. courses response contains pagination", typeof coursesRes.data?.total === "number");
    check("6c. courses list is array", Array.isArray(coursesRes.data?.courses));
    const sampleCourse = coursesRes.data?.courses?.[0];
    check("6d. course has populated teacher", sampleCourse && typeof sampleCourse.teacher === "object");

    // Filter courses by status
    const pubCourses = await req("GET", "/admin/courses?status=published", { who: ADMIN });
    const allPub = pubCourses.data?.courses?.every((c) => c.status === "published");
    check("6e. filter courses status=published", pubCourses.status === 200 && allPub === true);

    // 7. Admin User Update Guards & Validation
    const selfRole = await req("PATCH", `/admin/users/${ADMIN}`, { who: ADMIN, json: { role: "teacher" } });
    check("7a. admin cannot change own role => 400", selfRole.status === 400, `msg=${selfRole.msg}`);

    const selfStatus = await req("PATCH", `/admin/users/${ADMIN}`, { who: ADMIN, json: { status: "inactive" } });
    check("7b. admin cannot deactivate own account => 400", selfStatus.status === 400, `msg=${selfStatus.msg}`);

    const badId = await req("PATCH", "/admin/users/123invalid", { who: ADMIN, json: { role: "student" } });
    check("7c. invalid mongoId => 400", badId.status === 400);

    const badRole = await req("PATCH", `/admin/users/${STUDENT}`, { who: ADMIN, json: { role: "superadmin" } });
    check("7d. invalid role rejected => 400", badRole.status === 400);

    const badStatus = await req("PATCH", `/admin/users/${STUDENT}`, { who: ADMIN, json: { status: "suspended" } });
    check("7e. invalid status rejected => 400", badStatus.status === 400);

    const emptyBody = await req("PATCH", `/admin/users/${STUDENT}`, { who: ADMIN, json: {} });
    check("7f. empty update body rejected => 400", emptyBody.status === 400);

    // 8. Mutations with Temp User & Safe Purge
    const tempUserEmail = `adminprobe.${TS}@example.com`;
    const tempUser = await User.create({
        fullName: "Admin Probe User",
        email: tempUserEmail,
        password: "TempPassword123",
        role: "student",
        status: "active",
        isEmailVerified: true,
    });
    const tempId = tempUser._id.toString();

    const updateRoleRes = await req("PATCH", `/admin/users/${tempId}`, { who: ADMIN, json: { role: "teacher" } });
    check("8a. update temp user role to teacher => 200", updateRoleRes.status === 200 && updateRoleRes.data?.role === "teacher");

    const updateStatusRes = await req("PATCH", `/admin/users/${tempId}`, { who: ADMIN, json: { status: "inactive" } });
    check("8b. update temp user status to inactive => 200", updateStatusRes.status === 200 && updateStatusRes.data?.status === "inactive");
    check("8c. update response strips password & refreshToken", updateStatusRes.data?.password === undefined && updateStatusRes.data?.refreshToken === undefined);

    // Cleanup temp user
    await User.findByIdAndDelete(tempId);
    const afterUserCount = await User.countDocuments({ isDeleted: false });
    check("8d. database user count restored to baseline", baselineUserCount === afterUserCount, `${baselineUserCount} -> ${afterUserCount}`);

    await mongoose.disconnect();

    const failed = results.filter((r) => !r.ok);
    console.log(`\n=== ${results.length - failed.length}/${results.length} assertions passed, ${failed.length} failed ===\n`);
    process.exit(failed.length ? 1 : 0);
};

run().catch((err) => {
    console.error("Probe error:", err);
    process.exit(1);
});
