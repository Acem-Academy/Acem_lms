/*
 * Regression suite: Student Learning Progress.
 * Mutation-testing: creates an isolated temp course + curriculum + enrollment,
 * drives the complete-lesson flow through the API, and asserts that:
 *   - progress never exceeds 100%
 *   - unpublishing a previously completed lesson does not block completion
 *   - historical completedLessons entries are preserved (never deleted)
 * Then purges every temp record and restores DB counts to the pre-run baseline.
 * Requires a running API server; PROBE_BASE overrides the URL.
 * Run: npm run test:learning   (or: node tests/regression/run.js learning)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Course = require("../../src/models/course.model");
const SubCourse = require("../../src/models/subCourse.model");
const Chapter = require("../../src/models/chapter.model");
const Topic = require("../../src/models/topic.model");
const Lesson = require("../../src/models/lesson.model");
const Enrollment = require("../../src/models/enrollment.model");

const enrollmentService = require("../../src/services/enrollment.service");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT = "6a707973e4a774afc478ea9d"; // test@gmail.com, no enrollments

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tok = (id, role) => jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
const H = (id, role) => (id ? { Cookie: `accessToken=${tok(id, role)}` } : {});
const STUDENT_H = H(STUDENT, "student");

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
            if (COLLECTIONS.includes(coll)) {
                const leftovers = await db.collection(coll).find({ title: /^LP / }, { projection: { _id: 1 } }).toArray();
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
    const studentObj = new mongoose.Types.ObjectId(STUDENT);
    const stamp = Date.now();
    const P = { PUBLISHED: "published", DRAFT: "draft" };

    /* ---- Helpers: build an isolated published curriculum + enrollment ---- */
    const makeCurriculum = async (label, lessonTitles) => {
        const course = await Course.create({ title: `LP ${label}`, courseCode: `LP-${label}-${stamp}`, description: "Temporary course for enrollment sync verification.", teacher: teacherObj, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
        created.courses.push(course._id.toString());
        const sub = await SubCourse.create({ title: `LP ${label} Sub`, course: course._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
        created.subcourses.push(sub._id.toString());
        const ch = await Chapter.create({ title: `LP ${label} Chapter`, subCourse: sub._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
        created.chapters.push(ch._id.toString());
        const tp = await Topic.create({ title: `LP ${label} Topic`, chapter: ch._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
        created.topics.push(tp._id.toString());
        const lessons = [];
        for (let i = 0; i < lessonTitles.length; i += 1) {
            const lesson = await Lesson.create({ title: lessonTitles[i], topic: tp._id, position: i + 1, status: P.PUBLISHED, content: `<p>${label} ${i + 1}</p>`, createdBy: teacherObj, updatedBy: teacherObj });
            created.lessons.push(lesson._id.toString());
            lessons.push(lesson);
        }
        return { course, lessons };
    };

    const makeEnrollment = async (courseId, overrides = {}) => {
        const inserted = await db.collection("enrollments").insertOne({
            student: studentObj,
            course: courseId,
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
            ...overrides,
        });
        created.enrollments.push(inserted.insertedId.toString());
        return inserted.insertedId;
    };

    /* ---- Fixtures: published course with 3 published lessons ---- */
    const C = await Course.create({ title: "LP Course", courseCode: `LP-${stamp}`, description: "Temporary course for learning progress verification.", teacher: teacherObj, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.courses.push(C._id.toString());
    const S = await SubCourse.create({ title: "LP Sub", course: C._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.subcourses.push(S._id.toString());
    const CH = await Chapter.create({ title: "LP Chapter", subCourse: S._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.chapters.push(CH._id.toString());
    const T = await Topic.create({ title: "LP Topic", chapter: CH._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.topics.push(T._id.toString());
    const L1 = await Lesson.create({ title: "LP Lesson One", topic: T._id, position: 1, status: P.PUBLISHED, content: "<p>lp one</p>", createdBy: teacherObj, updatedBy: teacherObj });
    const L2 = await Lesson.create({ title: "LP Lesson Two", topic: T._id, position: 2, status: P.PUBLISHED, content: "<p>lp two</p>", createdBy: teacherObj, updatedBy: teacherObj });
    const L3 = await Lesson.create({ title: "LP Lesson Three", topic: T._id, position: 3, status: P.PUBLISHED, content: "<p>lp three</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(L1._id.toString(), L2._id.toString(), L3._id.toString());

    const enr = await db.collection("enrollments").insertOne({
        student: studentObj,
        course: C._id,
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

    const enrollmentId = enr.insertedId.toString();
    const L1s = L1._id.toString(), L2s = L2._id.toString(), L3s = L3._id.toString();
    const inCompleted = (data, id) => Array.isArray(data?.completedLessons) && data.completedLessons.map(String).includes(id);

    const complete = (lessonId) => req("POST", `/enrollments/${enrollmentId}/lessons/${lessonId}/complete`, { headers: STUDENT_H });

    /* ---- A. Progress rises correctly across published lessons ---- */
    const c1 = await complete(L1s);
    check("A1 complete 1st of 3 lessons => 200, progress 33", c1.status === 200 && c1.data?.progress === 33, `status=${c1.status} progress=${c1.data?.progress}`);

    const c2 = await complete(L2s);
    check("A2 complete 2nd of 3 lessons => 200, progress 67, still active", c2.status === 200 && c2.data?.progress === 67 && c2.data?.status === "active", `status=${c2.status} progress=${c2.data?.progress} state=${c2.data?.status}`);

    /* ---- B. Unpublish a previously completed lesson (L1) ---- */
    await Lesson.findByIdAndUpdate(L1._id, { status: P.DRAFT });

    /*
     * Edge case: published set is now {L2, L3}. Historical completedLessons is
     * [L1, L2]. Completing L3 must NOT compute 3/2 = 150% (which overflowed the
     * progress max:100 validator and threw on save), and must complete the course.
     */
    const c3 = await complete(L3s);
    check("A3 complete final published lesson after unpublish => 200 (no overflow)", c3.status === 200, `status=${c3.status} msg=${JSON.stringify(c3.msg)}`);

    check("A4 progress never exceeds 100", c3.status === 200 && c3.data?.progress <= 100, `progress=${c3.data?.progress}`);
    check("A5 progress reaches exactly 100", c3.data?.progress === 100, `progress=${c3.data?.progress}`);
    check("A6 enrollment marked completed", c3.data?.status === "completed", `state=${c3.data?.status}`);
    check("A7 course completedAt set", !!c3.data?.completedAt, `completedAt=${c3.data?.completedAt}`);

    /* ---- C. Historical completed lessons preserved (never deleted) ---- */
    check("A8 historical completed lessons preserved", inCompleted(c3.data, L1s) && inCompleted(c3.data, L2s) && inCompleted(c3.data, L3s), `completed=${JSON.stringify(c3.data?.completedLessons)}`);

    /*
     * ---- B. A new published lesson added AFTER completion re-derives progress ----
     * Scenario: 1 published lesson -> student completes it (100%). A 2nd lesson is
     * then published. Progress must reflect the current curriculum (50%) and the
     * course must reopen; completing the 2nd lesson returns to 100%.
     */
    const CB = await Course.create({ title: "LP Course B", courseCode: `LPB-${stamp}`, description: "Temporary course for new-lesson progress verification.", teacher: teacherObj, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.courses.push(CB._id.toString());
    const SB = await SubCourse.create({ title: "LP Sub B", course: CB._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.subcourses.push(SB._id.toString());
    const CHB = await Chapter.create({ title: "LP Chapter B", subCourse: SB._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.chapters.push(CHB._id.toString());
    const TB = await Topic.create({ title: "LP Topic B", chapter: CHB._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.topics.push(TB._id.toString());
    const B1 = await Lesson.create({ title: "LP Lesson B1", topic: TB._id, position: 1, status: P.PUBLISHED, content: "<p>b1</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(B1._id.toString());

    const enrB = await db.collection("enrollments").insertOne({
        student: studentObj,
        course: CB._id,
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
    created.enrollments.push(enrB.insertedId.toString());
    const enrollmentBId = enrB.insertedId.toString();

    const completeB = (lessonId) => req("POST", `/enrollments/${enrollmentBId}/lessons/${lessonId}/complete`, { headers: STUDENT_H });

    const b1 = await completeB(B1._id.toString());
    check("B1 complete the only lesson => 100, completed", b1.status === 200 && b1.data?.progress === 100 && b1.data?.status === "completed", `status=${b1.status} progress=${b1.data?.progress} state=${b1.data?.status}`);

    /* Publish a second lesson AFTER the course was already completed. */
    const B2 = await Lesson.create({ title: "LP Lesson B2", topic: TB._id, position: 2, status: P.PUBLISHED, content: "<p>b2</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(B2._id.toString());

    /* Displayed + stored progress must drop to 50% when read. */
    const mine = await req("GET", "/enrollments/my-courses", { headers: STUDENT_H });
    const mineB = (mine.data || []).find((e) => String(e._id) === enrollmentBId);
    check("B2 my-courses reflects 50% after new lesson published", mine.status === 200 && mineB?.progress === 50, `status=${mine.status} progress=${mineB?.progress}`);
    check("B3 my-courses enrollment reopened to active", mineB?.status === "active", `state=${mineB?.status}`);

    const byId = await req("GET", `/enrollments/${enrollmentBId}`, { headers: STUDENT_H });
    check("B4 single enrollment reflects 50%", byId.status === 200 && byId.data?.progress === 50, `status=${byId.status} progress=${byId.data?.progress}`);

    const storedB = await db.collection("enrollments").findOne({ _id: enrB.insertedId });
    check("B5 stored progress persisted as 50", storedB?.progress === 50, `stored=${storedB?.progress}`);

    const b2c = await completeB(B2._id.toString());
    check("B6 complete the new lesson => 100, completed", b2c.status === 200 && b2c.data?.progress === 100 && b2c.data?.status === "completed", `status=${b2c.status} progress=${b2c.data?.progress} state=${b2c.data?.status}`);
    check("B7 both lessons preserved in history", inCompleted(b2c.data, B1._id.toString()) && inCompleted(b2c.data, B2._id.toString()), `completed=${JSON.stringify(b2c.data?.completedLessons)}`);

    /*
     * ---- C. Cancelled / suspended enrollments keep consistent metadata ----
     * A frozen (cancelled/suspended) enrollment must NOT have progress
     * re-derived: otherwise a row can end up with progress < 100 while its
     * completedAt is still set. The published curriculum grows here so a
     * naive re-derive would drop progress from 100 to 50.
     */
    const ccS = await makeCurriculum(`C-S-${stamp}`, ["LP C-S Lesson One", "LP C-S Lesson Two"]);
    const suspId = await makeEnrollment(ccS.course._id, { status: "suspended", progress: 100, completedLessons: [ccS.lessons[0]._id], completedAt: new Date() });
    const suspById = await req("GET", `/enrollments/${suspId}`, { headers: STUDENT_H });
    check("C1 suspended enrollment status unchanged", suspById.status === 200 && suspById.data?.status === "suspended", `status=${suspById.status} state=${suspById.data?.status}`);
    check("C2 suspended progress not re-derived (metadata stays consistent)", suspById.data?.progress === 100, `progress=${suspById.data?.progress}`);
    check("C3 suspended completedAt preserved", !!suspById.data?.completedAt, `completedAt=${suspById.data?.completedAt}`);
    const suspStored = await db.collection("enrollments").findOne({ _id: suspId });
    check("C4 suspended stored row untouched", suspStored?.progress === 100 && suspStored?.status === "suspended", `stored progress=${suspStored?.progress} state=${suspStored?.status}`);

    const ccC = await makeCurriculum(`C-C-${stamp}`, ["LP C-C Lesson One", "LP C-C Lesson Two"]);
    const cancId = await makeEnrollment(ccC.course._id, { status: "cancelled", progress: 100, completedLessons: [ccC.lessons[0]._id], completedAt: new Date() });
    const cancById = await req("GET", `/enrollments/${cancId}`, { headers: STUDENT_H });
    check("C5 cancelled enrollment status unchanged", cancById.status === 200 && cancById.data?.status === "cancelled", `status=${cancById.status} state=${cancById.data?.status}`);
    check("C6 cancelled progress not re-derived", cancById.data?.progress === 100, `progress=${cancById.data?.progress}`);

    /*
     * ---- D. Teacher view is not stale ----
     * A completed enrollment whose course later gained a lesson must show the
     * refreshed progress to the teacher, even if the student has not read
     * their own enrollment since.
     */
    const dc = await makeCurriculum(`D-${stamp}`, ["LP D Lesson One"]);
    const dEnrId = await makeEnrollment(dc.course._id, { status: "completed", progress: 100, completedLessons: [dc.lessons[0]._id], completedAt: new Date() });
    const dL2 = await Lesson.create({ title: "LP D Lesson Two", topic: dc.lessons[0].topic, position: 2, status: P.PUBLISHED, content: "<p>d2</p>", createdBy: teacherObj, updatedBy: teacherObj });
    created.lessons.push(dL2._id.toString());

    const ts = await req("GET", "/enrollments/teacher/students", { headers: H(TEACHER, "teacher") });
    const tsStudent = (ts.data || []).find((s) => String(s?.student?._id) === STUDENT);
    const tsCourse = tsStudent ? (tsStudent.courses || []).find((c) => String(c?.course?._id) === String(dc.course._id)) : null;
    check("D1 teacher view shows refreshed 50%", ts.status === 200 && tsCourse?.progress === 50, `status=${ts.status} progress=${tsCourse?.progress}`);
    check("D2 teacher view shows reopened active status", tsCourse?.status === "active", `state=${tsCourse?.status}`);
    const dStored = await db.collection("enrollments").findOne({ _id: dEnrId });
    check("D3 teacher sync persisted to DB", dStored?.progress === 50, `stored=${dStored?.progress}`);

    /*
     * ---- E. Read-sync persistence is concurrency-safe ----
     * A read that snapshots the enrollment, then writes after a concurrent
     * completion, must NOT clobber the newer write (lost update).
     */
    const ec = await makeCurriculum(`E-${stamp}`, ["LP E Lesson One"]);
    const eEnrId = await makeEnrollment(ec.course._id);
    const snapshot = await Enrollment.findById(eEnrId);
    const snapshotUpdatedAt = snapshot.updatedAt;

    await Enrollment.updateOne(
        { _id: eEnrId },
        { $set: { completedLessons: [ec.lessons[0]._id], progress: 100, status: "completed", completedAt: new Date(), updatedAt: new Date(snapshotUpdatedAt.getTime() + 60000) } },
        { timestamps: false }
    );

    snapshot.progress = 0;
    snapshot.status = "active";
    snapshot.completedAt = null;
    const applied = await enrollmentService.persistEnrollmentSync(snapshot, snapshotUpdatedAt);
    const afterRace = await db.collection("enrollments").findOne({ _id: eEnrId });
    check("E1 stale read-sync write skipped (no lost update)", applied === false && afterRace?.progress === 100 && afterRace?.status === "completed", `applied=${applied} stored=${afterRace?.progress}/${afterRace?.status}`);

    const fresh = await Enrollment.findById(eEnrId);
    const freshUpdatedAt = fresh.updatedAt;
    fresh.progress = 0;
    fresh.status = "active";
    fresh.completedAt = null;
    const appliedFresh = await enrollmentService.persistEnrollmentSync(fresh, freshUpdatedAt);
    const afterFresh = await db.collection("enrollments").findOne({ _id: eEnrId });
    check("E2 current read-sync write still applied", appliedFresh === true && afterFresh?.progress === 0, `applied=${appliedFresh} stored=${afterFresh?.progress}`);

    /*
     * ---- F. Re-enrolling a cancelled completed course restarts it ----
     * cancelEnrollment keeps completedLessons/progress, so re-enrollment must
     * explicitly reset the attempt; otherwise the carried-over completions
     * make the course instantly reopen at 100%.
     */
    const fc = await makeCurriculum(`F-${stamp}`, ["LP F Lesson One"]);
    const fEnr = await makeEnrollment(fc.course._id, { status: "cancelled", progress: 100, completedLessons: [fc.lessons[0]._id], completedAt: null });
    const reEnroll = await req("POST", "/enrollments", { headers: STUDENT_H, json: { course: String(fc.course._id) } });
    check("F1 re-enrolling a cancelled course => 201 active", reEnroll.status === 201 && reEnroll.data?.status === "active", `status=${reEnroll.status} state=${reEnroll.data?.status}`);
    check("F2 re-enrollment restarts at 0%", reEnroll.data?.progress === 0, `progress=${reEnroll.data?.progress}`);
    check("F3 previous attempt's completions cleared", Array.isArray(reEnroll.data?.completedLessons) && reEnroll.data.completedLessons.length === 0, `completed=${JSON.stringify(reEnroll.data?.completedLessons)}`);
    const reMine = await req("GET", "/enrollments/my-courses", { headers: STUDENT_H });
    const reMineF = (reMine.data || []).find((e) => String(e._id) === String(fEnr));
    check("F4 re-enrolled course does not reopen at 100% on read", reMineF?.progress === 0 && reMineF?.status === "active", `progress=${reMineF?.progress} state=${reMineF?.status}`);

    /* ---- Cleanup: purge + restore baseline ---- */
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
        strays += await db.collection(coll).countDocuments({ title: /^LP / });
    }
    check("H2 no stray LP records", strays === 0, `strays=${strays}`);

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
