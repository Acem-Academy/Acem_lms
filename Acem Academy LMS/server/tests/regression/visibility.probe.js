/*
 * Regression suite: Student Curriculum Visibility.
 * Mutation-testing: creates an isolated temp curriculum tree, asserts that students
 * never see draft/archived items nor published children under unpublished parents,
 * then purges every temp record and restores DB counts to the pre-run baseline.
 * Requires a running API server; PROBE_BASE overrides the URL.
 * Run: npm run test:visibility   (or: node tests/regression/run.js visibility)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Course = require("../../src/models/course.model");
const SubCourse = require("../../src/models/subCourse.model");
const Chapter = require("../../src/models/chapter.model");
const Topic = require("../../src/models/topic.model");
const Lesson = require("../../src/models/lesson.model");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT_ENROLLED = "6a6afdd25da7a16903c74381"; // aman02
const STUDENT_UNENROLLED = "6a707973e4a774afc478ea9d"; // test@gmail.com

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tok = (id, role) => jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
const H = (id, role) => (id ? { Cookie: `accessToken=${tok(id, role)}` } : {});
const TEACHER_H = H(TEACHER, "teacher");
const ENROLLED_H = H(STUDENT_ENROLLED, "student");
const UNENROLLED_H = H(STUDENT_UNENROLLED, "student");

const req = async (method, path, { headers, json } = {}) => {
    const h = { ...headers };
    let body;
    if (json !== undefined) {
        h["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    }
    const res = await fetch(`${BASE}/api/v1${path}`, { method, headers: h, body });
    let parsed = null;
    try { parsed = await res.json(); } catch { /* none */ }
    return { status: res.status, data: parsed ? parsed.data : null, msg: parsed ? parsed.message : null };
};

const idOf = (d) => (d && (d._id ? d._id.toString() : null)) || null;
const idsOf = (list) => (Array.isArray(list) ? list.map((x) => idOf(x)) : []);
const includesId = (list, id) => idsOf(list).includes(id);
const excludesId = (list, id) => !idsOf(list).includes(id);

const COLLECTIONS = ["courses", "subcourses", "chapters", "topics", "lessons"];
const created = { courses: [], subcourses: [], chapters: [], topics: [], lessons: [], enrollments: [] };
const preexisting = {};

const purgeTempRecords = async (db) => {
    const summary = {};
    for (const coll of [...COLLECTIONS, "enrollments"]) {
        let deleted = 0;
        const ids = created[coll].filter(Boolean).map((x) => new mongoose.Types.ObjectId(x));
        if (ids.length) {
            const res = await db.collection(coll).deleteMany({ _id: { $in: ids } });
            deleted += res.deletedCount;
        }
        if (preexisting[coll]) {
            const pre = new Set(preexisting[coll]);
            const titleCollections = COLLECTIONS;
            if (titleCollections.includes(coll)) {
                const leftovers = await db.collection(coll).find({ title: /^CV / }, { projection: { _id: 1 } }).toArray();
                const toDelete = leftovers.filter((d) => !pre.has(d._id.toString())).map((d) => d._id);
                if (toDelete.length) {
                    const res2 = await db.collection(coll).deleteMany({ _id: { $in: toDelete } });
                    deleted += res2.deletedCount;
                }
            }
        }
        summary[coll] = deleted;
    }
    return summary;
};

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    for (const coll of [...COLLECTIONS, "enrollments"]) {
        const rows = await db.collection(coll).find({}, { projection: { _id: 1 } }).toArray();
        preexisting[coll] = rows.map((d) => d._id.toString());
    }
    const baseline = {};
    for (const coll of [...COLLECTIONS, "enrollments", "users"]) {
        baseline[coll] = await db.collection(coll).countDocuments();
    }

    const teacherObj = new mongoose.Types.ObjectId(TEACHER);
    const stamp = Date.now();
    const P = { PUBLISHED: "published", DRAFT: "draft" };

    /* ---- Fixtures: published chain, draft siblings, published-children-under-draft-parents ---- */
    const C1 = await Course.create({ title: "CV Course One", courseCode: `CV-${stamp}`, description: "Temporary course for student visibility verification.", teacher: teacherObj, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.courses.push(C1._id.toString());

    const C2 = await Course.create({ title: "CV Course Two", courseCode: `CV2-${stamp}`, description: "Temporary draft course for student visibility verification.", teacher: teacherObj, status: P.DRAFT, createdBy: teacherObj, updatedBy: teacherObj });
    created.courses.push(C2._id.toString());

    const S1 = await SubCourse.create({ title: "CV Sub One", course: C1._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.subcourses.push(S1._id.toString());
    const S2 = await SubCourse.create({ title: "CV Sub Two", course: C1._id, position: 2, status: P.DRAFT, createdBy: teacherObj, updatedBy: teacherObj });
    created.subcourses.push(S2._id.toString());
    const S3 = await SubCourse.create({ title: "CV Sub Three", course: C2._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.subcourses.push(S3._id.toString());

    const H1 = await Chapter.create({ title: "CV Chapter One", subCourse: S1._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.chapters.push(H1._id.toString());
    const H2 = await Chapter.create({ title: "CV Chapter Two", subCourse: S1._id, position: 2, status: P.DRAFT, createdBy: teacherObj, updatedBy: teacherObj });
    created.chapters.push(H2._id.toString());
    const H3 = await Chapter.create({ title: "CV Chapter Three", subCourse: S2._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.chapters.push(H3._id.toString());

    const T1 = await Topic.create({ title: "CV Topic One", chapter: H1._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.topics.push(T1._id.toString());
    const T2 = await Topic.create({ title: "CV Topic Two", chapter: H1._id, position: 2, status: P.DRAFT, createdBy: teacherObj, updatedBy: teacherObj });
    created.topics.push(T2._id.toString());
    const T3 = await Topic.create({ title: "CV Topic Three", chapter: H2._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.topics.push(T3._id.toString());

    const quiz = { enabled: true, title: "CV Quiz", description: "", passingScore: 50, maxAttempts: 3, questions: [{ question: "2 + 2 = ?", options: ["3", "4"], correctAnswer: 1, points: 1, explanation: "basic math" }] };
    const L1 = await Lesson.create({ title: "CV Lesson One", topic: T1._id, position: 1, status: P.PUBLISHED, content: "<p>secret cv content</p>", quiz, createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(L1._id.toString());
    const L2 = await Lesson.create({ title: "CV Lesson Two", topic: T1._id, position: 2, status: P.DRAFT, content: "<p>draft cv content</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(L2._id.toString());
    const L3 = await Lesson.create({ title: "CV Lesson Three", topic: T2._id, position: 1, status: P.PUBLISHED, content: "<p>cv under draft topic</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(L3._id.toString());
    const L4 = await Lesson.create({ title: "CV Lesson Four", topic: T3._id, position: 1, status: P.PUBLISHED, content: "<p>cv under draft chapter</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(L4._id.toString());

    const enr = await db.collection("enrollments").insertOne({
        student: new mongoose.Types.ObjectId(STUDENT_ENROLLED),
        course: C1._id,
        status: "active",
        progress: 0,
        completedLessons: [],
        lastAccessedLesson: null,
        enrolledAt: new Date(),
        completedAt: null,
        createdBy: teacherObj,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    created.enrollments.push(enr.insertedId.toString());

    const S1s = S1._id.toString(), S2s = S2._id.toString(), S3s = S3._id.toString();
    const H1s = H1._id.toString(), H2s = H2._id.toString(), H3s = H3._id.toString();
    const T1s = T1._id.toString(), T2s = T2._id.toString(), T3s = T3._id.toString();
    const L1s = L1._id.toString(), L2s = L2._id.toString(), L3s = L3._id.toString(), L4s = L4._id.toString();

    /* ---- A. Authorized (enrolled) student sees the published chain ---- */
    const subAll = await req("GET", "/sub-courses", { headers: ENROLLED_H });
    check("A1 enrolled GET /sub-courses: published chain visible", subAll.status === 200 && includesId(subAll.data, S1s) && excludesId(subAll.data, S2s) && excludesId(subAll.data, S3s), `status=${subAll.status} n=${idsOf(subAll.data).length}`);

    const chS1 = await req("GET", `/chapters?subCourse=${S1s}`, { headers: ENROLLED_H });
    check("A2 enrolled GET /chapters?subCourse: published chapter visible", chS1.status === 200 && includesId(chS1.data, H1s) && excludesId(chS1.data, H2s), `status=${chS1.status} n=${idsOf(chS1.data).length}`);

    const tpT1 = await req("GET", `/topics?chapter=${H1s}`, { headers: ENROLLED_H });
    check("A3 enrolled GET /topics?chapter: published topic visible", tpT1.status === 200 && includesId(tpT1.data, T1s) && excludesId(tpT1.data, T2s), `status=${tpT1.status} n=${idsOf(tpT1.data).length}`);

    const lsT1en = await req("GET", `/lessons?topic=${T1s}`, { headers: ENROLLED_H });
    const l1en = (lsT1en.data || []).find((x) => idOf(x) === L1s) || {};
    check("A4 enrolled GET /lessons?topic: published lesson visible w/ content, draft hidden", lsT1en.status === 200 && includesId(lsT1en.data, L1s) && excludesId(lsT1en.data, L2s) && "content" in l1en, `status=${lsT1en.status} n=${idsOf(lsT1en.data).length}`);

    /* ---- B. Draft chapter absent from the student sidebar ---- */
    check("B1 draft chapter absent (explicit)", excludesId(chS1.data, H2s), `chapters=${JSON.stringify(idsOf(chS1.data))}`);

    /* ---- C. Draft sub-courses / topics / lessons not exposed ---- */
    const tpAll = await req("GET", "/topics", { headers: ENROLLED_H });
    const lsAll = await req("GET", "/lessons", { headers: ENROLLED_H });
    check("C1 draft sub-course not exposed", excludesId(subAll.data, S2s), `subcourses=${JSON.stringify(idsOf(subAll.data))}`);
    check("C2 draft topic not exposed (scoped + global)", excludesId(tpT1.data, T2s) && excludesId(tpAll.data, T2s), `scoped=${idsOf(tpT1.data).length} global=${idsOf(tpAll.data).length}`);
    check("C3 draft lesson not exposed (scoped + global)", excludesId(lsT1en.data, L2s) && excludesId(lsAll.data, L2s), `scoped=${idsOf(lsT1en.data).length} global=${idsOf(lsAll.data).length}`);

    /* ---- D. Published child under an unpublished parent is never exposed ---- */
    check("D1 published sub-course under draft course not exposed", excludesId(subAll.data, S3s), `subcourses=${JSON.stringify(idsOf(subAll.data))}`);
    const chS2 = await req("GET", `/chapters?subCourse=${S2s}`, { headers: ENROLLED_H });
    check("D2 published chapter under draft sub-course not exposed", excludesId(chS2.data, H3s), `chapters=${JSON.stringify(idsOf(chS2.data))}`);
    const tpH2 = await req("GET", `/topics?chapter=${H2s}`, { headers: ENROLLED_H });
    check("D3 published topic under draft chapter not exposed", excludesId(tpH2.data, T3s), `topics=${JSON.stringify(idsOf(tpH2.data))}`);
    const lsT2 = await req("GET", `/lessons?topic=${T2s}`, { headers: ENROLLED_H });
    check("D4 published lesson under draft topic not exposed (scoped + global)", excludesId(lsT2.data, L3s) && excludesId(lsAll.data, L3s), `scoped=${idsOf(lsT2.data).length}`);
    const lsT3 = await req("GET", `/lessons?topic=${T3s}`, { headers: ENROLLED_H });
    check("D5 published lesson under draft chapter not exposed", excludesId(lsT3.data, L4s), `scoped=${idsOf(lsT3.data).length}`);

    /* ---- E. Direct lesson access cannot bypass publication checks ---- */
    const dL1 = await req("GET", `/lessons/${L1s}`, { headers: ENROLLED_H });
    check("E1 direct access to published in-context lesson => 200", dL1.status === 200, `status=${dL1.status}`);
    const dL2 = await req("GET", `/lessons/${L2s}`, { headers: ENROLLED_H });
    check("E2 direct access to draft lesson => 404", dL2.status === 404, `status=${dL2.status}`);
    const dL3 = await req("GET", `/lessons/${L3s}`, { headers: ENROLLED_H });
    check("E3 direct access to published-under-draft-topic lesson => 404", dL3.status === 404, `status=${dL3.status}`);
    const dL4 = await req("GET", `/lessons/${L4s}`, { headers: ENROLLED_H });
    check("E4 direct access to published-under-draft-chapter lesson => 404", dL4.status === 404, `status=${dL4.status}`);
    const qDraft = await req("POST", `/lessons/${L2s}/quiz/submit`, { headers: ENROLLED_H, json: { answers: [1] } });
    check("E5 quiz submit on draft lesson => 404", qDraft.status === 404, `status=${qDraft.status}`);
    const qPub = await req("POST", `/lessons/${L1s}/quiz/submit`, { headers: ENROLLED_H, json: { answers: [1] } });
    const qKeys = qPub.data ? Object.keys(qPub.data).sort().join(",") : "";
    check("E6 quiz submit on published lesson => 200, no answer-key leak", qPub.status === 200 && qKeys === "earnedPoints,passed,percentage,totalPoints", `status=${qPub.status} keys=${qKeys}`);

    /* ---- F. Teacher still sees and manages their own drafts ---- */
    const tSub = await req("GET", "/sub-courses", { headers: TEACHER_H });
    check("F1 teacher GET /sub-courses includes drafts", includesId(tSub.data, S1s) && includesId(tSub.data, S2s), `n=${idsOf(tSub.data).length}`);
    const tCh = await req("GET", `/chapters?subCourse=${S1s}`, { headers: TEACHER_H });
    check("F2 teacher GET /chapters includes drafts", includesId(tCh.data, H1s) && includesId(tCh.data, H2s), `n=${idsOf(tCh.data).length}`);
    const tTp = await req("GET", `/topics?chapter=${H1s}`, { headers: TEACHER_H });
    check("F3 teacher GET /topics includes drafts", includesId(tTp.data, T1s) && includesId(tTp.data, T2s), `n=${idsOf(tTp.data).length}`);
    const tLs = await req("GET", `/lessons?topic=${T1s}`, { headers: TEACHER_H });
    check("F4 teacher GET /lessons includes drafts", includesId(tLs.data, L1s) && includesId(tLs.data, L2s), `n=${idsOf(tLs.data).length}`);
    const tById = await req("GET", `/lessons/${L2s}`, { headers: TEACHER_H });
    check("F5 teacher direct access to own draft lesson => 200", tById.status === 200, `status=${tById.status}`);

    /* ---- G. Enrollment + authorization behavior intact ---- */
    const uLs = await req("GET", `/lessons?topic=${T1s}`, { headers: UNENROLLED_H });
    const uL1 = (uLs.data || []).find((x) => idOf(x) === L1s) || {};
    check("G1 unenrolled student sees published syllabus only (no content)", uLs.status === 200 && includesId(uLs.data, L1s) && !("content" in uL1) && excludesId(uLs.data, L2s), `status=${uLs.status} n=${idsOf(uLs.data).length}`);
    const uById = await req("GET", `/lessons/${L1s}`, { headers: UNENROLLED_H });
    check("G2 unenrolled direct access to published lesson => 403", uById.status === 403, `status=${uById.status}`);

    const subCourseService = require("../../src/services/subCourse.service");
    const lessonService = require("../../src/services/lesson.service");
    const fakeTeacher = { _id: new mongoose.Types.ObjectId(), role: "teacher" };
    const expect403 = async (name, fn) => {
        try { await fn(); check(name, false, "no error thrown"); }
        catch (e) { check(name, e.statusCode === 403, `statusCode=${e.statusCode} msg=${JSON.stringify(e.message)}`); }
    };
    await expect403("G3 cross-teacher getSubCourseById => 403", () => subCourseService.getSubCourseById(S1s, fakeTeacher));
    await expect403("G4 cross-teacher getLessonById => 403", () => lessonService.getLessonById(L1s, fakeTeacher));

    const studentCreate = await req("POST", "/sub-courses", { headers: ENROLLED_H, json: { course: C1._id.toString(), title: "CV Illegal Sub" } });
    check("G5 student cannot create curriculum => 403", studentCreate.status === 403, `status=${studentCreate.status}`);

    /* ---- H. Purge + restore baseline ---- */
    const purged = await purgeTempRecords(db);
    console.log(`PURGE ${JSON.stringify(purged)}`);
    const after = {};
    for (const coll of [...COLLECTIONS, "enrollments", "users"]) {
        after[coll] = await db.collection(coll).countDocuments();
    }
    const restored = Object.keys(baseline).every((k) => after[k] === baseline[k]);
    check("H1 DB counts restored to baseline", restored, `now=${JSON.stringify(after)} baseline=${JSON.stringify(baseline)}`);

    let strays = 0;
    for (const coll of COLLECTIONS) {
        strays += await db.collection(coll).countDocuments({ title: /^CV / });
    }
    check("H2 no stray CV records", strays === 0, `strays=${strays}`);

    await mongoose.disconnect();

    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n=== ${results.length - failed}/${results.length} assertions passed, ${failed} failed ===`);
    process.exit(failed === 0 ? 0 : 1);
})().catch(async (e) => {
    console.error("PROBE ERROR:", e && e.stack ? e.stack : e);
    try {
        let db = mongoose.connection.db;
        if (!db) {
            await mongoose.connect(process.env.MONGODB_URI);
            db = mongoose.connection.db;
        }
        if (db) {
            const purged = await purgeTempRecords(db);
            console.log(`EMERGENCY PURGE done: ${JSON.stringify(purged)}`);
            await mongoose.disconnect();
        }
    } catch (purgeErr) {
        console.error("PURGE FAILED:", purgeErr.message);
    }
    process.exit(2);
});
