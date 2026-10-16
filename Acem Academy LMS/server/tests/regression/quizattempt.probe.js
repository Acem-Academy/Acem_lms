/*
 * Regression suite: Day 7 - Quiz Attempt Persistence & maxAttempts (35 assertions).
 * Mutation-testing: creates an isolated temp curriculum tree, drives real quiz
 * submissions through the API, asserts attempt persistence, server-side scoring,
 * the unchanged response contract, attempt-limit enforcement (including under
 * concurrency), and authorization, then purges every temp record and restores
 * DB counts to the pre-run baseline.
 * Requires a running API server; PROBE_BASE overrides the URL.
 * Run: npm run test:quizattempt   (or: node tests/regression/run.js quizattempt)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Course = require("../../src/models/course.model");
const SubCourse = require("../../src/models/subCourse.model");
const Chapter = require("../../src/models/chapter.model");
const Topic = require("../../src/models/topic.model");
const Lesson = require("../../src/models/lesson.model");
const QuizAttempt = require("../../src/models/quizAttempt.model");

const BASE = process.env.PROBE_BASE || "http://localhost:4319";
const TEACHER = "6a71e1861ea02a2f75b9c7fd";
const STUDENT = "6a707973e4a774afc478ea9d"; // test@gmail.com - enrolled in the temp course
const OTHER = "6a6afdd25da7a16903c74381"; // aman02 - NOT enrolled in the temp course
const TAG = "QA7 ";

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const tok = (id) => jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
const H = (id) => (id ? { Cookie: `accessToken=${tok(id)}` } : {});
const STUDENT_H = H(STUDENT);
const OTHER_H = H(OTHER);

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

const oid = (x) => new mongoose.Types.ObjectId(x);

const countAttempts = (lessonId, studentId = STUDENT) =>
    QuizAttempt.countDocuments({ student: oid(studentId), lesson: oid(lessonId) });

const attemptsFor = (lessonId, studentId = STUDENT) =>
    QuizAttempt.find({ student: oid(studentId), lesson: oid(lessonId) }).sort({ attemptNumber: 1 }).lean();

const COLLECTIONS = ["courses", "subcourses", "chapters", "topics", "lessons"];
const created = { courses: [], subcourses: [], chapters: [], topics: [], lessons: [], enrollments: [] };
const preexisting = {};
const baseline = {};

const purgeTempRecords = async (db) => {
    const summary = {};

    /*
    | Quiz attempts recorded through the API for these temp lessons would be
    | orphaned once the lessons are removed. Delete attempts for tracked
    | lessons and for any leftover QA7-titled lessons before the lessons go.
    */
    const lessonIds = created.lessons.filter(Boolean).map(oid);
    const strayLessons = await db.collection("lessons")
        .find({ title: new RegExp(`^${TAG}`) }, { projection: { _id: 1 } })
        .toArray();
    const allLessonIds = [...lessonIds, ...strayLessons.map((d) => d._id)];
    if (allLessonIds.length) {
        const res = await db.collection("quizattempts").deleteMany({ lesson: { $in: allLessonIds } });
        summary.quizattempts = res.deletedCount;
    }

    for (const coll of [...COLLECTIONS, "enrollments"]) {
        let deleted = 0;
        const ids = created[coll].filter(Boolean).map(oid);
        if (ids.length) {
            const res = await db.collection(coll).deleteMany({ _id: { $in: ids } });
            deleted += res.deletedCount;
        }
        if (preexisting[coll] && COLLECTIONS.includes(coll)) {
            const pre = new Set(preexisting[coll]);
            const leftovers = await db.collection(coll)
                .find({ title: new RegExp(`^${TAG}`) }, { projection: { _id: 1 } })
                .toArray();
            const toDelete = leftovers.filter((d) => !pre.has(d._id.toString())).map((d) => d._id);
            if (toDelete.length) {
                const res2 = await db.collection(coll).deleteMany({ _id: { $in: toDelete } });
                deleted += res2.deletedCount;
            }
        }
        summary[coll] = deleted;
    }

    const courseIds = created.courses.filter(Boolean).map(oid);
    if (courseIds.length) {
        const res = await db.collection("enrollments").deleteMany({ course: { $in: courseIds } });
        if (res.deletedCount) summary.enrollments = (summary.enrollments || 0) + res.deletedCount;
    }

    return summary;
};

const Q = (correctAnswer, points = 1) => ({
    question: `${TAG}question`,
    options: ["A", "B", "C"],
    correctAnswer,
    points,
    explanation: `${TAG}secret explanation`,
});

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // The unique (student, lesson, attemptNumber) index is the concurrency guard.
    await QuizAttempt.createIndexes();

    for (const coll of [...COLLECTIONS, "enrollments"]) {
        const rows = await db.collection(coll).find({}, { projection: { _id: 1 } }).toArray();
        preexisting[coll] = rows.map((d) => d._id.toString());
    }
    for (const coll of [...COLLECTIONS, "enrollments", "users", "quizattempts"]) {
        baseline[coll] = await db.collection(coll).countDocuments();
    }

    const teacherObj = oid(TEACHER);
    const studentObj = oid(STUDENT);
    const stamp = Date.now();
    const P = { PUBLISHED: "published" };

    /* ---- Fixtures: published course tree ---- */
    const C = await Course.create({ title: `${TAG}Course`, courseCode: `QA7-${stamp}`, description: "Day 7 quiz attempt verification", teacher: teacherObj, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.courses.push(C._id.toString());
    const S = await SubCourse.create({ title: `${TAG}Sub`, course: C._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.subcourses.push(S._id.toString());
    const Hc = await Chapter.create({ title: `${TAG}Chapter`, subCourse: S._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.chapters.push(Hc._id.toString());
    const Tp = await Topic.create({ title: `${TAG}Topic`, chapter: Hc._id, position: 1, status: P.PUBLISHED, createdBy: teacherObj, updatedBy: teacherObj });
    created.topics.push(Tp._id.toString());

    const mkLesson = async (title, position, quiz) => {
        const l = await Lesson.create({ title, topic: Tp._id, position, status: P.PUBLISHED, content: `<p>${TAG}</p>`, quiz, createdBy: teacherObj, updatedBy: teacherObj });
        created.lessons.push(l._id.toString());
        return l;
    };

    const Lp = await mkLesson(`${TAG}Limit1`, 1, { enabled: true, title: "p", description: "", passingScore: 50, maxAttempts: 1, questions: [Q(1), Q(0)] });
    const Ll = await mkLesson(`${TAG}Limit2`, 2, { enabled: true, title: "l", description: "", passingScore: 50, maxAttempts: 2, questions: [Q(0)] });
    const Lc = await mkLesson(`${TAG}Concurrent`, 3, { enabled: true, title: "c", description: "", passingScore: 50, maxAttempts: 3, questions: [Q(0)] });
    const Ld = await mkLesson(`${TAG}Disabled`, 4, { enabled: false, title: "d", description: "", passingScore: 50, maxAttempts: 5, questions: [Q(0)] });
    const Lm = await mkLesson(`${TAG}MissingLimit`, 5, { enabled: true, title: "m", description: "", passingScore: 50, questions: [Q(0)] });

    /*
    | Legacy/bypass record: maxAttempts 0 is rejected by schema validation
    | (min: 1), so it can only exist via a raw write. It documents that the
    | service treats a non-positive limit as unlimited.
    */
    const rawLu = await db.collection("lessons").insertOne({
        title: `${TAG}Unlimited`, description: "", topic: Tp._id, position: 6, status: P.PUBLISHED,
        isDeleted: false, content: `<p>${TAG}</p>`,
        video: { type: "youtube", url: "", duration: 0, thumbnail: "" }, attachments: [],
        quiz: { enabled: true, title: "u", description: "", passingScore: 50, maxAttempts: 0, questions: [Q(0)] },
        createdBy: teacherObj, updatedBy: teacherObj, createdAt: new Date(), updatedAt: new Date(),
    });
    const Lu = rawLu.insertedId;
    created.lessons.push(Lu.toString());

    const enr = await db.collection("enrollments").insertOne({
        student: studentObj, course: C._id, status: "active", progress: 0,
        completedLessons: [], lastAccessedLesson: null, enrolledAt: new Date(), completedAt: null,
        createdBy: teacherObj, updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
    });
    created.enrollments.push(enr.insertedId.toString());
    const enrollmentId = enr.insertedId.toString();

    const P_ = Lp._id.toString(), L_ = Ll._id.toString(), C_ = Lc._id.toString();
    const D_ = Ld._id.toString(), M_ = Lm._id.toString(), U_ = Lu.toString();
    const submit = (lessonId, answers, headers = STUDENT_H) =>
        req("POST", `/lessons/${lessonId}/quiz/submit`, { headers, json: { answers } });

    /* ---- Phase 0: invalid submissions are rejected without creating attempts ---- */
    const dis = await submit(D_, [0]);
    check("0.1 disabled quiz => 400", dis.status === 400 && dis.msg === "This lesson does not have an active quiz.", `status=${dis.status} msg=${JSON.stringify(dis.msg)}`);
    check("0.2 no attempt recorded for disabled quiz", (await countAttempts(D_)) === 0, `count=${await countAttempts(D_)}`);

    const empty = await submit(P_, []);
    check("0.3 empty answers array => 400", empty.status === 400, `status=${empty.status} msg=${JSON.stringify(empty.msg)}`);

    const mismatch = await submit(P_, [0, 0, 0]);
    check("0.4 answers/question count mismatch => 400", mismatch.status === 400 && mismatch.msg === "Please answer every question before submitting.", `status=${mismatch.status} msg=${JSON.stringify(mismatch.msg)}`);
    check("0.5 invalid submits created no attempts", (await countAttempts(P_)) === 0, `count=${await countAttempts(P_)}`);

    /* ---- Phase 1: success persists the attempt + scoring + response contract ---- */
    const first = await submit(P_, [1, 1]); // Q0 correct=1 (correct), Q1 correct=0 (wrong) => 1/2
    const keys = first.data ? Object.keys(first.data).sort().join(",") : "";
    check("1.1 first student submit => 200", first.status === 200, `status=${first.status} msg=${JSON.stringify(first.msg)}`);
    check("1.2 response contract unchanged (no answer-key leak)", keys === "earnedPoints,passed,percentage,totalPoints", `keys=${keys}`);

    const r = first.data || {};
    check("1.3 server-side scoring correct (1/2 => 50%, passed)", r.earnedPoints === 1 && r.totalPoints === 2 && r.percentage === 50 && r.passed === true,
        `earned=${r.earnedPoints} total=${r.totalPoints} pct=${r.percentage} passed=${r.passed}`);

    check("1.4 exactly one attempt persisted", (await countAttempts(P_)) === 1, `count=${await countAttempts(P_)}`);

    const a1 = (await attemptsFor(P_))[0] || {};
    check("1.5 attempt number + student/lesson linkage correct",
        a1.attemptNumber === 1 && String(a1.student) === STUDENT && String(a1.lesson) === P_,
        `num=${a1.attemptNumber} student=${a1.student} lesson=${a1.lesson}`);

    check("1.6 attempt stores score/answers/timestamp",
        a1.earnedPoints === 1 && a1.totalPoints === 2 && a1.percentage === 50 && a1.passed === true &&
        Array.isArray(a1.answers) && a1.answers.length === 2 && a1.answers[0] === 1 && a1.answers[1] === 1 && a1.submittedAt instanceof Date,
        `answers=${JSON.stringify(a1.answers)} submittedAt=${a1.submittedAt}`);

    check("1.7 attempt links owning course + enrollment",
        String(a1.course) === C._id.toString() && String(a1.enrollment) === enrollmentId,
        `course=${a1.course} enrollment=${a1.enrollment}`);

    check("1.8 answer key / explanation never stored",
        !("correctAnswer" in a1) && !("explanation" in a1),
        `keys=${Object.keys(a1).join(",")}`);

    /* ---- Phase 2: maxAttempts = 1 blocks further submissions ---- */
    const blocked = await submit(P_, [1, 1]);
    check("2.1 second submit beyond maxAttempts=1 => 403", blocked.status === 403, `status=${blocked.status}`);
    check("2.2 rejection message references the attempt limit", /maximum number of attempts/i.test(blocked.msg || ""), `msg=${JSON.stringify(blocked.msg)}`);
    check("2.3 attempt count unchanged after rejection", (await countAttempts(P_)) === 1, `count=${await countAttempts(P_)}`);

    /* ---- Phase 3: maxAttempts = 2 allows up to the limit, then rejects ---- */
    const l1 = await submit(L_, [0]);
    const l2 = await submit(L_, [0]);
    const l3 = await submit(L_, [0]);
    check("3.1 attempt 1/2 => 200", l1.status === 200, `status=${l1.status}`);
    check("3.2 attempt 2/2 => 200", l2.status === 200, `status=${l2.status}`);
    check("3.3 attempt 3 beyond maxAttempts=2 => 403", l3.status === 403, `status=${l3.status}`);
    const lNums = (await attemptsFor(L_)).map((a) => a.attemptNumber);
    check("3.4 exactly 2 attempts numbered [1,2]", lNums.length === 2 && lNums[0] === 1 && lNums[1] === 2, `nums=${lNums.join(",")}`);

    /* ---- Phase 4: concurrent submissions cannot exceed maxAttempts = 3 ---- */
    const conc = await Promise.all(Array.from({ length: 8 }, () => submit(C_, [0])));
    const ok = conc.filter((x) => x.status === 200).length;
    const deny = conc.filter((x) => x.status === 403).length;
    const other = conc.filter((x) => x.status !== 200 && x.status !== 403).map((x) => x.status);
    check("4.1 concurrency: exactly 3 accepted", ok === 3, `ok=${ok}`);
    check("4.2 concurrency: remaining 5 rejected with 403", deny === 5, `deny=${deny}`);
    check("4.3 concurrency: no unexpected status codes", other.length === 0, `other=${JSON.stringify(other)}`);
    check("4.4 concurrency: exactly 3 attempts persisted", (await countAttempts(C_)) === 3, `count=${await countAttempts(C_)}`);
    const cNums = (await attemptsFor(C_)).map((a) => a.attemptNumber).sort((x, y) => x - y);
    check("4.5 concurrency: attempt numbers are unique [1,2,3]", cNums.join(",") === "1,2,3", `nums=${cNums.join(",")}`);

    /* ---- Phase 5: authentication / enrollment authorization ---- */
    const unauth = await req("POST", `/lessons/${M_}/quiz/submit`, { json: { answers: [0] } });
    check("5.1 unauthenticated submit => 401", unauth.status === 401, `status=${unauth.status}`);

    const unenrolled = await submit(M_, [0], OTHER_H);
    check("5.2 unenrolled student submit => 403", unenrolled.status === 403, `status=${unenrolled.status} msg=${JSON.stringify(unenrolled.msg)}`);

    let otherAttempts = 0;
    for (const id of [P_, L_, C_, D_, M_, U_]) otherAttempts += await countAttempts(id, OTHER);
    check("5.3 unauthorized submissions created no attempts", otherAttempts === 0, `otherAttempts=${otherAttempts}`);

    /* ---- Phase 6: missing / invalid limit semantics ---- */
    const m1 = await submit(M_, [0]);
    const m2 = await submit(M_, [0]);
    check("6.1 missing maxAttempts defaults to 1 (first => 200)", m1.status === 200, `status=${m1.status}`);
    check("6.2 missing maxAttempts still enforces the default 1 (second => 403)", m2.status === 403, `status=${m2.status} msg=${JSON.stringify(m2.msg)}`);

    let invalidRejected = false;
    try {
        await Lesson.create({ title: `${TAG}InvalidLimit`, topic: Tp._id, position: 7, status: P.PUBLISHED, content: `<p>${TAG}</p>`, quiz: { enabled: true, maxAttempts: 0, questions: [Q(0)] }, createdBy: teacherObj, updatedBy: teacherObj });
    } catch (e) {
        invalidRejected = e && e.name === "ValidationError";
    }
    check("6.3 schema rejects maxAttempts < 1 (ValidationError)", invalidRejected, `invalidRejected=${invalidRejected}`);

    const u1 = await submit(U_, [0]);
    const u2 = await submit(U_, [0]);
    const u3 = await submit(U_, [0]);
    check("6.4 legacy maxAttempts=0 (raw) treated as unlimited (3x 200)", u1.status === 200 && u2.status === 200 && u3.status === 200, `statuses=${[u1.status, u2.status, u3.status].join(",")}`);
    check("6.5 unlimited lesson persisted all 3 attempts", (await countAttempts(U_)) === 3, `count=${await countAttempts(U_)}`);

    /* ---- Phase 7: purge + restore baseline ---- */
    const purged = await purgeTempRecords(db);
    console.log(`PURGE ${JSON.stringify(purged)}`);
    const after = {};
    for (const coll of Object.keys(baseline)) {
        after[coll] = await db.collection(coll).countDocuments();
    }
    const restored = Object.keys(baseline).every((k) => after[k] === baseline[k]);
    check("7.1 DB counts restored to baseline", restored, `now=${JSON.stringify(after)} baseline=${JSON.stringify(baseline)}`);

    let strays = 0;
    for (const coll of COLLECTIONS) strays += await db.collection(coll).countDocuments({ title: new RegExp(`^${TAG}`) });
    check("7.2 no stray QA7 curriculum records", strays === 0, `strays=${strays}`);

    const existingLessonIds = (await db.collection("lessons").find({}, { projection: { _id: 1 } }).toArray()).map((d) => d._id);
    const orphans = await db.collection("quizattempts").countDocuments({ lesson: { $nin: existingLessonIds } });
    check("7.3 no orphan quiz attempts remain", orphans === 0, `orphans=${orphans}`);

    await mongoose.disconnect();

    const failed = results.filter((x) => !x.ok).length;
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
